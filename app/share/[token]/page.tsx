import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResultBadge } from "@/components/inspections/ResultBadge";
import { formatDate } from "@/lib/utils";
import type { InspectionStatus, InspectionSummary } from "@/lib/types/food";

type SharedItem = {
  product_name: string;
  profile_name: string;
  status: InspectionStatus;
  explanation: string | null;
};

type SharedPayload = {
  title: string | null;
  created_at: string;
  summary: Partial<InspectionSummary>;
  items: SharedItem[];
};

export default async function SharePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_inspection", {
    token: params.token,
  });

  if (error || !data) notFound();
  const payload = data as SharedPayload;
  if (!payload.created_at) notFound();

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white px-4 py-10 print:px-0">
      <p className="text-xs font-medium text-emerald-800">먹어도될까 · 검수 결과</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        {payload.title || "제목 없는 검수"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{formatDate(payload.created_at)}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span>통과 {payload.summary?.pass ?? 0}</span>
        <span>확인 필요 {payload.summary?.check_needed ?? 0}</span>
        <span>충돌 {payload.summary?.conflict ?? 0}</span>
        <span>정보 부족 {payload.summary?.insufficient ?? 0}</span>
      </div>

      <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-200">
        {(payload.items ?? []).map((item, i) => (
          <li key={i} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{item.product_name}</span>
              <span className="text-sm text-slate-500">{item.profile_name}</span>
              <ResultBadge status={item.status} />
            </div>
            {item.explanation && (
              <p className="mt-2 text-sm text-slate-600">{item.explanation}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-slate-400">
        저장된 가족 기준과 상품 표시 정보의 비교입니다. 의학적·수의학적 판단이
        아닙니다.
      </p>
    </div>
  );
}
