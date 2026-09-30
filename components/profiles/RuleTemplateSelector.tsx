"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RULE_TEMPLATES, type RuleTemplate } from "@/lib/rules/default-templates";
import type { ProfileRuleInput, ProfileType } from "@/lib/types/food";

export function RuleTemplateSelector({
  profileType,
  onSave,
  saving,
  submitLabel = "선택한 기준 저장",
}: {
  profileType: ProfileType;
  onSave: (rules: ProfileRuleInput[]) => void | Promise<void>;
  saving?: boolean;
  submitLabel?: string;
}) {
  const templates = RULE_TEMPLATES[profileType] ?? RULE_TEMPLATES.other;
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(templates.map((t) => [t.key, !t.needs_target_input]))
  );
  const [targets, setTargets] = useState<Record<string, string>>({});

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function buildRules(): ProfileRuleInput[] {
    const rules: ProfileRuleInput[] = [];
    for (const t of templates) {
      if (!checked[t.key]) continue;
      const customTarget = targets[t.key]?.trim();
      if (t.needs_target_input && !customTarget) continue; // target 없으면 스킵
      rules.push({
        rule_type: t.rule_type,
        target: t.needs_target_input ? customTarget! : t.target,
        target_label: t.target_label ?? t.label,
        operator: t.operator ?? null,
        threshold_value: t.threshold_value ?? null,
        unit: t.unit ?? null,
        severity: t.severity ?? "medium",
        enabled: true,
      });
    }
    return rules;
  }

  const selectedCount = templates.filter(
    (t) =>
      checked[t.key] && (!t.needs_target_input || !!targets[t.key]?.trim())
  ).length;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {templates.map((t: RuleTemplate) => (
          <div key={t.key} className="p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={!!checked[t.key]}
                onChange={() => toggle(t.key)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{t.label}</p>
                <p className="text-xs text-slate-500">{t.description}</p>
                {t.threshold_value != null && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    기본 기준값: {t.operator} {t.threshold_value}
                    {t.unit} (저장 후 프로필에서 수정 가능)
                  </p>
                )}
              </div>
            </label>
            {t.needs_target_input && checked[t.key] && (
              <div className="mt-2 pl-7">
                <Input
                  placeholder={t.target_placeholder}
                  value={targets[t.key] ?? ""}
                  onChange={(e) =>
                    setTargets((prev) => ({ ...prev, [t.key]: e.target.value }))
                  }
                />
                <p className="mt-1 text-xs text-slate-400">
                  쉼표로 여러 개를 입력할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={saving || selectedCount === 0}
        onClick={() => onSave(buildRules())}
      >
        {saving && <Spinner />}
        {submitLabel} ({selectedCount}개)
      </Button>
    </div>
  );
}
