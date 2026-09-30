import type { ProductInput } from "@/lib/types/food";

const ENDPOINT =
  "https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api";

type NutriItem = {
  foodNm?: string;
  foodLv3Nm?: string;
  foodLv4Nm?: string;
  foodLv6Nm?: string;
  nutConSrtrQua?: string;
  enerc?: string;
  prot?: string;
  sugar?: string;
  nat?: string;
  fasat?: string;
  servSize?: string;
  mfrNm?: string;
  cooNm?: string;
  itemMnftrRptNo?: string;
};

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function itemsFromPayload(payload: unknown): NutriItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const response = (root.response ?? root) as Record<string, unknown>;
  const header = (response.header ?? {}) as Record<string, unknown>;
  const code = String(header.resultCode ?? "");
  if (code && code !== "00" && code !== "0") return [];
  const body = (response.body ?? response) as Record<string, unknown>;
  const items = body.items ?? body.item;
  if (!items) return [];
  if (Array.isArray(items)) return items as NutriItem[];
  if (typeof items === "object" && items && "item" in items) {
    const inner = (items as { item: unknown }).item;
    if (Array.isArray(inner)) return inner as NutriItem[];
    if (inner && typeof inner === "object") return [inner as NutriItem];
  }
  if (typeof items === "object") return [items as NutriItem];
  return [];
}

export function publicSearchName(raw: string): string | null {
  const s = raw
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s*[-|].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length < 2) return null;
  if (/coupang\.com|컬리\.com|상품$/i.test(s) && s.length < 16) return null;
  return s.slice(0, 40);
}

function toFields(item: NutriItem): ProductInput {
  const basis = str(item.nutConSrtrQua) || "100g";
  const serving = str(item.servSize);
  const parts = [
    `${basis}당`,
    str(item.enerc) && `열량 ${str(item.enerc)}kcal`,
    str(item.sugar) && `당류 ${str(item.sugar)}g`,
    str(item.nat) && `나트륨 ${str(item.nat)}mg`,
    str(item.fasat) && `포화지방 ${str(item.fasat)}g`,
    str(item.prot) && `단백질 ${str(item.prot)}g`,
    serving && `1회 제공량 ${serving}`,
  ].filter(Boolean);
  return {
    product_name: str(item.foodNm),
    brand_name: str(item.mfrNm),
    category: str(item.foodLv6Nm) || str(item.foodLv4Nm) || str(item.foodLv3Nm),
    raw_nutrition_text: parts.join(", "),
    raw_origin_text: str(item.cooNm),
    raw_ingredients_text: "",
    raw_allergen_text: "",
  };
}

/** 전국 통합 식품 영양 성분(가공식품). 원재료는 없고 영양·제조사 위주. */
export async function searchPublicNutri(
  name: string
): Promise<ProductInput | null> {
  const key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  const q = publicSearchName(name);
  if (!key || !q) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "5");
  url.searchParams.set("type", "json");
  url.searchParams.set("foodNm", q);

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (text.trimStart().startsWith("<")) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return null;
  }
  const items = itemsFromPayload(payload);
  if (items.length === 0) return null;
  const exact = items.find((it) => str(it.foodNm).includes(q)) ?? items[0];
  const fields = toFields(exact);
  if (!fields.product_name && !fields.raw_nutrition_text) return null;
  return fields;
}

export function mergePublicNutri(
  base: ProductInput,
  pub: ProductInput
): ProductInput {
  return {
    ...base,
    product_name: base.product_name?.trim() || pub.product_name,
    brand_name: base.brand_name?.trim() || pub.brand_name,
    category: base.category?.trim() || pub.category,
    raw_nutrition_text:
      base.raw_nutrition_text?.trim() || pub.raw_nutrition_text,
    raw_origin_text: base.raw_origin_text?.trim() || pub.raw_origin_text,
  };
}

export async function enrichFromPublicNutri(
  fields: ProductInput
): Promise<ProductInput> {
  if (fields.raw_nutrition_text?.trim()) return fields;
  const name = fields.product_name?.trim();
  if (!name) return fields;
  const pub = await searchPublicNutri(name);
  if (!pub) return fields;
  return mergePublicNutri(fields, pub);
}
