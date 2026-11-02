import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { digitsBarcode } from "@/lib/products/save-product";
import { resolveCachedProduct, labelToFields } from "@/lib/products/resolve";
import { enrichFromPublicNutri } from "@/lib/products/public-nutri";

export const maxDuration = 20;

const bodySchema = z.object({
  barcode: z.string().min(8),
});

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
    return NextResponse.json({ error: "바코드 숫자를 입력해주세요." }, { status: 400 });
  }
  const barcode = digitsBarcode(parsed.data.barcode);
  if (!barcode) {
    return NextResponse.json({ error: "바코드는 숫자 8자리 이상이어야 합니다." }, { status: 400 });
  }

  const cached = await resolveCachedProduct(supabase, { barcode });
  if (cached) {
    return NextResponse.json({
      fields: { ...labelToFields(cached.product, cached.label), barcode },
      source: "cache",
    });
  }

  try {
    const off = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: { "User-Agent": "Meogeodo/1.0 (food inspection)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    const json = (await off.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_ko?: string;
        brands?: string;
        categories?: string;
        ingredients_text?: string;
        ingredients_text_ko?: string;
        allergens?: string;
        origins?: string;
      };
    };
    if (json.status !== 1 || !json.product) {
      return NextResponse.json(
        {
          error:
            "공개 DB에 없는 바코드입니다. 라벨 사진이나 표시 정보를 붙여넣으세요.",
          fields: { barcode },
        },
        { status: 404 }
      );
    }
    const p = json.product;
    const fields = await enrichFromPublicNutri({
      barcode,
      product_name: p.product_name_ko || p.product_name || "",
      brand_name: p.brands || "",
      category: p.categories || "",
      raw_ingredients_text: p.ingredients_text_ko || p.ingredients_text || "",
      raw_nutrition_text: "",
      raw_allergen_text: p.allergens || "",
      raw_origin_text: p.origins || "",
    });
    return NextResponse.json({ fields, source: "openfoodfacts" });
  } catch {
    return NextResponse.json(
      { error: "바코드 조회에 실패했습니다.", fields: { barcode } },
      { status: 502 }
    );
  }
}
