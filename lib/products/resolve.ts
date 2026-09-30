import type { SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedLabelRow, ProductRow } from "@/lib/types/database";
import type { ProductInput } from "@/lib/types/food";
import { aliasesFromInput, type ProductAlias } from "./aliases";
import { isUsefulOriginText } from "@/lib/rules/fallback-parser";

export async function findProductIdByAliases(
  supabase: SupabaseClient,
  aliases: ProductAlias[]
): Promise<string | null> {
  for (const alias of aliases) {
    const { data } = await supabase
      .from("product_aliases")
      .select("product_id")
      .eq("kind", alias.kind)
      .eq("value", alias.value)
      .maybeSingle();
    if (data?.product_id) return data.product_id as string;
  }
  return null;
}

export async function resolveCachedProduct(
  supabase: SupabaseClient,
  input: Pick<ProductInput, "product_url" | "barcode">
): Promise<{ product: ProductRow; label: NormalizedLabelRow } | null> {
  const aliases = aliasesFromInput(input);
  let productId = await findProductIdByAliases(supabase, aliases);

  if (!productId && input.product_url) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("product_url", input.product_url)
      .limit(1)
      .maybeSingle();
    productId = data?.id ?? null;
  }

  if (!productId) return null;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (!product?.current_normalized_label_id) return null;

  const { data: label } = await supabase
    .from("normalized_labels")
    .select("*")
    .eq("id", product.current_normalized_label_id)
    .maybeSingle();
  if (!label) return null;
  const row = label as NormalizedLabelRow;
  if (!row.raw_ingredients_text && !row.raw_nutrition_text) return null;

  return { product: product as ProductRow, label: row };
}

export function labelToFields(
  product: ProductRow,
  label: NormalizedLabelRow,
  fallbackUrl?: string
): ProductInput {
  return {
    product_url: product.product_url ?? fallbackUrl ?? "",
    product_name: product.product_name,
    brand_name: product.brand_name ?? "",
    category: product.category ?? "",
    barcode: product.barcode ?? "",
    raw_ingredients_text: label.raw_ingredients_text ?? "",
    raw_nutrition_text: label.raw_nutrition_text ?? "",
    raw_allergen_text: label.raw_allergen_text ?? "",
    raw_origin_text: isUsefulOriginText(label.raw_origin_text ?? undefined)
      ? label.raw_origin_text ?? ""
      : "",
  };
}

export async function linkAliases(
  supabase: SupabaseClient,
  productId: string,
  aliases: ProductAlias[]
) {
  if (aliases.length === 0) return;
  const rows = aliases.map((a) => ({
    product_id: productId,
    kind: a.kind,
    value: a.value,
  }));
  const { error } = await supabase.from("product_aliases").upsert(rows, {
    onConflict: "kind,value",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("[aliases] link failed:", error.message);
  }
}
