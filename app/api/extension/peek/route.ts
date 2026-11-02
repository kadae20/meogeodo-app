import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { peekPage } from "@/lib/extension/peek";

export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().url(),
  title: z.string().max(500).optional(),
  text: z.string().max(100000).optional(),
  images: z
    .array(
      z.object({
        image_base64: z.string().min(1).max(5_000_000),
        media_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      })
    )
    .max(2)
    .optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { count } = await supabase
    .from("family_profiles")
    .select("id", { count: "exact", head: true });
  if (!count) {
    return NextResponse.json({ error: "profiles_required" }, { status: 409 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await peekPage(supabase, parsed.data);
  return NextResponse.json(result);
}
