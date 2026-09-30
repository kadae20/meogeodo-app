import { Badge } from "@/components/ui/badge";
import type { InspectionStatus } from "@/lib/types/food";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

const STATUS_CONFIG: Record<
  InspectionStatus,
  { variant: "green" | "amber" | "red" | "blue"; Icon: typeof CheckCircle2 }
> = {
  "내 기준 통과": { variant: "green", Icon: CheckCircle2 },
  "확인 필요": { variant: "amber", Icon: AlertTriangle },
  "내 기준과 충돌": { variant: "red", Icon: XCircle },
  "정보 부족": { variant: "blue", Icon: HelpCircle },
};

export function ResultBadge({ status }: { status: InspectionStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG["정보 부족"];
  const { variant, Icon } = config;
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}
