import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PC Chrome 확장프로그램 — 먹어도될까",
  description:
    "쿠팡 상품 페이지에서 가족 프로필 기준으로 바로 검수하는 Chrome 확장프로그램",
};

export default function ExtensionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
