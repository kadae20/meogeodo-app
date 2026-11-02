import { NextResponse } from "next/server";
import { EXTENSION_VERSION } from "@/lib/extension/version";

// 같은 이유로 정적 프리렌더링 캠싱을 막아 버전이 실제로 최신인지 매번 반영되게 한다.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    name: "먹어도될까",
    version: EXTENSION_VERSION,
    channel: "제한 배포",
    store: "준비 중",
    chrome_min: "116",
    install: "unpacked",
    platforms: ["Windows", "macOS"],
    mobile_install: false,
  });
}
