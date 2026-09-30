// 표시 텍스트 정규화 오케스트레이터: Claude 우선, 실패 시 fallback parser
import { fallbackParse, type RawLabelInput } from "@/lib/rules/fallback-parser";
import { normalizeLabelWithClaude } from "@/lib/ai/claude";
import type { NormalizedLabelData, NutritionInfo } from "@/lib/types/food";
import { hasNutritionValues } from "@/lib/types/food";

export async function normalizeLabel(
  input: RawLabelInput
): Promise<NormalizedLabelData> {
  const fallback = fallbackParse(input);

  const hasAnyText =
    !!fallback.raw_ingredients_text ||
    !!fallback.raw_nutrition_text ||
    !!fallback.raw_allergen_text ||
    !!fallback.raw_origin_text;
  if (!hasAnyText) return fallback;

  const claude = await normalizeLabelWithClaude(input);
  if (!claude) return fallback;

  // Claude 결과와 fallback을 병합 (Claude 우선, 비어 있으면 fallback 유지)
  const ingredients =
    claude.ingredients.length > 0 ? claude.ingredients : fallback.ingredients;
  const allergens =
    claude.allergens.length > 0 ? claude.allergens : fallback.allergens;
  const origins = claude.origins.length > 0 ? claude.origins : fallback.origins;
  const nutrition: NutritionInfo = { ...fallback.nutrition };
  for (const [key, val] of Object.entries(claude.nutrition)) {
    if (val != null) {
      (nutrition as Record<string, unknown>)[key] = val;
    }
  }

  return {
    ...fallback,
    ingredients,
    allergens,
    origins,
    nutrition,
    label_quality: {
      has_ingredients: ingredients.length > 0,
      has_nutrition: hasNutritionValues(nutrition),
      has_allergen: allergens.length > 0 || !!fallback.raw_allergen_text,
      has_origin: origins.length > 0,
    },
    confidence_score: claude.confidence,
    parsed_by: "claude",
    cross_contact: fallback.cross_contact,
  };
}
