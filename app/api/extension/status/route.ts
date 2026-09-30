import { NextResponse } from "next/server";
import { EXTENSION_VERSION } from "@/lib/extension/version";

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
