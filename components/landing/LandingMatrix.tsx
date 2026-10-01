import Image from "next/image";
import type { InspectionStatus } from "@/lib/types/food";
import { ResultBadge } from "@/components/inspections/ResultBadge";

const COLS = [
  { name: "아이", rule: "당류 한도" },
  { name: "성인", rule: "나트륨 한도" },
  { name: "강아지", rule: "사람 식품 · 제외" },
] as const;

type Cell = InspectionStatus | "제외";

const ROWS: {
  name: string;
  why: string;
  src: string;
  cells: readonly Cell[];
}[] = [
  {
    name: "언스위트 아몬드 음료",
    why: "당류 표시가 있어 아이 기준과 바로 맞춤",
    src: "/landing/landing-pack.png",
    cells: ["내 기준 통과", "확인 필요", "제외"],
  },
  {
    name: "포도맛 젤리",
    why: "아이 프로필에 적어 둔 당류 한도와 어긋남",
    src: "/landing/landing-label.png",
    cells: ["내 기준과 충돌", "내 기준 통과", "제외"],
  },
  {
    name: "닭가슴살 소시지",
    why: "원재료 사진은 있는데 나트륨 칸이 비어 있음",
    src: "/landing/landing-before.png",
    cells: ["내 기준 통과", "정보 부족", "제외"],
  },
];

export function LandingMatrix() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-lg font-semibold">이번 장보기 · 가족 × 상품</p>
          <p className="mt-1 text-sm text-slate-500">
            같은 장바구니를 사람마다 다시 읽지 않습니다. 강아지는 사람 식품이라 결과에서 빠집니다.
          </p>
        </div>
        <p className="font-landing-mono text-[11px] text-emerald-700">검수 결과 화면</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3.5 text-sm font-medium text-slate-500">상품 3개</th>
              {COLS.map((c) => (
                <th key={c.name} className="px-4 py-3.5">
                  <span className="block text-sm font-semibold text-slate-900">{c.name}</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{c.rule}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.name} className="border-b border-slate-50 last:border-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image src={row.src} alt={row.name} fill className="object-cover" sizes="48px" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{row.name}</span>
                      <span className="mt-0.5 block max-w-[14rem] text-[12px] leading-snug text-slate-500">
                        {row.why}
                      </span>
                    </span>
                  </div>
                </td>
                {row.cells.map((cell, i) => (
                  <td key={i} className="px-4 py-4">
                    {cell === "제외" ? (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-400">
                        제외
                      </span>
                    ) : (
                      <ResultBadge status={cell} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
