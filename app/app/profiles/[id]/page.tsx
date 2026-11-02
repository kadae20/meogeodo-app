"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleEditor } from "@/components/profiles/RuleEditor";
import { RuleTemplateSelector } from "@/components/profiles/RuleTemplateSelector";
import {
  RULE_TYPE_LABELS,
  SEVERITY_LABELS,
  PROFILE_TYPE_LABELS,
  type ProfileRuleInput,
} from "@/lib/types/food";
import type { FamilyProfileRow, ProfileRuleRow } from "@/lib/types/database";

function ProfileDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<FamilyProfileRow | null>(null);
  const [rules, setRules] = useState<ProfileRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProfileRuleRow | null>(null);
  const [recommendOpen, setRecommendOpen] = useState(
    searchParams.get("recommend") === "1"
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [profileRes, rulesRes] = await Promise.all([
      supabase.from("family_profiles").select("*").eq("id", params.id).single(),
      supabase
        .from("profile_rules")
        .select("*")
        .eq("profile_id", params.id)
        .order("created_at"),
    ]);
    if (profileRes.error || !profileRes.data) {
      toast.error("프로필을 찾을 수 없습니다.");
      router.push("/app/profiles");
      return;
    }
    setProfile(profileRes.data as FamilyProfileRow);
    setRules((rulesRes.data ?? []) as ProfileRuleRow[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function insertRules(newRules: ProfileRuleInput[]) {
    if (!profile) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setSaving(true);
    const { error } = await supabase.from("profile_rules").insert(
      newRules.map((r) => ({
        user_id: userData.user!.id,
        profile_id: profile.id,
        rule_type: r.rule_type,
        target: r.target,
        target_label: r.target_label ?? null,
        operator: r.operator ?? null,
        threshold_value: r.threshold_value ?? null,
        unit: r.unit ?? null,
        severity: r.severity ?? "medium",
        enabled: r.enabled ?? true,
      }))
    );
    setSaving(false);
    if (error) {
      toast.error("기준 저장에 실패했습니다.");
      return;
    }
    toast.success(`기준 ${newRules.length}개를 저장했습니다.`);
    setRecommendOpen(false);
    setAddOpen(false);
    load();
  }

  async function updateRule(values: ProfileRuleInput) {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase
      .from("profile_rules")
      .update({
        rule_type: values.rule_type,
        target: values.target,
        target_label: values.target_label ?? null,
        operator: values.operator ?? null,
        threshold_value: values.threshold_value ?? null,
        unit: values.unit ?? null,
        severity: values.severity ?? "medium",
      })
      .eq("id", editTarget.id);
    setSaving(false);
    if (error) {
      toast.error("수정에 실패했습니다.");
      return;
    }
    toast.success("기준을 수정했습니다.");
    setEditTarget(null);
    load();
  }

  async function toggleRule(rule: ProfileRuleRow) {
    const { error } = await supabase
      .from("profile_rules")
      .update({ enabled: !rule.enabled })
      .eq("id", rule.id);
    if (error) {
      toast.error("변경에 실패했습니다.");
      return;
    }
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  async function deleteRule(rule: ProfileRuleRow) {
    const { error } = await supabase
      .from("profile_rules")
      .delete()
      .eq("id", rule.id);
    if (error) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    toast.success("기준을 삭제했습니다.");
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6 text-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/app/profiles"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> 가족 프로필
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
            <Badge variant="outline">
              {PROFILE_TYPE_LABELS[profile.profile_type]}
            </Badge>
            {profile.relation_label && <Badge>{profile.relation_label}</Badge>}
          </div>
          {profile.notes && (
            <p className="mt-1 text-sm text-slate-500">{profile.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRecommendOpen(true)}>
            <Sparkles className="h-4 w-4" />
            추천 기준 불러오기
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            기준 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>저장된 기준 ({rules.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              title="아직 저장된 기준이 없습니다."
              description="추천 기준을 불러오거나 직접 추가해주세요."
              action={
                <Button onClick={() => setRecommendOpen(true)}>
                  <Sparkles className="h-4 w-4" />
                  추천 기준 불러오기
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <Checkbox
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule)}
                    title="기준 사용/미사용"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={
                          rule.enabled
                            ? "text-sm font-medium text-slate-900"
                            : "text-sm font-medium text-slate-400 line-through"
                        }
                      >
                        {rule.target_label || rule.target}
                      </p>
                      <Badge variant="outline">
                        {RULE_TYPE_LABELS[rule.rule_type]}
                      </Badge>
                      <Badge
                        variant={
                          rule.severity === "high"
                            ? "red"
                            : rule.severity === "medium"
                              ? "amber"
                              : "default"
                        }
                      >
                        중요도 {SEVERITY_LABELS[rule.severity]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      대상: {rule.target}
                      {rule.threshold_value != null &&
                        ` · 기준 ${rule.operator} ${rule.threshold_value}${rule.unit ?? ""}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditTarget(rule)}
                      title="수정"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteRule(rule)}
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={recommendOpen}
        onClose={() => setRecommendOpen(false)}
        title={`${PROFILE_TYPE_LABELS[profile.profile_type]} 프로필 추천 기준`}
        description="원하는 기준을 체크하고 저장하세요. 이미 있는 기준과 중복될 수 있으니 확인 후 저장하세요."
        className="max-w-xl"
      >
        <RuleTemplateSelector
          profileType={profile.profile_type}
          onSave={insertRules}
          saving={saving}
        />
      </Dialog>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="기준 직접 추가"
        className="max-w-xl"
      >
        <RuleEditor onSubmit={insertRulesSingle} loading={saving} />
      </Dialog>

      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="기준 수정"
        className="max-w-xl"
      >
        {editTarget && (
          <RuleEditor
            initial={editTarget}
            onSubmit={updateRule}
            loading={saving}
          />
        )}
      </Dialog>
    </div>
  );

  function insertRulesSingle(rule: ProfileRuleInput) {
    return insertRules([rule]);
  }
}

export default function ProfileDetailPage() {
  return (
    <Suspense>
      <ProfileDetail />
    </Suspense>
  );
}
