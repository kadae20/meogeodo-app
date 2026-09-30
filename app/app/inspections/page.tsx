import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultBadge } from "@/components/inspections/ResultBadge";
import { formatDate } from "@/lib/utils";
import type { InspectionRow } from "@/lib/types/database";
import type { InspectionSummary } from "@/lib/types/food";

export default async function InspectionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("inspections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const inspections = (data ?? []) as InspectionRow[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">검수 히스토리</h1>
        <p className="mt-1 text-sm text-slate-500">
          지금까지 실행한 검수 결과를 다시 볼 수 있습니다.
        </p>
      </div>

      {inspections.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="아직 검수한 상품이 없습니다."
          action={
            <Link href="/app/check">
              <Button>첫 상품 검수하기</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {inspections.map((insp) => {
                const s = insp.summary_json as Partial<InspectionSummary>;
                return (
                  <Link
                    key={insp.id}
                    href={`/app/inspections/${insp.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {insp.title || "제목 없는 검수"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(insp.created_at)} · 상품 {insp.total_products}개 ·{" "}
                        {insp.inspection_type === "cart_manual"
                          ? "장바구니 검수"
                          : "단일 상품"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.conflict ?? 0) > 0 && <ResultBadge status="내 기준과 충돌" />}
                      {(s.insufficient ?? 0) > 0 && <ResultBadge status="정보 부족" />}
                      {(s.check_needed ?? 0) > 0 && <ResultBadge status="확인 필요" />}
                      {(s.pass ?? 0) > 0 && <ResultBadge status="내 기준 통과" />}
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
