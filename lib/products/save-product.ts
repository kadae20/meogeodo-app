// 상품 + 정규화 라벨 저장. 바코드 / URL / 이름+브랜드 순으로 기존 상품을 재사용한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedLabelData, ProductInput } from "@/lib/types/food";
import { identityFromInput } from "./identity";
import { aliasesFromInput } from "./aliases";
import { findProductIdByAliases, linkAliases } from "./resolve";

export function digitsBarcode(raw: string | undefined | null): string | null {
  const d = raw?.replace(/\D/g, "") ?? "";
  return d.length >= 8 ? d : null;
}

async function findExistingProductId(
  supabase: SupabaseClient,
  input: ProductInput
): Promise<string | null> {
  const { url, name, brand } = identityFromInput(input);
  const barcode = digitsBarcode(input.barcode);

  if (barcode) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("barcode", barcode)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (url) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("product_url", url)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (!name) return null;

  let q = supabase.from("products").select("id").eq("product_name", name);
  q = brand ? q.eq("brand_name", brand) : q.is("brand_name", null);

  const { data } = await q.limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function saveProductWithLabel(
  supabase: SupabaseClient,
  input: ProductInput,
  label: NormalizedLabelData
): Promise<{ productId: string; labelId: string; reused: boolean }> {
  const { url, name, brand } = identityFromInput(input);
  const barcode = digitsBarcode(input.barcode);
  const aliases = aliasesFromInput(input);

  let existingId = await findExistingProductId(supabase, input);
  if (!existingId) {
    existingId = await findProductIdByAliases(supabase, aliases);
  }
  const scannedAt = new Date().toISOString();

  let productId = existingId;
  let reused = false;

  if (productId) {
    reused = true;
    const { error } = await supabase
      .from("products")
      .update({
        product_url: url ?? (input.product_url || null),
        product_name: name,
        brand_name: brand,
        category: input.category || null,
        barcode: barcode,
        last_scanned_at: scannedAt,
      })
      .eq("id", productId);
    if (error) throw new Error(`상품 갱신 실패: ${error.message}`);
  } else {
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        country_code: "KR",
        product_url: url,
        product_name: name,
        brand_name: brand,
        category: input.category || null,
        barcode,
        last_scanned_at: scannedAt,
      })
      .select("id")
      .single();

    if (productError || !product) {
      throw new Error(`상품 저장 실패: ${productError?.message}`);
    }
    productId = product.id;
  }

  if (!productId) {
    throw new Error("상품 저장 실패: id가 없습니다.");
  }

  const { data: labelRow, error: labelError } = await supabase
    .from("normalized_labels")
    .insert({
      product_id: productId,
      country_code: "KR",
      language: "ko",
      raw_ingredients_text: label.raw_ingredients_text || null,
      raw_nutrition_text: label.raw_nutrition_text || null,
      raw_allergen_text: label.raw_allergen_text || null,
      raw_origin_text: label.raw_origin_text || null,
      nutrition_json: label.nutrition,
      ingredients_json: label.ingredients,
      allergens_json: label.allergens,
      origins_json: label.origins,
      label_quality_json: label.label_quality,
      confidence_score: label.confidence_score,
    })
    .select("id")
    .single();

  if (labelError || !labelRow) {
    throw new Error(`라벨 저장 실패: ${labelError?.message}`);
  }

  await supabase
    .from("products")
    .update({ current_normalized_label_id: labelRow.id })
    .eq("id", productId);

  await linkAliases(supabase, productId, aliases);

  return { productId, labelId: labelRow.id, reused };
}
