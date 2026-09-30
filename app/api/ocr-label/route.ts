import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ClaudeCallError, ocrLabelWithClaude } from "@/lib/ai/claude";

export const maxDuration = 60;

const bodySchema = z.object({
  image_base64: z.string().min(1),
  media_type: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "라벨 사진 읽기는 Claude API 키가 필요합니다. .env.local에 ANTHROPIC_API_KEY를 넣은 뒤 서버를 다시 실행하거나, 표시 정보를 직접 붙여넣으세요.",
      },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "이미지 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (parsed.data.image_base64.length > 7_000_000) {
    return NextResponse.json(
      { error: "이미지가 너무 큽니다. 4MB 이하로 올려주세요." },
      { status: 400 }
    );
  }

  try {
    const result = await ocrLabelWithClaude({
      imageBase64: parsed.data.image_base64,
      mediaType: parsed.data.media_type,
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "사진에서 표시 정보를 읽지 못했습니다. 더 선명한 사진이거나, 텍스트를 붙여넣어 주세요.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ fields: result });
  } catch (err) {
    if (err instanceof ClaudeCallError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "사진 읽기 중 오류가 났습니다. 텍스트를 붙여넣어 주세요." },
      { status: 502 }
    );
  }
}
