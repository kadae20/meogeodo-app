import type { ProductInput } from "@/lib/types/food";
import { canonicalProductUrl } from "./aliases";

export { canonicalProductUrl, parseCoupangUrl, aliasesFromInput } from "./aliases";

export function foldProductName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** URL·바코드만 있을 때 검수 제목용 이름 */
export function fallbackProductName(input: {
  product_name?: string;
  product_url?: string;
  barcode?: string;
}): string {
  const named = foldProductName(input.product_name ?? "");
  if (named) return named;
  const url = canonicalProductUrl(input.product_url);
  if (url) {
    try {
      return `${new URL(url).hostname.replace(/^www\./, "")} 상품`;
    } catch {
      return "링크 상품";
    }
  }
  const barcode = input.barcode?.replace(/\D/g, "") ?? "";
  if (barcode.length >= 8) return `바코드 ${barcode}`;
  return "";
}

export function identityFromInput(input: ProductInput): {
  url: string | null;
  name: string;
  brand: string | null;
} {
  return {
    url: canonicalProductUrl(input.product_url),
    name: foldProductName(input.product_name),
    brand: input.brand_name?.trim() ? foldProductName(input.brand_name) : null,
  };
}
