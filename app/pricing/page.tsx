import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 결제 미구현 — 간단한 플랜 안내만 제공
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-10">
      <Link
        href="/app"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> 앱으로 돌아가기
      </Link>

      <h1 className="text-xl font-bold text-slate-900">플랜 안내</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>무료 (베타)</CardTitle>
              <Badge variant="green">현재 플랜</Badge>
            </div>
            <CardDescription>베타 기간 동안 모든 기능 제공</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <ul className="list-disc space-y-1 pl-4">
              <li>가족 프로필·기준 무제한</li>
              <li>단일 상품 검수</li>
              <li>장바구니 검수</li>
              <li>검수 히스토리·화이트리스트</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="opacity-70">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>플러스</CardTitle>
              <Badge>준비 중</Badge>
            </div>
            <CardDescription>정식 출시 시 공개 예정</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            결제 기능은 아직 제공하지 않습니다.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
