import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InspectionSummaryCards } from "@/components/inspections/InspectionSummary";
import { CartResultMatrix } from "@/components/inspections/CartResultMatrix";
import {
  ProductResultTable,
  type ProductResultView,
} from "@/components/inspections/ProductResultTable";
import { ShareInspectionButton } from "@/components/inspections/ShareInspectionButton";
import type {
  InspectionProductRow,
  InspectionResultRow,
  InspectionRow,
  FamilyProfileRow,
  NormalizedLabelRow,
  ProductRow,
  WhitelistItemRow,
  ProfileRuleRow,
} from "@/lib/types/database";
import type { InspectionSummary } from "@/lib/types/food";
import { formatDate } from "@/lib/utils";

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: inspectionData } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!inspectionData) notFound();
  const inspection = inspectionData as InspectionRow;

  const [ipRes, resultsRes, profilesRes, whitelistRes, rulesRes] =
    await Promise.all([
    supabase
      .from("inspection_products")
      .select("*")
      .eq("inspection_id", inspection.id)
      .order("created_at"),
    supabase
      .from("inspection_results")
      .select("*")
      .eq("inspection_id", inspection.id)
      .order("created_at"),
    supabase.from("family_profiles").select("*"),
    supabase.from("whitelist_items").select("profile_id, product_id, created_at"),
    supabase.from("profile_rules").select("profile_id, updated_at"),
  ]);

  const inspectionProducts = (ipRes.data ?? []) as InspectionProductRow[];
  const results = (resultsRes.data ?? []) as InspectionResultRow[];
  const profiles = (profilesRes.data ?? []) as FamilyProfileRow[];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const whitelist = (whitelistRes.data ?? []) as Pick<
    WhitelistItemRow,
    "profile_id" | "product_id" | "created_at"
  >[];
  const whitelistMap = new Map(
    whitelist.map((w) => [`${w.profile_id}:${w.product_id}`, w.created_at])
  );
  const latestRuleByProfile = new Map<string, string>();
  for (const rule of (rulesRes.data ?? []) as Pick<
    ProfileRuleRow,
    "profile_id" | "updated_at"
  >[]) {
    const prev = latestRuleByProfile.get(rule.profile_id);
    if (!prev || rule.updated_at > prev) {
      latestRuleByProfile.set(rule.profile_id, rule.updated_at);
    }
  }

  const productIds = inspectionProducts
    .map((ip) => ip.product_id)
    .filter((id): id is string => !!id);
  const labelIds = inspectionProducts
    .map((ip) => ip.normalized_label_id)
    .filter((id): id is string => !!id);

  const [productsRes, labelsRes] = await Promise.all([
    productIds.length > 0
      ? supabase.from("products").select("*").in("id", productIds)
      : Promise.resolve({ data: [] }),
    labelIds.length > 0
      ? supabase.from("normalized_labels").select("*").in("id", labelIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productMap = new Map(
    ((productsRes.data ?? []) as ProductRow[]).map((p) => [p.id, p])
  );
  const labelMap = new Map(
    ((labelsRes.data ?? []) as NormalizedLabelRow[]).map((l) => [l.id, l])
  );

  const profileCount = new Set(results.map((r) => r.profile_id)).size;

  const views: ProductResultView[] = inspectionProducts.map((ip) => {
    const product = ip.product_id ? productMap.get(ip.product_id) : undefined;
    const label = ip.normalized_label_id
      ? labelMap.get(ip.normalized_label_id)
      : undefined;
    const productResults = results.filter(
      (r) => r.inspection_product_id === ip.id
    );

    const ingredients = (label?.ingredients_json ?? []) as string[];
    const ingredientsSummary =
      ingredients.length > 0
        ? ingredients.slice(0, 8).join(", ") +
          (ingredients.length > 8 ? ` 외 ${ingredients.length - 8}개` : "")
        : label?.raw_ingredients_text
          ? label.raw_ingredients_text.slice(0, 80)
          : "";

    return {
      productId: ip.product_id,
      productName: product?.product_name ?? "이름 없는 상품",
      productUrl: product?.product_url ?? null,
      brandName: product?.brand_name ?? null,
      category: product?.category ?? null,
      ingredientsSummary,
      results: productResults.map((r) => {
        const profile = r.profile_id ? profileMap.get(r.profile_id) : undefined;
        const wlKey =
          r.profile_id && ip.product_id
            ? `${r.profile_id}:${ip.product_id}`
            : null;
        const wlAt = wlKey ? whitelistMap.get(wlKey) : undefined;
        const whitelisted = !!wlAt;
        const rulesUpdated = r.profile_id
          ? latestRuleByProfile.get(r.profile_id)
          : undefined;
        const rulesChangedAfterSave =
          !!wlAt && !!rulesUpdated && rulesUpdated > wlAt;
        const whitelistRecheck =
          whitelisted &&
          (r.status === "내 기준과 충돌" ||
            r.status === "정보 부족" ||
            (rulesChangedAfterSave && r.status !== "내 기준 통과"));
        return {
          id: r.id,
          profileId: r.profile_id,
          profileName: profile?.name ?? "삭제된 프로필",
          profileType: profile?.profile_type ?? null,
          status: r.status,
          explanation: r.explanation,
          matched: r.matched_rules_json ?? [],
          warnings: r.warning_rules_json ?? [],
          conflicts: r.conflict_rules_json ?? [],
          missing: r.missing_info_json ?? [],
          confidenceScore: r.confidence_score,
          whitelisted,
          whitelistRecheck,
        };
      }),
    };
  });

  const summary = inspection.summary_json as Partial<InspectionSummary>;

  return (
    <div className="space-y-5">
      <Link
        href="/app/inspections"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> 검수 히스토리
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {inspection.title || "제목 없는 검수"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(inspection.created_at)} · 상품 {inspection.total_products}
            개 · 프로필 {profileCount}개 ·{" "}
            {inspection.inspection_type === "cart_manual"
              ? "장바구니 검수"
              : "단일 상품 검수"}
          </p>
        </div>
        <ShareInspectionButton inspectionId={inspection.id} />
      </div>

      <InspectionSummaryCards summary={summary} />

      <CartResultMatrix products={views} />

      <div className="space-y-4">
        {views.map((view, i) => (
          <ProductResultTable
            key={i}
            product={view}
            anchorId={`product-${i}`}
          />
        ))}
      </div>

      <p className="text-xs text-slate-400">
        검수 결과는 회원님이 저장한 가족별 기준과 상품 표시 정보를 비교한
        것입니다. 의학적·수의학적 판단이 아니며, 최종 확인은 상품 표시사항을
        직접 확인해주세요.
      </p>
    </div>
  );
}
