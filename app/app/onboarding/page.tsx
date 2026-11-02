"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, User, Dog, Cat, HelpCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ProfileForm,
  type ProfileFormValues,
} from "@/components/profiles/ProfileForm";
import { RuleTemplateSelector } from "@/components/profiles/RuleTemplateSelector";
import {
  PROFILE_TYPE_LABELS,
  type ProfileRuleInput,
  type ProfileType,
} from "@/lib/types/food";

const QUICK_PRESETS: {
  name: string;
  profile_type: ProfileType;
  relation_label: string;
  Icon: typeof Baby;
}[] = [
  { name: "아이", profile_type: "child", relation_label: "아이", Icon: Baby },
  { name: "나 / 배우자", profile_type: "adult", relation_label: "성인", Icon: User },
  { name: "강아지", profile_type: "dog", relation_label: "강아지", Icon: Dog },
  { name: "고양이", profile_type: "cat", relation_label: "고양이", Icon: Cat },
  { name: "기타", profile_type: "other", relation_label: "기타", Icon: HelpCircle },
];

interface CreatedProfile {
  id: string;
  name: string;
  profile_type: ProfileType;
  rulesSaved: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"profile" | "rules">("profile");
  const [created, setCreated] = useState<CreatedProfile[]>([]);
  const [current, setCurrent] = useState<CreatedProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [presetType, setPresetType] = useState<ProfileType>("child");

  async function createProfile(values: ProfileFormValues) {
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
      .select("id, name, profile_type")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("프로필 생성에 실패했습니다.");
      return;
    }
    const profile: CreatedProfile = {
      id: data.id,
      name: data.name,
      profile_type: data.profile_type as ProfileType,
      rulesSaved: false,
    };
    setCreated((prev) => [...prev, profile]);
    setCurrent(profile);
    setStep("rules");
    toast.success(`${data.name} 프로필을 만들었습니다. 기준을 골라주세요.`);
  }

  async function saveRules(rules: ProfileRuleInput[]) {
    if (!current) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("profile_rules").insert(
      rules.map((r) => ({
        user_id: userData.user!.id,
        profile_id: current.id,
        rule_type: r.rule_type,
        target: r.target,
        target_label: r.target_label ?? null,
        operator: r.operator ?? null,
        threshold_value: r.threshold_value ?? null,
        unit: r.unit ?? null,
        severity: r.severity ?? "medium",
        enabled: true,
      }))
    );
    setSaving(false);
    if (error) {
      toast.error("기준 저장에 실패했습니다.");
      return;
    }
    setCreated((prev) =>
      prev.map((p) => (p.id === current.id ? { ...p, rulesSaved: true } : p))
    );
    toast.success(`${current.name}의 기준 ${rules.length}개를 저장했습니다.`);
    setCurrent(null);
    setStep("profile");
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">시작하기</h1>
        <p className="mt-1 text-sm text-slate-500">
          가족 프로필을 만들고 프로필별 식품 기준을 저장하세요. 나중에 언제든
          수정할 수 있습니다.
        </p>
      </div>

      {created.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {created.map((p) => (
            <Badge key={p.id} variant={p.rulesSaved ? "green" : "amber"}>
              {p.rulesSaved && <CheckCircle2 className="h-3 w-3" />}
              {p.name} · {PROFILE_TYPE_LABELS[p.profile_type]}
              {!p.rulesSaved && " (기준 미저장)"}
            </Badge>
          ))}
        </div>
      )}

      {step === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {created.length === 0
                ? "1단계 · 첫 가족 프로필 만들기"
                : "프로필 더 추가하기"}
            </CardTitle>
            <CardDescription>
              아래에서 유형을 고르면 기본값이 채워집니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((p) => (
                <button
                  key={p.profile_type}
                  onClick={() => setPresetType(p.profile_type)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    presetType === p.profile_type
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p.Icon className="h-4 w-4" />
                  {p.name}
                </button>
              ))}
            </div>

            <ProfileForm
              key={presetType}
              initial={{
                profile_type: presetType,
                relation_label:
                  QUICK_PRESETS.find((p) => p.profile_type === presetType)
                    ?.relation_label ?? "",
              }}
              onSubmit={createProfile}
              submitLabel="프로필 만들고 기준 고르기"
              loading={saving}
            />

            {created.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  router.push("/app");
                  router.refresh();
                }}
              >
                설정 마치고 대시보드로 이동
              </Button>
            )}
          </CardContent>
        </Card>
      ) : current ? (
        <Card>
          <CardHeader>
            <CardTitle>
              2단계 · {current.name} (
              {PROFILE_TYPE_LABELS[current.profile_type]}) 기준 고르기
            </CardTitle>
            <CardDescription>
              추천 기준을 체크박스로 선택하세요. 알레르기·피하고 싶은 원재료는
              직접 입력할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RuleTemplateSelector
              profileType={current.profile_type}
              onSave={saveRules}
              saving={saving}
            />
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                setCurrent(null);
                setStep("profile");
              }}
            >
              이 프로필은 나중에 설정하기
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
