export type AliasKind =
  | "barcode"
  | "coupang_item"
  | "coupang_vendor_item"
  | "coupang_product"
  | "url";

export type ProductAlias = { kind: AliasKind; value: string };

export interface CoupangIds {
  productId: string;
  itemId: string | null;
  vendorItemId: string | null;
}

/** 쿠팡 상품 URL → product / item / vendorItem */
export function parseCoupangUrl(raw: string): CoupangIds | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (!host.includes("coupang.com")) return null;
  const m = u.pathname.match(/\/(?:vp|vm)\/products\/(\d+)/);
  if (!m?.[1]) return null;
  return {
    productId: m[1],
    itemId: u.searchParams.get("itemId"),
    vendorItemId: u.searchParams.get("vendorItemId"),
  };
}

export function canonicalProductUrl(url: string | undefined | null): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    u.hash = "";
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, "") || "";
    const coupang = parseCoupangUrl(raw);
    if (coupang) {
      const next = new URL(`${u.protocol}//${host}${path}`);
      if (coupang.itemId) next.searchParams.set("itemId", coupang.itemId);
      if (coupang.vendorItemId) {
        next.searchParams.set("vendorItemId", coupang.vendorItemId);
      }
      return next.toString();
    }
    return `${u.protocol}//${host}${path}${u.search}`.toLowerCase();
  } catch {
    return raw;
  }
}

export function aliasesFromUrl(url: string | undefined | null): ProductAlias[] {
  const canonical = canonicalProductUrl(url);
  if (!canonical) return [];
  const out: ProductAlias[] = [];
  const coupang = parseCoupangUrl(url ?? "");
  if (coupang?.itemId) {
    out.push({ kind: "coupang_item", value: coupang.itemId });
  }
  if (coupang?.vendorItemId) {
    out.push({ kind: "coupang_vendor_item", value: coupang.vendorItemId });
  }
  if (coupang) {
    out.push({ kind: "coupang_product", value: coupang.productId });
  }
  out.push({ kind: "url", value: canonical });
  return out;
}

export function aliasesFromBarcode(
  barcode: string | undefined | null
): ProductAlias[] {
  const d = barcode?.replace(/\D/g, "") ?? "";
  if (d.length < 8) return [];
  return [{ kind: "barcode", value: d }];
}

export function aliasesFromInput(input: {
  product_url?: string;
  barcode?: string;
}): ProductAlias[] {
  const seen = new Set<string>();
  const out: ProductAlias[] = [];
  for (const a of [
    ...aliasesFromBarcode(input.barcode),
    ...aliasesFromUrl(input.product_url),
  ]) {
    const k = `${a.kind}:${a.value}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}
