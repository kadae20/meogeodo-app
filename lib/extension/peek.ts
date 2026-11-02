import type { SupabaseClient } from "@supabase/supabase-js";
import type { FamilyProfileRow, ProfileRuleRow } from "@/lib/types/database";
import type { InspectionStatus, NormalizedLabelData, ProductInput } from "@/lib/types/food";
import { hasComparableNutrition } from "@/lib/types/food";
import {
  extractListingFromHtml,
  harvestFromPageText,
} from "@/lib/products/listing-extract";
import { enrichFromPublicNutri } from "@/lib/products/public-nutri";
import { canonicalProductUrl, fallbackProductName } from "@/lib/products/identity";
import { resolveCachedProduct, labelToFields } from "@/lib/products/resolve";
import { mergeProductFields } from "@/lib/products/fill-from-source";
import { saveProductWithLabel } from "@/lib/products/save-product";
import { fallbackParse, parseIngredients } from "@/lib/rules/fallback-parser";
import { runRuleEngine } from "@/lib/rules/rule-engine";
import { ocrLabelWithClaude, ClaudeCallError } from "@/lib/ai/claude";
import {
  inferProductAudience,
  profileFitsAudience,
  audienceSkipLabel,
  type ProductAudience,
} from "@/lib/products/audience";

export type PeekDot = "green" | "yellow" | "red" | "gray";

export type PeekProfile = {
  id: string;
  name: string;
  profile_type: FamilyProfileRow["profile_type"];
  applicable: boolean;
  skip_reason?: string;
  status?: InspectionStatus;
  note?: string;
  dot: PeekDot | "skip";
};

export function statusDot(status: InspectionStatus): PeekDot {
  if (status === "내 기준 통과") return "green";
  if (status === "확인 필요") return "yellow";
  if (status === "내 기준과 충돌") return "red";
  return "gray";
}

function hasLabel(p: ProductInput): boolean {
  return !!(
    p.raw_ingredients_text?.trim() ||
    p.raw_nutrition_text?.trim() ||
    p.raw_allergen_text?.trim() ||
    p.raw_origin_text?.trim()
  );
}

function fillsGap(next: ProductInput, prev: ProductInput): boolean {
  const gain = (a?: string, b?: string) => !!(a?.trim() && !b?.trim());
  const nextN = fallbackParse(next).nutrition;
  const prevN = fallbackParse(prev).nutrition;
  const nutriGain =
    (nextN.sugars_g != null && prevN.sugars_g == null) ||
    (nextN.sodium_mg != null && prevN.sodium_mg == null) ||
    (nextN.saturated_fat_g != null && prevN.saturated_fat_g == null);
  return (
    gain(next.raw_ingredients_text, prev.raw_ingredients_text) ||
    gain(next.raw_nutrition_text, prev.raw_nutrition_text) ||
    nutriGain ||
    gain(next.raw_allergen_text, prev.raw_allergen_text) ||
    gain(next.raw_origin_text, prev.raw_origin_text)
  );
}

function runProfiles(
  label: NormalizedLabelData,
  profiles: FamilyProfileRow[],
  rules: ProfileRuleRow[],
  audience: ProductAudience
): PeekProfile[] {
  const byProfile = new Map<string, ProfileRuleRow[]>();
  for (const rule of rules) {
    const list = byProfile.get(rule.profile_id) ?? [];
    list.push(rule);
    byProfile.set(rule.profile_id, list);
  }
  return profiles.map((profile) => {
    if (!profileFitsAudience(profile.profile_type, audience)) {
      return {
        id: profile.id,
        name: profile.name,
        profile_type: profile.profile_type,
        applicable: false,
        skip_reason: audienceSkipLabel(profile.profile_type, audience),
        dot: "skip" as const,
      };
    }
    const result = runRuleEngine(label, byProfile.get(profile.id) ?? []);
    const noteHit =
      result.warningRules[0] || result.conflictRules[0] || result.missingInfo[0];
    return {
      id: profile.id,
      name: profile.name,
      profile_type: profile.profile_type,
      applicable: true,
      status: result.status,
      note: noteHit?.detail,
      dot: statusDot(result.status),
    };
  });
}

function hasRealIngredients(fields: ProductInput): boolean {
  const raw = fields.raw_ingredients_text ?? "";
  return parseIngredients(raw).length >= 2 || /향료|정제수|함유|농축/.test(raw);
}

function fieldsFromPage(url: string, title?: string, text?: string): ProductInput {
  const extracted = extractListingFromHtml(text || "", url);
  const harvested = harvestFromPageText(text || "");
  return {
    ...extracted,
    product_url: url,
    product_name:
      extracted.product_name ||
      title?.replace(/\s*[-|].*$/, "").trim() ||
      "",
    raw_ingredients_text:
      extracted.raw_ingredients_text || harvested.raw_ingredients_text,
    raw_nutrition_text:
      extracted.raw_nutrition_text || harvested.raw_nutrition_text,
    raw_allergen_text:
      extracted.raw_allergen_text || harvested.raw_allergen_text,
    raw_origin_text: extracted.raw_origin_text || harvested.raw_origin_text,
  };
}

async function persistLabel(
  supabase: SupabaseClient,
  fields: ProductInput
): Promise<void> {
  const named: ProductInput = {
    ...fields,
    product_name: fallbackProductName(fields) || fields.product_name,
  };
  if (!named.product_name.trim() || !hasLabel(named)) return;
  await saveProductWithLabel(supabase, named, fallbackParse(named));
}

export async function peekPage(
  supabase: SupabaseClient,
  input: {
    url: string;
    title?: string;
    text?: string;
    images?: { image_base64: string; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }[];
  }
): Promise<{
  product_name: string;
  missing: boolean;
  has_ingredients: boolean;
  has_nutrition: boolean;
  saved: boolean;
  audience?: ProductAudience;
  ocr_error?: string;
  profiles: PeekProfile[];
}> {
  const url = canonicalProductUrl(input.url) ?? input.url;
  const [profilesRes, rulesRes] = await Promise.all([
    supabase.from("family_profiles").select("*").order("created_at"),
    supabase.from("profile_rules").select("*").eq("enabled", true),
  ]);
  const profiles = (profilesRes.data ?? []) as FamilyProfileRow[];
  const rules = (rulesRes.data ?? []) as ProfileRuleRow[];

  const cached = await resolveCachedProduct(supabase, { product_url: url });
  const fromPage = fieldsFromPage(url, input.title, input.text);
  const pageLabel = fallbackParse(fromPage);
  let fields = fromPage;
  if (cached) {
    fields = mergeProductFields(
      labelToFields(cached.product, cached.label, url),
      fromPage
    );
  }

  const pageIncomplete =
    !hasRealIngredients(fromPage) ||
    !hasComparableNutrition(pageLabel.nutrition);
  let ocrError = "";
  if (input.images?.length && pageIncomplete) {
    for (const img of input.images.slice(0, 2)) {
      try {
        const ocr = await ocrLabelWithClaude({
          imageBase64: img.image_base64,
          mediaType: img.media_type,
        });
        if (!ocr) continue;
        fields = mergeProductFields(fields, ocr);
        const next = fallbackParse(fields);
        if (
          hasRealIngredients(fields) &&
          hasComparableNutrition(next.nutrition)
        ) {
          break;
        }
      } catch (err) {
        ocrError =
          err instanceof ClaudeCallError
            ? err.message
            : "성분표 사진을 읽지 못했습니다.";
        break;
      }
    }
  }

  if (!fields.raw_nutrition_text?.trim()) {
    fields = await enrichFromPublicNutri(fields);
  }

  let saved = false;
  if (hasLabel(fields)) {
    const shouldSave = !cached || fillsGap(fields, labelToFields(cached.product, cached.label, url));
    if (shouldSave) {
      try {
        await persistLabel(supabase, fields);
        saved = true;
      } catch {
        saved = false;
      }
    }
  }

  const audience = inferProductAudience({
    product_name: fields.product_name || input.title,
    category: fields.category,
    product_url: url,
    text: input.text,
  });

  if (!hasLabel(fields)) {
    return {
      product_name: fields.product_name,
      missing: true,
      has_ingredients: false,
      has_nutrition: false,
      saved: false,
      audience,
      ocr_error: ocrError || undefined,
      profiles: runProfiles(fallbackParse(fields), profiles, rules, audience),
    };
  }

  const label = fallbackParse(fields);
  // eslint-disable-next-line no-console
  console.log("[peek]", {
    images: input.images?.length ?? 0,
    sugars: label.nutrition.sugars_g ?? null,
    sodium: label.nutrition.sodium_mg ?? null,
    sat: label.nutrition.saturated_fat_g ?? null,
    ocr_error: ocrError || null,
  });
  return {
    product_name: fields.product_name,
    missing: false,
    has_ingredients: hasRealIngredients(fields),
    has_nutrition: hasComparableNutrition(label.nutrition),
    saved: saved || !!cached,
    audience,
    ocr_error: ocrError || undefined,
    profiles: runProfiles(label, profiles, rules, audience),
  };
}
