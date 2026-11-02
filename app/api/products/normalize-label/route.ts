import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeLabel } from "@/lib/products/normalize";

const bodySchema = z.object({
  raw_ingredients_text: z.string().optional(),
  raw_nutrition_text: z.string().optional(),
  raw_allergen_text: z.string().optional(),
  raw_origin_text: z.string().optional(),
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
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const label = await normalizeLabel(parsed.data);
  return NextResponse.json({ label });
}
