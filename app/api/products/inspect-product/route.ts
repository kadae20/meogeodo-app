import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  InspectError,
  inspectBodySchema,
  runInspection,
} from "@/lib/products/inspect";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const parsed = inspectBodySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  try {
    const { inspectionId, summary } = await runInspection(
      supabase,
      user,
      parsed.data
    );
    return NextResponse.json({ inspection_id: inspectionId, summary });
  } catch (err) {
    if (err instanceof InspectError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "검수 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
