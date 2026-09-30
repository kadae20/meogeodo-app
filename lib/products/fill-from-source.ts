import { fallbackProductName } from "@/lib/products/identity";
import type { ProductInput } from "@/lib/types/food";
import {
  isUsefulOriginText,
  parseNutrition,
} from "@/lib/rules/fallback-parser";

function nutritionRank(raw?: string): number {
  const n = parseNutrition(raw ?? "");
  let s = 0;
  if (n.sugars_g != null) s += 2;
  if (n.sodium_mg != null) s += 2;
  if (n.saturated_fat_g != null) s += 2;
  return s;
}

export function mergeProductFields(
  value: ProductInput,
  f: Partial<ProductInput>
): ProductInput {
  return {
    ...value,
    product_url: f.product_url || value.product_url,
    product_name: value.product_name.trim()
      ? value.product_name
      : f.product_name || "",
    brand_name: value.brand_name?.trim() ? value.brand_name : f.brand_name || "",
    category: value.category?.trim() ? value.category : f.category || "",
    barcode: value.barcode?.trim() ? value.barcode : f.barcode || "",
    raw_ingredients_text:
      f.raw_ingredients_text || value.raw_ingredients_text,
    raw_nutrition_text:
      nutritionRank(f.raw_nutrition_text) >= nutritionRank(value.raw_nutrition_text)
        ? f.raw_nutrition_text || value.raw_nutrition_text
        : value.raw_nutrition_text || f.raw_nutrition_text || "",
    raw_allergen_text: f.raw_allergen_text || value.raw_allergen_text,
    raw_origin_text: isUsefulOriginText(f.raw_origin_text)
      ? f.raw_origin_text || ""
      : isUsefulOriginText(value.raw_origin_text)
        ? value.raw_origin_text
        : "",
    page_text: f.page_text || value.page_text,
  };
}

export function hasAnyLabel(p: ProductInput): boolean {
  return !!(
    p.raw_ingredients_text?.trim() ||
    p.raw_nutrition_text?.trim() ||
    p.raw_allergen_text?.trim() ||
    p.raw_origin_text?.trim()
  );
}

/** URL·바코드·페이지 본문으로 표시를 채운다. 원재료가 없어도 throw 하지 않는다. */
export async function tryFillProduct(
  input: ProductInput
): Promise<{ product: ProductInput; missing: boolean; blocked: boolean }> {
  let next = { ...input };
  const { page_text: capture, ...rest } = next;
  next = rest;
  let blocked = false;

  const url = next.product_url?.trim();
  if (url && !hasAnyLabel(next)) {
    const res = await fetch("/api/fetch-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        page_text: capture?.slice(0, 40000) || undefined,
        page_title: next.product_name || undefined,
      }),
    });
    const data = await res.json();
    if (data.fields) next = mergeProductFields(next, data.fields);
    if (data.blocked) blocked = true;
  }

  const barcode = next.barcode?.trim();
  if (barcode && !hasAnyLabel(next)) {
    const res = await fetch("/api/lookup-barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode }),
    });
    const data = await res.json();
    if (data.fields) next = mergeProductFields(next, { ...data.fields, barcode });
  }

  const name = fallbackProductName(next);
  if (name && (hasAnyLabel(next) || next.product_name.trim())) {
    next = { ...next, product_name: next.product_name.trim() || name };
  }

  if (next.product_name.trim() && !next.raw_nutrition_text?.trim()) {
    const res = await fetch("/api/lookup-public-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: next.product_name,
        brand_name: next.brand_name || undefined,
      }),
    });
    const data = await res.json();
    if (data.fields) next = mergeProductFields(next, data.fields);
  }

  return {
    product: next,
    missing: !hasAnyLabel(next),
    blocked,
  };
}

/** 장바구니 등: 표시가 없으면 에러. */
export async function fillProductFromSources(
  input: ProductInput
): Promise<ProductInput> {
  const { product, missing } = await tryFillProduct(input);
  if (missing) {
    throw new Error(
      "성분표를 붙이거나 캡쳐해주세요. 링크만으로는 원재료를 못 읽을 수 있습니다."
    );
  }
  return product;
}

export function canInspectProduct(p: ProductInput): boolean {
  return !!(
    p.product_url?.trim() ||
    p.barcode?.trim() ||
    p.product_name.trim() ||
    p.page_text?.trim()
  );
}
