import Link from "next/link";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ResultBadge } from "@/components/inspections/ResultBadge";
import { DeleteInspectionButton } from "@/components/inspections/DeleteInspectionButton";
import { formatDate } from "@/lib/utils";
import type { InspectionRow } from "@/lib/types/database";
import type { InspectionSummary } from "@/lib/types/food";

const PAGE_SIZE = 15;

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from("inspections")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const inspections = (data ?? []) as InspectionRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">검수 히스토리</h1>
        <p className="mt-1 text-sm text-slate-500">
          지금까지 실행한 검수 결과를 다시 볼 수 있습니다.
          {total > 0 && ` 전체 ${total}건 중 ${from + 1}-${Math.min(to + 1, total)}건.`}
        </p>
      </div>

      {inspections.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title={
            page > 1 ? "이 페이지에는 기록이 없습니다." : "아직 검수한 상품이 없습니다."
          }
          action={
            page > 1 ? (
              <Link href="/app/inspections">
                <Button variant="outline">첫 페이지로</Button>
              </Link>
            ) : (
              <Link href="/app/check">
                <Button>첫 상품 검수하기</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {inspections.map((insp) => {
                  const s = insp.summary_json as Partial<InspectionSummary>;
                  return (
                    <div
                      key={insp.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5"
                    >
                      <Link
                        href={`/app/inspections/${insp.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <p className="truncate text-sm font-medium text-slate-900">
                          {insp.title || "제목 없는 검수"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(insp.created_at)} · 상품 {insp.total_products}개 ·{" "}
                          {insp.inspection_type === "cart_manual"
                            ? "장바구니 검수"
                            : "단일 상품"}
                        </p>
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(s.conflict ?? 0) > 0 && <ResultBadge status="내 기준과 충돌" />}
                        {(s.insufficient ?? 0) > 0 && <ResultBadge status="정보 부족" />}
                        {(s.check_needed ?? 0) > 0 && <ResultBadge status="확인 필요" />}
                        {(s.pass ?? 0) > 0 && <ResultBadge status="내 기준 통과" />}
                        <DeleteInspectionButton
                          inspectionId={insp.id}
                          title={insp.title || "제목 없는 검수"}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Link href={`/app/inspections?page=${page - 1}`} tabIndex={page <= 1 ? -1 : undefined}>
                <Button variant="outline" size="sm" disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
              </Link>
              <span className="text-sm text-slate-500">
                {page} / {totalPages} 페이지
              </span>
              <Link
                href={`/app/inspections?page=${page + 1}`}
                tabIndex={page >= totalPages ? -1 : undefined}
              >
                <Button variant="outline" size="sm" disabled={page >= totalPages}>
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
