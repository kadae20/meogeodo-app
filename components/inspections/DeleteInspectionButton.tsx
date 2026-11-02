"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

export function DeleteInspectionButton({
  inspectionId,
  title,
}: {
  inspectionId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("inspections")
      .delete()
      .eq("id", inspectionId);
    setDeleting(false);
    if (error) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    toast.success("검수 기록을 삭제했습니다.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-slate-400 hover:text-red-600"
        title="이 검수 기록 삭제"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="검수 기록 삭제"
        description={`"${title}" 기록을 삭제합니다. 화이트리스트에 저장한 상품은 남아 있습니다. 계속할까요?`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Spinner />}
            삭제
          </Button>
        </div>
      </Dialog>
    </>
  );
}
