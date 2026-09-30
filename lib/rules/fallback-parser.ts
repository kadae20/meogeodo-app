// Claude API 없이도 동작하는 간단 파서
import type {
  NormalizedLabelData,
  NutritionBasis,
  NutritionInfo,
} from "@/lib/types/food";
import { hasNutritionValues } from "@/lib/types/food";
import { detectCrossContact } from "./cross-contact";

function cleanToken(t: string): string {
  return t
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[0-9.,%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 원재료명 텍스트 → 원재료 배열 */
export function parseIngredients(raw: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,、·|/\n]+/)
    .map((t) => cleanToken(t))
    .filter((t) => t.length > 0 && t.length < 40)
    .filter(
      (t) => !/상품평|와우|무료배송|구매|판매자|옵션|도착|할인|절약/.test(t)
    );
}

const NUM = "([0-9]+(?:[.,][0-9]+)?)";

export const ORIGIN_TOKEN_RE =
  /국내산|(?<![가-힣])국산|외국산|수입산|한국산|중국산|미국산|호주산|베트남산|태국산|칠레산|브라질산|일본산|캐나다산|뉴질랜드산|스페인산|이탈리아산|네덜란드산|독일산|프랑스산|폴란드산|인도산|말레이시아산|인도네시아산|캘리포니아산/g;

export const ORIGIN_PLACEHOLDER_RE =
  /상품\s*상세\s*설명\s*참조|상세\s*(?:페이지|설명|정보)\s*참조/;

export const COMMERCE_NOISE_RE =
  /상품평|와우할인|무료배송|도착 보장|절약|구매했어요|다른 판매자|장바구니|별점|리뷰|[0-9]\s*원|할인/;

export function isUsefulOriginText(raw?: string): boolean {
  if (!raw?.trim()) return false;
  if (raw.length > 80 && COMMERCE_NOISE_RE.test(raw)) return false;
  return parseOrigins(raw).length > 0;
}

export function cleanOriginList(items: string[] | undefined | null): string[] {
  if (!items?.length) return [];
  return [...new Set(items.flatMap((item) => parseOrigins(item)))];
}

function extractNumber(raw: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = raw.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(",", "."));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function extractLabeled(
  raw: string,
  labels: string[],
  units: string[]
): number | null {
  for (const label of labels) {
    for (const unit of units) {
      const u = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const n = extractNumber(raw, [
        new RegExp(`${label}\\s*[:：]?\\s*${NUM}\\s*${u}\\s*미만`, "i"),
        new RegExp(`${label}\\s*[:：]?\\s*${NUM}\\s*${u}`, "i"),
        new RegExp(`${label}\\s*\\(\\s*${u}\\s*\\)\\s*[:：]?\\s*${NUM}\\s*미만`, "i"),
        new RegExp(`${label}\\s*\\(\\s*${u}\\s*\\)\\s*[:：]?\\s*${NUM}`, "i"),
      ]);
      if (n !== null) return n;
    }
  }
  return null;
}

/** 영양정보 텍스트에서 당류/나트륨/포화지방 숫자 추출 */
export function parseNutrition(raw: string): NutritionInfo {
  if (!raw?.trim()) return {};
  const nutrition: NutritionInfo = {};

  const sugars = extractLabeled(raw, ["당류"], ["g", "그램"]);
  if (sugars !== null) nutrition.sugars_g = sugars;

  const sodiumMg = extractLabeled(raw, ["나트륨"], ["mg", "㎎"]);
  if (sodiumMg !== null) {
    nutrition.sodium_mg = sodiumMg;
  } else {
    const sodiumG = extractLabeled(raw, ["나트륨"], ["g"]);
    if (sodiumG !== null && sodiumG <= 5) {
      nutrition.sodium_mg = Math.round(sodiumG * 1000);
    }
  }

  const satFat = extractLabeled(raw, ["포화지방산", "포화지방"], ["g", "그램"]);
  if (satFat !== null) nutrition.saturated_fat_g = satFat;

  const protein = extractNumber(raw, [
    new RegExp(`단백질\\s*[:：]?\\s*${NUM}\\s*g`, "i"),
  ]);
  if (protein !== null) nutrition.protein_g = protein;

  const calories = extractNumber(raw, [
    new RegExp(`${NUM}\\s*kcal`, "i"),
    new RegExp(`열량\\s*[:：]?\\s*${NUM}`, "i"),
  ]);
  if (calories !== null) nutrition.calories_kcal = calories;

  const servingG = extractNumber(raw, [
    new RegExp(`1회\\s*제공량\\s*[:：]?\\s*${NUM}\\s*g`, "i"),
    new RegExp(`1포\\s*[\\(（]\\s*${NUM}\\s*g`, "i"),
    new RegExp(`내용량\\s*[:：]?\\s*${NUM}\\s*g`, "i"),
  ]);
  if (servingG !== null) nutrition.serving_size_g = servingG;

  const has100 = /(?:100\s*(?:g|ml)\s*당|100g당|100ml당)/i.test(raw);
  const hasServing =
    /1회\s*제공|1회제공량|1봉지당|1개당|1포\s*당|1포\s*[\(（]|총\s*내용량/.test(
      raw
    );
  let basis: NutritionBasis = "unknown";
  if (hasServing) basis = "per_serving";
  else if (has100) basis = "per_100g";
  nutrition.basis = basis;

  return nutrition;
}

/** 원재료명 끝의 「우유, 대두 함유」 */
export function allergenLineFromIngredients(raw: string): string {
  const m = raw.match(/([가-힣A-Za-z·,\s]{1,40})\s*함유/);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

/** 원재료 괄호 안의 국내산 등 */
export function originsFromIngredients(raw: string): string[] {
  ORIGIN_TOKEN_RE.lastIndex = 0;
  const found = raw.match(ORIGIN_TOKEN_RE);
  return found ? [...new Set(found)] : [];
}
export function parseAllergens(raw: string): string[] {
  if (!raw?.trim()) return [];
  const cleaned = raw
    .replace(/함유|포함|이 들어있습니다|알레르기 유발물질\s*[:：]?/g, ",")
    .trim();
  return cleaned
    .split(/[,、·|/\n]+/)
    .map((t) => cleanToken(t))
    .filter((t) => t.length > 0 && t.length < 20);
}

/** 원산지 텍스트 → 원산지 배열 */
export function parseOrigins(raw: string): string[] {
  if (!raw?.trim()) return [];
  const noInfo =
    /정보\s*없음|표시\s*없음|없음/.test(raw.trim()) && raw.trim().length < 10;
  if (noInfo) return [];
  ORIGIN_TOKEN_RE.lastIndex = 0;
  const tokens = raw.match(ORIGIN_TOKEN_RE) ?? [];
  const labeled = [...raw.matchAll(/원산지(?:\s*및\s*원산지\s*표시)?\s*[:：]\s*([가-힣A-Za-z]{2,24})/g)]
    .map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter(
      (t) =>
        t.length >= 2 &&
        t.length < 24 &&
        !ORIGIN_PLACEHOLDER_RE.test(t) &&
        !COMMERCE_NOISE_RE.test(t) &&
        (/산$/.test(t) || /한국|국내|수입|외국/.test(t))
    );
  return [...new Set([...tokens, ...labeled])];
}

export interface RawLabelInput {
  raw_ingredients_text?: string;
  raw_nutrition_text?: string;
  raw_allergen_text?: string;
  raw_origin_text?: string;
}

/** fallback 전체 파싱 */
export function fallbackParse(input: RawLabelInput): NormalizedLabelData {
  const rawIngredients = input.raw_ingredients_text?.trim() ?? "";
  const rawNutrition = input.raw_nutrition_text?.trim() ?? "";
  const rawAllergen = input.raw_allergen_text?.trim() ?? "";
  const rawOrigin = input.raw_origin_text?.trim() ?? "";

  const ingredients = parseIngredients(rawIngredients);
  const nutrition = hasNutritionValues(parseNutrition(rawNutrition))
    ? parseNutrition(rawNutrition)
    : parseNutrition(`${rawNutrition}\n${rawIngredients}`);
  const containsLine = allergenLineFromIngredients(rawIngredients);
  const rawAllergenMerged = rawAllergen || containsLine;
  const allergens = parseAllergens(rawAllergenMerged);
  const origins = [
    ...parseOrigins(rawOrigin),
    ...originsFromIngredients(rawIngredients),
    ...originsFromIngredients(rawOrigin),
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  const cleanedOrigin =
    origins.length > 0
      ? origins.join(", ")
      : isUsefulOriginText(rawOrigin)
        ? rawOrigin.trim()
        : "";

  const label_quality = {
    has_ingredients: ingredients.length > 0,
    has_nutrition: hasNutritionValues(nutrition),
    has_allergen: allergens.length > 0,
    has_origin: origins.length > 0,
  };

  const filled = Object.values(label_quality).filter(Boolean).length;

  return {
    raw_ingredients_text: rawIngredients,
    raw_nutrition_text: rawNutrition,
    raw_allergen_text: rawAllergenMerged,
    raw_origin_text: cleanedOrigin,
    ingredients,
    allergens,
    origins,
    nutrition,
    label_quality,
    confidence_score: Math.round((filled / 4) * 0.6 * 100) / 100,
    parsed_by: "fallback",
    cross_contact: detectCrossContact(rawIngredients, rawAllergen),
  };
}
