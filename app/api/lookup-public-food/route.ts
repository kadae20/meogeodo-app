import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchPublicNutri } from "@/lib/products/public-nutri";

export const maxDuration = 20;

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  brand_name: z.string().max(80).optional(),
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
    return NextResponse.json({ error: "식품명을 입력해주세요." }, { status: 400 });
  }

  const pub = await searchPublicNutri(parsed.data.name);
  if (!pub) {
    return NextResponse.json(
      { error: "공공 영양 DB에서 해당 식품명을 찾지 못했습니다.", fields: null },
      { status: 404 }
    );
  }

  return NextResponse.json({ fields: pub, source: "public_nutri" });
}
