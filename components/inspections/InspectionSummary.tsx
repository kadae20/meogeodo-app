import { Card, CardContent } from "@/components/ui/card";
import type { InspectionSummary as Summary } from "@/lib/types/food";

const ITEMS: {
  key: keyof Summary;
  label: string;
  color: string;
}[] = [
  { key: "pass", label: "내 기준 통과", color: "text-emerald-700" },
  { key: "check_needed", label: "확인 필요", color: "text-amber-600" },
  { key: "conflict", label: "내 기준과 충돌", color: "text-red-600" },
  { key: "insufficient", label: "정보 부족", color: "text-blue-600" },
];

export function InspectionSummaryCards({ summary }: { summary: Partial<Summary> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>
              {summary[item.key] ?? 0}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
