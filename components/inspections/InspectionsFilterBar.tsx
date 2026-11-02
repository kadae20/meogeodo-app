"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { InspectionSummary } from "@/lib/types/food";

type StatusKey = keyof InspectionSummary;

const STATUS_CHIPS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pass", label: "통과" },
  { key: "check_needed", label: "확인 필요" },
  { key: "conflict", label: "충돌" },
  { key: "insufficient", label: "정보 부족" },
];

export function InspectionsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";

  const [q, setQ] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(currentQ);
  }, [currentQ]);

  function pushParams(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = next.q ?? currentQ;
    const nextStatus = next.status ?? currentStatus;
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    else params.delete("status");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function onQChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ q: value }), 350);
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="상품명·제목으로 검색"
          className="pl-9 pr-8"
        />
        {q && (
          <button
            type="button"
            onClick={() => onQChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="검색어 지우기"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_CHIPS.map((chip) => {
          const active = currentStatus === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => pushParams({ status: chip.key })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
