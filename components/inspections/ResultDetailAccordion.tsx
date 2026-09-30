"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RuleHit } from "@/lib/types/food";

function RuleHitList({
  title,
  hits,
  variant,
}: {
  title: string;
  hits: RuleHit[];
  variant: "green" | "amber" | "red" | "blue";
}) {
  if (hits.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Badge variant={variant}>{title}</Badge>
        <span className="text-xs text-slate-400">{hits.length}건</span>
      </div>
      <ul className="space-y-1">
        {hits.map((h, i) => (
          <li
            key={i}
            className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600"
          >
            <span className="font-medium text-slate-800">
              {h.target_label || h.target}
            </span>{" "}
            — {h.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResultDetailAccordion({
  matched,
  warnings,
  conflicts,
  missing,
}: {
  matched: RuleHit[];
  warnings: RuleHit[];
  conflicts: RuleHit[];
  missing: RuleHit[];
}) {
  const [open, setOpen] = useState(false);
  const total =
    matched.length + warnings.length + conflicts.length + missing.length;

  if (total === 0) {
    return (
      <p className="text-xs text-slate-400">
        이 프로필에 설정된 기준이 없어 비교할 항목이 없습니다.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
      >
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        가족 기준과 비교한 상세 결과 ({total}건)
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <RuleHitList title="충돌 항목" hits={conflicts} variant="red" />
          <RuleHitList title="정보 부족" hits={missing} variant="blue" />
          <RuleHitList title="주의 항목" hits={warnings} variant="amber" />
          <RuleHitList title="기준 안 항목" hits={matched} variant="green" />
        </div>
      )}
    </div>
  );
}
