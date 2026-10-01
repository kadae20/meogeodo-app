import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "먹어도될까",
    template: "%s · 먹어도될까",
  },
  description:
    "장볼 때마다 원재료를 다시 읽지 않게. 가족 기준을 저장하고 쿠팡에서 비교합니다.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  ),
  openGraph: {
    title: "먹어도될까",
    description:
      "결제 전, 우리 집 기준으로 원재료와 영양을 비교합니다.",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "먹어도될까",
    description:
      "가족 기준으로 온라인 식품을 결제 전에 비교하는 웹서비스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
