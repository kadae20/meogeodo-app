import type { ProductInput } from "@/lib/types/food";
import {
  COMMERCE_NOISE_RE,
  ORIGIN_PLACEHOLDER_RE,
  ORIGIN_TOKEN_RE,
  parseIngredients,
} from "@/lib/rules/fallback-parser";

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, key: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
    "i"
  );
  return decodeEntities(html.match(re)?.[1] || html.match(re2)?.[1] || "").trim();
}

function isProductType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && /product/i.test(t));
}

function usefulKorean(s: string): boolean {
  const t = s.trim();
  if (t.length < 6 || t.length > 4000) return false;
  if (/^https?:/i.test(t)) return false;
  return /[가-힣]/.test(t);
}

function walkStrings(value: unknown, bag: string[], depth = 0) {
  if (depth > 12 || bag.length > 80) return;
  if (typeof value === "string") {
    if (usefulKorean(value)) bag.push(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, bag, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (
        /ingredient|allergen|allergy|nutrition|origin|notice|원재료|원료|영양|알레르기|원산지|고시/i.test(
          k
        ) &&
        typeof v === "string" &&
        v.trim()
      ) {
        bag.push(`${k}: ${v.trim()}`);
      }
      walkStrings(v, bag, depth + 1);
    }
  }
}

function parseJsonSilent(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function embeddedJsonBlobs(html: string): string {
  const bag: string[] = [];
  const next = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  const nextJson = next?.[1] ? parseJsonSilent(next[1]) : null;
  if (nextJson) walkStrings(nextJson, bag);

  const ldRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ld: RegExpExecArray | null;
  while ((ld = ldRe.exec(html))) {
    const parsed = parseJsonSilent(ld[1]);
    if (parsed) walkStrings(parsed, bag);
  }
  return Array.from(new Set(bag)).join("\n");
}

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const parsed: unknown = parseJsonSilent(m[1]);
    const queue: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed
        ? [parsed]
        : [];
    while (queue.length) {
      const item = queue.shift();
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (Array.isArray(rec["@graph"])) queue.push(...rec["@graph"]);
      if (isProductType(rec["@type"])) out.push(rec);
    }
  }
  return out;
}

function brandFromJsonLd(brand: unknown): string {
  if (typeof brand === "string") return brand.trim();
  if (brand && typeof brand === "object" && "name" in brand) {
    const n = (brand as { name?: unknown }).name;
    return typeof n === "string" ? n.trim() : "";
  }
  return "";
}

function section(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      `${label}\\s*[:：]?\\s*([\\s\\S]{8,1200}?)(?=(?:원재료명 및 함량|원재료명|원재료|원료명|영양정보|영양성분|알레르기|원산지|판매자|배송|상품정보)\\s*[:：]|$)`,
      "i"
    );
    const m = text.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function usefulIngredientText(s: string): string {
  if (!s?.trim()) return "";
  if (parseIngredients(s).length >= 2) return s;
  if (/향료|정제수|함유|농축/.test(s)) return s;
  return "";
}

function windowsAround(text: string, needles: string[], span = 1800): string {
  const parts: string[] = [];
  for (const needle of needles) {
    let from = 0;
    for (let n = 0; n < 4; n++) {
      const i = text.indexOf(needle, from);
      if (i < 0) break;
      parts.push(text.slice(i, i + span));
      from = i + needle.length;
    }
  }
  return parts.join("\n");
}

function nutritionScore(win: string): number {
  let s = 0;
  if (/당류[\s:：(g그램)]{0,16}[0-9]/.test(win)) s += 2;
  if (/나트륨[\s:：(mg㎎밀리)]{0,20}[0-9]/.test(win)) s += 2;
  if (/포화지방[\s:：(g그램)]{0,16}[0-9]/.test(win)) s += 2;
  if (/[0-9]+\s*kcal|열량/.test(win)) s += 1;
  if (COMMERCE_NOISE_RE.test(win)) s -= 3;
  return s;
}

function bestWindow(
  text: string,
  needles: string[],
  span: number,
  scoreFn: (w: string) => number
): string {
  let best = "";
  let bestScore = -Infinity;
  for (const needle of needles) {
    let from = 0;
    while (from < text.length) {
      const i = text.indexOf(needle, from);
      if (i < 0) break;
      const win = text.slice(i, i + span);
      const sc = scoreFn(win);
      if (sc > bestScore) {
        bestScore = sc;
        best = win;
      }
      from = i + needle.length;
    }
  }
  return bestScore > 0 ? best : "";
}

function harvestOrigin(text: string, ingredients: string): string {
  ORIGIN_TOKEN_RE.lastIndex = 0;
  const fromIng = ingredients.match(ORIGIN_TOKEN_RE) ?? [];
  const snippets: string[] = [];
  let from = 0;
  while (from < text.length) {
    const i = text.indexOf("원산지", from);
    if (i < 0) break;
    const win = text.slice(i, i + 90);
    from = i + 3;
    if (ORIGIN_PLACEHOLDER_RE.test(win)) continue;
    if (COMMERCE_NOISE_RE.test(win)) continue;
    ORIGIN_TOKEN_RE.lastIndex = 0;
    const tokens = win.match(ORIGIN_TOKEN_RE);
    if (tokens?.length) {
      snippets.push(Array.from(new Set(tokens)).join(", "));
      continue;
    }
    const labeled = win.match(/원산지\s*[:：]\s*([가-힣]{2,20})/);
    if (
      labeled?.[1] &&
      !ORIGIN_PLACEHOLDER_RE.test(labeled[1]) &&
      !COMMERCE_NOISE_RE.test(labeled[1])
    ) {
      snippets.push(labeled[1]);
    }
  }
  const merged = [...new Set([...snippets, ...fromIng])];
  if (merged.length) return merged.join(", ");
  ORIGIN_TOKEN_RE.lastIndex = 0;
  return [...new Set(text.match(ORIGIN_TOKEN_RE) ?? [])].join(", ");
}

/** 쿠팡 상품상세 innerText처럼 HTML이 아닌 본문에서 표시 구간만 고른다. */
export function harvestFromPageText(text: string): {
  raw_ingredients_text: string;
  raw_nutrition_text: string;
  raw_allergen_text: string;
  raw_origin_text: string;
} {
  const raw_ingredients_text = usefulIngredientText(
    windowsAround(text, [
      "원재료명 및 함량",
      "원재료명및함량",
      "원재료명",
    ]) || windowsAround(text, ["원료명"])
  );
  const raw_nutrition_text =
    bestWindow(
      text,
      ["영양정보", "영양성분", "영양 정보", "1회 제공량", "1회제공량"],
      700,
      nutritionScore
    ) ||
    bestWindow(text, ["나트륨", "당류", "포화지방"], 500, nutritionScore);
  const containsLine = text.match(/([가-힣A-Za-z·,\s]{1,40})\s*함유/);
  const raw_allergen_text =
    windowsAround(text, ["알레르기 유발물질", "알레르기"], 400) ||
    (containsLine ? containsLine[0].trim() : "");
  const raw_origin_text = harvestOrigin(text, raw_ingredients_text);
  return {
    raw_ingredients_text,
    raw_nutrition_text,
    raw_allergen_text,
    raw_origin_text,
  };
}

export function isBlockedListingHtml(html: string, status?: number): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  const head = html.slice(0, 2000);
  return /Access Denied/i.test(head) && /permission to access/i.test(head);
}

export function retailerFromHost(host: string): string | null {
  const h = host.toLowerCase();
  if (h.includes("coupang")) return "쿠팡";
  if (h.includes("kurly")) return "마켓컬리";
  if (h.includes("naver")) return "네이버";
  if (h.includes("11st")) return "11번가";
  if (h.includes("gmarket") || h.includes("auction")) return "G마켓/옥션";
  if (h.includes("ssg")) return "SSG";
  if (h.includes("oliveyoung")) return "올리브영";
  return null;
}

/** 정규식·Claude가 같이 볼 페이지 본문 */
export function listingTextForExtract(html: string): string {
  const json = embeddedJsonBlobs(html);
  const visible = stripTags(html);
  return [json, visible].filter(Boolean).join("\n");
}

export function extractListingFromHtml(
  html: string,
  pageUrl: string
): ProductInput & { retailer: string | null } {
  let host = "";
  try {
    host = new URL(pageUrl).host;
  } catch {
    host = "";
  }

  if (isBlockedListingHtml(html)) {
    return {
      product_url: pageUrl,
      product_name: "",
      brand_name: "",
      category: "",
      retailer: retailerFromHost(host),
      raw_ingredients_text: "",
      raw_nutrition_text: "",
      raw_allergen_text: "",
      raw_origin_text: "",
    };
  }

  const jsonld = jsonLdProducts(html)[0];
  const jsonldName =
    typeof jsonld?.name === "string" ? decodeEntities(jsonld.name).trim() : "";
  const jsonldBrand = brandFromJsonLd(jsonld?.brand);
  const jsonldDesc =
    typeof jsonld?.description === "string"
      ? decodeEntities(jsonld.description)
      : "";

  const rawTitle =
    jsonldName ||
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    decodeEntities(html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").trim();
  const title = /access denied/i.test(rawTitle) ? "" : rawTitle;

  const text = listingTextForExtract(html) + " " + jsonldDesc;
  const harvested = harvestFromPageText(text);
  return {
    product_url: pageUrl,
    product_name: title.replace(/\s*[-|].*$/, "").trim() || title,
    brand_name: jsonldBrand || metaContent(html, "product:brand") || "",
    category: "",
    retailer: retailerFromHost(host),
    raw_ingredients_text:
      harvested.raw_ingredients_text ||
      section(text, [
        "원재료명 및 함량",
        "원재료명및함량",
        "원재료명",
        "원료명",
      ]),
    raw_nutrition_text:
      harvested.raw_nutrition_text || section(text, ["영양정보", "영양성분"]),
    raw_allergen_text:
      harvested.raw_allergen_text ||
      section(text, ["알레르기 유발물질", "알레르기"]),
    raw_origin_text: harvested.raw_origin_text,
  };
}
