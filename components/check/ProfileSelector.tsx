"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PROFILE_TYPE_LABELS } from "@/lib/types/food";
import type { FamilyProfileRow } from "@/lib/types/database";

export function ProfileSelector({
  profiles,
  selected,
  onChange,
  ruleCounts,
}: {
  profiles: FamilyProfileRow[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  ruleCounts?: Record<string, number>;
}) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        가족 프로필이 없습니다.{" "}
        <Link href="/app/onboarding" className="text-emerald-700 underline">
          먼저 프로필을 만들어주세요.
        </Link>
      </p>
    );
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {profiles.map((p) => (
        <label
          key={p.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
        >
          <Checkbox
            checked={selected.has(p.id)}
            onChange={() => toggle(p.id)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {p.name}
              </span>
              <Badge variant="outline">
                {PROFILE_TYPE_LABELS[p.profile_type]}
              </Badge>
            </div>
            {ruleCounts && (
              <p className="text-xs text-slate-500">
                기준 {ruleCounts[p.id] ?? 0}개
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
