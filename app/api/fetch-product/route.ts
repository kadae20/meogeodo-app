import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractListingWithClaude } from "@/lib/ai/claude";
import { canonicalProductUrl, fallbackProductName } from "@/lib/products/identity";
import { resolveCachedProduct, labelToFields } from "@/lib/products/resolve";
import {
  extractListingFromHtml,
  isBlockedListingHtml,
  listingTextForExtract,
} from "@/lib/products/listing-extract";
import { enrichFromPublicNutri } from "@/lib/products/public-nutri";
import { mergeProductFields } from "@/lib/products/fill-from-source";
import type { ProductInput } from "@/lib/types/food";

export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().url(),
  page_text: z.string().max(40000).optional(),
  page_title: z.string().max(500).optional(),
});

function pick(a?: string, b?: string): string {
  return a?.trim() ? a : b?.trim() ? b : "";
}

function hasLabel(fields: ProductInput): boolean {
  return !!(
    fields.raw_ingredients_text?.trim() ||
    fields.raw_nutrition_text?.trim() ||
    fields.raw_allergen_text?.trim() ||
    fields.raw_origin_text?.trim()
  );
}

async function fieldsFromHtml(
  url: string,
  html: string,
  pageTitle?: string
): Promise<ProductInput> {
  const extracted = extractListingFromHtml(html, url);
  let ai = null;
  if (!extracted.raw_ingredients_text?.trim()) {
    ai = await extractListingWithClaude(listingTextForExtract(html));
  }
  return {
    product_url: url,
    product_name:
      pick(extracted.product_name, ai?.product_name) ||
      pageTitle?.trim() ||
      "",
    brand_name: pick(extracted.brand_name, ai?.brand_name),
    category: pick(extracted.category, ai?.category),
    raw_ingredients_text: pick(
      extracted.raw_ingredients_text,
      ai?.raw_ingredients_text
    ),
    raw_nutrition_text: pick(
      extracted.raw_nutrition_text,
      ai?.raw_nutrition_text
    ),
    raw_allergen_text: pick(extracted.raw_allergen_text, ai?.raw_allergen_text),
    raw_origin_text: pick(extracted.raw_origin_text, ai?.raw_origin_text),
  };
}

const BLOCKED_MSG =
  "이 쇼핑몰은 서버에서 상세 페이지를 열지 못합니다. 상품 탭에서 원재료가 보이게 한 뒤, 북마크릿으로 그 페이지를 읽혀 주세요.";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "올바른 URL을 입력해주세요." }, { status: 400 });
  }

  const url = canonicalProductUrl(parsed.data.url) ?? parsed.data.url;
  const pageText = parsed.data.page_text?.trim();
  const cached = await resolveCachedProduct(supabase, {
    product_url: url,
    barcode: undefined,
  });

  if (pageText) {
    let fields = await enrichFromPublicNutri(
      await fieldsFromHtml(url, pageText, parsed.data.page_title)
    );
    if (cached) {
      fields = mergeProductFields(
        labelToFields(cached.product, cached.label, url),
        fields
      );
    }
    if (!hasLabel(fields)) {
      return NextResponse.json(
        {
          error:
            "페이지에서 원재료·영양 표시를 찾지 못했습니다. 상품정보(원재료)가 보이게 펼친 다음 다시 읽어 주세요.",
          fields,
          source: "page_text",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ fields, source: "page_text" });
  }

  if (cached) {
    return NextResponse.json({
      fields: labelToFields(cached.product, cached.label, url),
      source: "cache",
    });
  }

  try {
    const res = await fetch(parsed.data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    const html = await res.text();
    if (isBlockedListingHtml(html, res.status) || !res.ok) {
      return NextResponse.json(
        {
          error: BLOCKED_MSG,
          blocked: true,
          fields: { product_url: url },
        },
        { status: 502 }
      );
    }

    const fields = await enrichFromPublicNutri(
      await fieldsFromHtml(url, html, parsed.data.page_title)
    );
    if (!fields.product_name) {
      fields.product_name = fallbackProductName(fields);
    }
    if (!hasLabel(fields)) {
      return NextResponse.json(
        {
          error:
            "페이지는 열렸지만 원재료 고시가 HTML에 없습니다. 상품정보 영역을 펼친 뒤 북마크릿으로 읽거나, 성분표를 올려 주세요.",
          blocked: false,
          fields,
          source: "page",
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ fields, source: "page" });
  } catch {
    return NextResponse.json(
      {
        error: BLOCKED_MSG,
        blocked: true,
        fields: { product_url: url },
      },
      { status: 502 }
    );
  }
}
