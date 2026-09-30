"use client";

import { useState } from "react";
import { Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

async function getShareToken(inspectionId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("enable_inspection_share", {
    insp_id: inspectionId,
  });
  if (error || !data) {
    throw new Error(
      error?.message?.includes("function")
        ? "공유하려면 SQL 마이그레이션 003_p3.sql을 실행해주세요."
        : error?.message ?? "공유 링크를 만들지 못했습니다."
    );
  }
  return String(data);
}

export function ShareInspectionButton({ inspectionId }: { inspectionId: string }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const token = await getShareToken(inspectionId);
            const url = `${window.location.origin}/share/${token}`;
            await navigator.clipboard.writeText(url);
            toast.success("공유 링크를 복사했습니다.");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "공유에 실패했습니다.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Link2 className="h-4 w-4" />
        결과 링크 복사
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const token = await getShareToken(inspectionId);
            window.open(`/share/${token}`, "_blank");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "열기에 실패했습니다.");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Printer className="h-4 w-4" />
        인쇄용 카드
      </Button>
    </div>
  );
}
