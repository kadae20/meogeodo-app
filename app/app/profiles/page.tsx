"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  ProfileForm,
  type ProfileFormValues,
} from "@/components/profiles/ProfileForm";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import type { FamilyProfileRow } from "@/lib/types/database";

export default function ProfilesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profiles, setProfiles] = useState<FamilyProfileRow[]>([]);
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyProfileRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyProfileRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profileData, error } = await supabase
      .from("family_profiles")
      .select("*")
      .order("created_at");
    if (error) {
      toast.error("프로필을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    setProfiles((profileData ?? []) as FamilyProfileRow[]);

    const { data: ruleData } = await supabase
      .from("profile_rules")
      .select("profile_id");
    const counts: Record<string, number> = {};
    for (const r of ruleData ?? []) {
      counts[r.profile_id] = (counts[r.profile_id] ?? 0) + 1;
    }
    setRuleCounts(counts);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(values: ProfileFormValues) {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data, error } = await supabase
      .from("family_profiles")
      .insert({
        user_id: userData.user.id,
        name: values.name,
        profile_type: values.profile_type,
        relation_label: values.relation_label || null,
        notes: values.notes || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("프로필 생성에 실패했습니다.");
      return;
    }
    toast.success("프로필을 만들었습니다. 이제 기준을 골라주세요.");
    setAddOpen(false);
    router.push(`/app/profiles/${data.id}?recommend=1`);
  }

  async function handleEdit(values: ProfileFormValues) {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase
      .from("family_profiles")
      .update({
        name: values.name,
        profile_type: values.profile_type,
        relation_label: values.relation_label || null,
        notes: values.notes || null,
      })
      .eq("id", editTarget.id);
    setSaving(false);
    if (error) {
      toast.error("수정에 실패했습니다.");
      return;
    }
    toast.success("프로필을 수정했습니다.");
    setEditTarget(null);
    load();
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await supabase
      .from("family_profiles")
      .delete()
      .eq("id", deleteTarget.id);
    setSaving(false);
    if (error) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    toast.success("프로필을 삭제했습니다.");
    setDeleteTarget(null);
    load();
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">가족 프로필</h1>
          <p className="mt-1 text-sm text-slate-500">
            가족 구성원(아이·성인·반려동물)별로 식품 기준을 관리합니다.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          프로필 추가
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-emerald-700" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="먼저 가족 프로필을 만들어주세요."
          description="온보딩에서 프로필과 추천 기준을 한 번에 설정할 수 있습니다."
          action={
            <div className="flex gap-2">
              <Link href="/app/onboarding">
                <Button>온보딩 시작</Button>
              </Link>
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                직접 추가
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              ruleCount={ruleCounts[p.id] ?? 0}
              onEdit={() => setEditTarget(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="가족 프로필 추가"
        description="프로필을 만들면 바로 기준 추천 화면으로 이동합니다."
      >
        <ProfileForm onSubmit={handleAdd} submitLabel="만들기" loading={saving} />
      </Dialog>

      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="프로필 수정"
      >
        {editTarget && (
          <ProfileForm
            initial={editTarget}
            onSubmit={handleEdit}
            submitLabel="수정 저장"
            loading={saving}
          />
        )}
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="프로필 삭제"
        description={`"${deleteTarget?.name}" 프로필과 저장된 기준이 모두 삭제됩니다. 계속할까요?`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            취소
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving && <Spinner />}
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
