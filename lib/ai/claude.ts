// Claude API 헬퍼 — 서버 전용. 실패 시 null을 반환하고 호출부가 fallback을 사용한다.
import Anthropic from "@anthropic-ai/sdk";
import type { NutritionInfo } from "@/lib/types/food";
import {
  NORMALIZE_LABEL_SYSTEM,
  normalizeLabelUserPrompt,
  EXPLANATION_SYSTEM,
  explanationUserPrompt,
  OCR_LABEL_SYSTEM,
  LISTING_PAGE_SYSTEM,
} from "./prompts";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export class ClaudeCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeCallError";
  }
}

function mapClaudeError(err: unknown): string | null {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const nested =
    err && typeof err === "object" && "error" in err
      ? JSON.stringify((err as { error: unknown }).error)
      : "";
  const text = `${raw} ${nested}`;
  if (/credit balance is too low/i.test(text)) {
    return "Claude API 크레딧이 부족합니다. Anthropic Console → Plans & Billing에서 충전한 뒤 다시 시도하거나, 원재료 텍스트를 붙여넣으세요.";
  }
  if (/invalid.?api.?key|authentication_error|invalid x-api-key/i.test(text)) {
    return "Claude API 키가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인하세요.";
  }
  if (/rate.?limit|overloaded/i.test(text)) {
    return "Claude API가 잠시 혼잡합니다. 잠시 후 다시 시도하세요.";
  }
  return null;
}

export interface ClaudeNormalizedResult {
  ingredients: string[];
  allergens: string[];
  origins: string[];
  nutrition: NutritionInfo;
  confidence: number;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 표시 텍스트 구조화. 실패/미설정 시 null. */
export async function normalizeLabelWithClaude(input: {
  raw_ingredients_text?: string;
  raw_nutrition_text?: string;
  raw_allergen_text?: string;
  raw_origin_text?: string;
}): Promise<ClaudeNormalizedResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: NORMALIZE_LABEL_SYSTEM,
      messages: [{ role: "user", content: normalizeLabelUserPrompt(input) }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const nutritionRaw = (parsed.nutrition ?? {}) as Record<string, unknown>;
    const nutrition: NutritionInfo = {};
    for (const key of [
      "sugars_g",
      "sodium_mg",
      "saturated_fat_g",
      "protein_g",
      "calories_kcal",
    ] as const) {
      const n = asNumberOrNull(nutritionRaw[key]);
      if (n !== null) nutrition[key] = n;
    }
    const serving = asNumberOrNull(nutritionRaw.serving_size_g);
    if (serving !== null) nutrition.serving_size_g = serving;
    const basisRaw = nutritionRaw.basis;
    if (
      basisRaw === "per_serving" ||
      basisRaw === "per_100g" ||
      basisRaw === "unknown"
    ) {
      nutrition.basis = basisRaw;
    }

    const confidence = asNumberOrNull(parsed.confidence);

    return {
      ingredients: asStringArray(parsed.ingredients),
      allergens: asStringArray(parsed.allergens),
      origins: asStringArray(parsed.origins),
      nutrition,
      confidence: confidence === null ? 0.7 : Math.max(0, Math.min(1, confidence)),
    };
  } catch (err) {
    console.error("[claude] normalizeLabel failed:", err);
    return null;
  }
}

/** Rule Engine 결과 기반 설명 생성. 실패/미설정 시 null → seed 기반 기본 설명 사용. */
export async function generateExplanationWithClaude(input: {
  productName: string;
  profileName: string;
  profileTypeLabel: string;
  status: string;
  explanationSeed: string;
}): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: EXPLANATION_SYSTEM,
      messages: [{ role: "user", content: explanationUserPrompt(input) }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  } catch (err) {
    console.error("[claude] generateExplanation failed:", err);
    return null;
  }
}

export interface OcrLabelResult {
  product_name: string;
  brand_name: string;
  category: string;
  raw_ingredients_text: string;
  raw_nutrition_text: string;
  raw_allergen_text: string;
  raw_origin_text: string;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function fieldsFromJson(text: string): OcrLabelResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return {
      product_name: asString(parsed.product_name),
      brand_name: asString(parsed.brand_name),
      category: asString(parsed.category),
      raw_ingredients_text: asString(parsed.raw_ingredients_text),
      raw_nutrition_text: asString(parsed.raw_nutrition_text),
      raw_allergen_text: asString(parsed.raw_allergen_text),
      raw_origin_text: asString(parsed.raw_origin_text),
    };
  } catch {
    return null;
  }
}

/** 상품 페이지 텍스트에서 표시 필드 추출. 실패/미설정 시 null. */
export async function extractListingWithClaude(
  pageText: string
): Promise<OcrLabelResult | null> {
  const client = getClient();
  const trimmed = pageText.replace(/\s+/g, " ").trim();
  if (!client || trimmed.length < 40) return null;

  const needle = /원재료명|원재료|영양정보|영양성분|알레르기|원산지/;
  const idx = trimmed.search(needle);
  const snippet =
    idx >= 0
      ? trimmed.slice(Math.max(0, idx - 400), idx + 7000)
      : trimmed.slice(0, 8000);

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: LISTING_PAGE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `다음 상품 페이지 텍스트에서 표시사항을 추출하세요.\n\n${snippet}`,
        },
      ],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    return fieldsFromJson(text);
  } catch (err) {
    console.error("[claude] extractListing failed:", err);
    return null;
  }
}

/** 라벨 사진에서 표시 텍스트 추출. 실패/미설정 시 null. */
export async function ocrLabelWithClaude(input: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}): Promise<OcrLabelResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: OCR_LABEL_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mediaType,
                data: input.imageBase64,
              },
            },
            {
              type: "text",
              text: "이 라벨 사진에서 상품명·브랜드·카테고리·원재료명·영양정보·알레르기 표시·원산지를 추출하세요.",
            },
          ],
        },
      ],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    return fieldsFromJson(text);
  } catch (err) {
    console.error("[claude] ocrLabel failed:", err);
    const mapped = mapClaudeError(err);
    if (mapped) throw new ClaudeCallError(mapped);
    return null;
  }
}
