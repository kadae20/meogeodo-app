import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";
import { EXTENSION_VERSION } from "@/lib/extension/version";

export const maxDuration = 30;
// 이 라우트는 cookies()/headers() 등 동적 API를 써지 않아 Next.js가 빌드 시점에 정적으로 굴려버릴 수 있다.
// 그러면 extension/ 폴더를 고쳐도 다운로드 ZIP은 듰 온 버전으로 고정된다 — 강제로 매 요청 실행되게 한다.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const dir = path.join(process.cwd(), "extension");
  const zip = spawn("zip", ["-r", "-X", "-", ".", "-x", "*.DS_Store"], {
    cwd: dir,
  });

  const chunks: Buffer[] = [];
  zip.stdout.on("data", (c: Buffer) => chunks.push(c));
  const errChunks: Buffer[] = [];
  zip.stderr.on("data", (c: Buffer) => errChunks.push(c));

  const code: number = await new Promise((resolve) => {
    zip.on("close", resolve);
    zip.on("error", () => resolve(1));
  });

  if (code !== 0) {
    return NextResponse.json(
      {
        error:
          "ZIP을 만들지 못했습니다. 저장소의 extension 폴더를 Chrome에 직접 로드하세요.",
      },
      { status: 500 }
    );
  }

  const buf = Buffer.concat(chunks);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="meogeodo-extension-v${EXTENSION_VERSION}.zip"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
