import { spawn } from "child_process";
import path from "path";
import { NextResponse } from "next/server";
import { EXTENSION_VERSION } from "@/lib/extension/version";

export const maxDuration = 30;

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
    },
  });
}
