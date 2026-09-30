import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeLabel } from "@/lib/products/normalize";
import { saveProductWithLabel } from "@/lib/products/save-product";
import { fallbackProductName } from "@/lib/products/identity";
import { runRuleEngine } from "@/lib/rules/rule-engine";
import { generateExplanationWithClaude } from "@/lib/ai/claude";
import {
  inferProductAudience,
  profileFitsAudience,
} from "@/lib/products/audience";
import {
  PROFILE_TYPE_LABELS,
  type InspectionStatus,
  type InspectionSummary,
} from "@/lib/types/food";
import type { FamilyProfileRow, ProfileRuleRow } from "@/lib/types/database";

export const maxDuration = 60;

const productSchema = z.object({
  product_url: z.string().optional(),
  product_name: z.string().optional(),
  brand_name: z.string().optional(),
  category: z.string().optional(),
  barcode: z.string().optional(),
  raw_ingredients_text: z.string().optional(),
  raw_nutrition_text: z.string().optional(),
  raw_allergen_text: z.string().optional(),
  raw_origin_text: z.string().optional(),
});

const bodySchema = z.object({
  inspection_type: z.enum(["single_product", "cart_manual"]),
  title: z.string().optional(),
  profile_ids: z.array(z.string().uuid()).min(1, "검수할 프로필을 선택해주세요."),
  include_mismatched: z.boolean().optional(),
  products: z.array(productSchema).min(1).max(20),
});

function defaultExplanation(
  profileName: string,
  status: InspectionStatus,
  seed: string
): string {
  const shortSeed = seed.length > 220 ? `${seed.slice(0, 220)}…` : seed;
  switch (status) {
    case "내 기준과 충돌":
      return `${profileName}의 저장된 기준과 충돌하는 항목이 있습니다. ${shortSeed}`;
    case "정보 부족":
      return `${profileName}의 기준을 확인하기 위한 상품 정보가 부족합니다. ${shortSeed}`;
    case "확인 필요":
      return `${profileName}의 기준과 직접 충돌하지는 않지만, 직접 확인하기로 한 항목이 있습니다. ${shortSeed}`;
    default:
      return `${profileName}의 저장된 기준과 비교한 결과, 충돌·확인 필요·정보 부족에 해당하는 항목이 없습니다.`;
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // 1. 선택된 프로필 + 기준 로드 (RLS로 본인 것만)
  const [profilesRes, rulesRes] = await Promise.all([
    supabase
      .from("family_profiles")
      .select("*")
      .in("id", body.profile_ids),
    supabase
      .from("profile_rules")
      .select("*")
      .in("profile_id", body.profile_ids)
      .eq("enabled", true),
  ]);

  const profiles = (profilesRes.data ?? []) as FamilyProfileRow[];
  if (profiles.length === 0) {
    return NextResponse.json(
      { error: "선택한 가족 프로필을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const audience = inferProductAudience({
    product_name: body.products[0]?.product_name,
    category: body.products[0]?.category,
    product_url: body.products[0]?.product_url,
    text: [
      body.products[0]?.raw_ingredients_text,
      body.products[0]?.raw_nutrition_text,
    ].join(" "),
  });
  const scoped = body.include_mismatched
    ? profiles
    : profiles.filter((p) => profileFitsAudience(p.profile_type, audience));
  if (scoped.length === 0) {
    return NextResponse.json(
      {
        error:
          "이 상품은 지금 선택된 가족과 대상이 다릅니다. 사람 식품이면 사람 프로필을, 사료면 반려동물 프로필을 선택해 주세요.",
      },
      { status: 400 }
    );
  }
  const usedProfiles = scoped;
  const allRules = (rulesRes.data ?? []) as ProfileRuleRow[];
  const rulesByProfile = new Map<string, ProfileRuleRow[]>();
  for (const rule of allRules) {
    const list = rulesByProfile.get(rule.profile_id) ?? [];
    list.push(rule);
    rulesByProfile.set(rule.profile_id, list);
  }

  const products = body.products.map((p) => {
    const product_name = fallbackProductName(p);
    return { ...p, product_name };
  });
  if (products.some((p) => !p.product_name)) {
    return NextResponse.json(
      { error: "상품 URL, 바코드, 또는 상품명이 필요합니다." },
      { status: 400 }
    );
  }

  // 2. inspection 생성
  const title =
    body.title?.trim() ||
    (body.inspection_type === "single_product"
      ? `${products[0].product_name} 검수`
      : `장바구니 검수 (${products.length}개 상품)`);

  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .insert({
      user_id: user.id,
      inspection_type: body.inspection_type,
      title,
      total_products: products.length,
    })
    .select("id")
    .single();

  if (inspectionError || !inspection) {
    return NextResponse.json(
      { error: `검수 생성 실패: ${inspectionError?.message}` },
      { status: 500 }
    );
  }

  const summary: InspectionSummary = {
    pass: 0,
    check_needed: 0,
    conflict: 0,
    insufficient: 0,
  };

  try {
    // 3. 상품별 처리
    for (const productInput of products) {
      const label = await normalizeLabel(productInput);
      const { productId, labelId } = await saveProductWithLabel(
        supabase,
        productInput,
        label
      );

      const { data: inspectionProduct, error: ipError } = await supabase
        .from("inspection_products")
        .insert({
          inspection_id: inspection.id,
          product_id: productId,
          normalized_label_id: labelId,
        })
        .select("id")
        .single();
      if (ipError || !inspectionProduct) {
        throw new Error(`검수 상품 저장 실패: ${ipError?.message}`);
      }

      // 4. 프로필별 Rule Engine 실행 → 결과 저장
      const engineResults = usedProfiles.map((profile) => ({
        profile,
        result: runRuleEngine(label, rulesByProfile.get(profile.id) ?? []),
      }));

      // 설명은 Claude로 병렬 생성 (실패 시 기본 설명)
      const explanations = await Promise.all(
        engineResults.map(async ({ profile, result }) => {
          const ai = await generateExplanationWithClaude({
            productName: productInput.product_name,
            profileName: profile.name,
            profileTypeLabel: PROFILE_TYPE_LABELS[profile.profile_type],
            status: result.status,
            explanationSeed: result.explanationSeed,
          });
          return (
            ai ?? defaultExplanation(profile.name, result.status, result.explanationSeed)
          );
        })
      );

      const rows = engineResults.map(({ profile, result }, i) => {
        if (result.status === "내 기준 통과") summary.pass += 1;
        else if (result.status === "확인 필요") summary.check_needed += 1;
        else if (result.status === "내 기준과 충돌") summary.conflict += 1;
        else summary.insufficient += 1;

        return {
          inspection_id: inspection.id,
          inspection_product_id: inspectionProduct.id,
          user_id: user.id,
          product_id: productId,
          profile_id: profile.id,
          status: result.status,
          matched_rules_json: result.matchedRules,
          warning_rules_json: result.warningRules,
          conflict_rules_json: result.conflictRules,
          missing_info_json: result.missingInfo,
          explanation: explanations[i],
          confidence_score: result.confidenceScore,
        };
      });

      const { error: resultsError } = await supabase
        .from("inspection_results")
        .insert(rows);
      if (resultsError) {
        throw new Error(`검수 결과 저장 실패: ${resultsError.message}`);
      }
    }

    // 5. summary 업데이트
    await supabase
      .from("inspections")
      .update({ summary_json: summary })
      .eq("id", inspection.id);

    return NextResponse.json({ inspection_id: inspection.id, summary });
  } catch (err) {
    // 부분 실패 시 생성한 inspection 정리
    await supabase.from("inspections").delete().eq("id", inspection.id);
    const message =
      err instanceof Error ? err.message : "검수 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
