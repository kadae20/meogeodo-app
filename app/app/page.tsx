import Link from "next/link";
import {
  Users,
  ScanSearch,
  ShoppingCart,
  Star,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultBadge } from "@/components/inspections/ResultBadge";
import { formatDate } from "@/lib/utils";
import type { InspectionRow } from "@/lib/types/database";
import type { InspectionSummary } from "@/lib/types/food";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [profilesRes, recentInspectionsRes, weeklyCountRes] =
    await Promise.all([
      supabase
        .from("family_profiles")
        .select("id, name, profile_type, relation_label")
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("inspections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo),
    ]);

  const profiles = profilesRes.data ?? [];
  const inspections = (recentInspectionsRes.data ?? []) as InspectionRow[];
  const weeklyCount = weeklyCountRes.count ?? 0;

  // 최근 검수 결과 합산
  const totalSummary: InspectionSummary = {
    pass: 0,
    check_needed: 0,
    conflict: 0,
    insufficient: 0,
  };
  for (const insp of inspections) {
    const s = insp.summary_json as Partial<InspectionSummary>;
    totalSummary.pass += s.pass ?? 0;
    totalSummary.check_needed += s.check_needed ?? 0;
    totalSummary.conflict += s.conflict ?? 0;
    totalSummary.insufficient += s.insufficient ?? 0;
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 6 ? "늦은 시간이네요" : hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{greeting} 👋</h1>
          <p className="mt-1 text-sm text-slate-500">
            상품 링크를 붙여넣으면 가족 기준으로 검수합니다.
          </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-slate-500">가족 프로필</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {profiles.length}
              <span className="ml-1 text-sm font-normal text-slate-400">개</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-slate-500">최근 7일 검수</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {weeklyCount}
              <span className="ml-1 text-sm font-normal text-slate-400">건</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-slate-500">최근 결과 · 내 기준 통과</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {totalSummary.pass}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-slate-500">최근 결과 · 충돌/정보 부족</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {totalSummary.conflict + totalSummary.insufficient}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/app/profiles">
          <Button variant="outline" className="w-full justify-start">
            <Users className="h-4 w-4 text-emerald-700" />
            가족 프로필 추가
          </Button>
        </Link>
        <Link href="/app/check">
          <Button variant="outline" className="w-full justify-start">
            <ScanSearch className="h-4 w-4 text-emerald-700" />
            상품 1개 검수
          </Button>
        </Link>
        <Link href="/app/cart-check">
          <Button variant="outline" className="w-full justify-start">
            <ShoppingCart className="h-4 w-4 text-emerald-700" />
            장바구니 검수
          </Button>
        </Link>
        <Link href="/app/whitelist">
          <Button variant="outline" className="w-full justify-start">
            <Star className="h-4 w-4 text-emerald-700" />
            화이트리스트 보기
          </Button>
        </Link>
      </div>

      {/* 빈 상태 / 최근 검수 */}
      {profiles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="먼저 가족 프로필을 만들어주세요."
          description="프로필을 만들고 프로필별 식품 기준을 저장하면 검수를 시작할 수 있습니다."
          action={
            <Link href="/app/onboarding">
              <Button>가족 프로필 만들기</Button>
            </Link>
          }
        />
      ) : inspections.length === 0 ? (
        <EmptyState
          icon={<ScanSearch className="h-8 w-8" />}
          title="아직 검수한 상품이 없습니다."
          description="상품 URL을 붙여넣으면 가족 기준으로 바로 비교합니다."
          action={
            <Link href="/app/check">
              <Button>첫 상품 검수하기</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>최근 검수 히스토리</CardTitle>
              <CardDescription>최근 5건</CardDescription>
            </div>
            <Link
              href="/app/inspections"
              className="flex items-center gap-1 text-sm text-emerald-700 hover:underline"
            >
              전체 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {inspections.map((insp) => {
                const s = insp.summary_json as Partial<InspectionSummary>;
                return (
                  <Link
                    key={insp.id}
                    href={`/app/inspections/${insp.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {insp.title || "제목 없는 검수"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(insp.created_at)} · 상품{" "}
                        {insp.total_products}개 ·{" "}
                        {insp.inspection_type === "cart_manual"
                          ? "장바구니 검수"
                          : "단일 상품"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.conflict ?? 0) > 0 && (
                        <ResultBadge status="내 기준과 충돌" />
                      )}
                      {(s.insufficient ?? 0) > 0 && (
                        <ResultBadge status="정보 부족" />
                      )}
                      {(s.check_needed ?? 0) > 0 && (
                        <ResultBadge status="확인 필요" />
                      )}
                      {(s.pass ?? 0) > 0 && (
                        <ResultBadge status="내 기준 통과" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
