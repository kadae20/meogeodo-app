"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  RULE_TYPE_LABELS,
  SEVERITY_LABELS,
  type ProfileRuleInput,
  type RuleType,
  type RuleSeverity,
  type RuleOperator,
} from "@/lib/types/food";
import type { ProfileRuleRow } from "@/lib/types/database";

const schema = z.object({
  rule_type: z.enum([
    "check_allergen",
    "avoid_ingredient",
    "check_additive",
    "check_nutrient",
    "check_origin",
    "info_required",
  ]),
  target: z.string().optional(),
  target_label: z.string().optional(),
  operator: z.enum(["<=", ">=", "contains", "not_contains", "exists"]).optional(),
  threshold_value: z.string().optional(),
  unit: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]),
});

type FormValues = z.infer<typeof schema>;

const NUTRIENT_OPTIONS = [
  { value: "sugars_g", label: "당류 (g)", unit: "g" },
  { value: "sodium_mg", label: "나트륨 (mg)", unit: "mg" },
  { value: "saturated_fat_g", label: "포화지방 (g)", unit: "g" },
  { value: "protein_g", label: "단백질 (g)", unit: "g" },
  { value: "calories_kcal", label: "열량 (kcal)", unit: "kcal" },
];

const INFO_FIELD_OPTIONS = [
  { value: "ingredients", label: "원재료명" },
  { value: "origin", label: "원산지" },
  { value: "nutrition", label: "영양정보" },
  { value: "allergen", label: "알레르기 표시" },
];

export function RuleEditor({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<ProfileRuleRow>;
  onSubmit: (values: ProfileRuleInput) => void | Promise<void>;
  loading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rule_type: (initial?.rule_type as RuleType) ?? "avoid_ingredient",
      target: initial?.target ?? "",
      target_label: initial?.target_label ?? "",
      operator: (initial?.operator as RuleOperator) ?? undefined,
      threshold_value:
        initial?.threshold_value != null ? String(initial.threshold_value) : "",
      unit: initial?.unit ?? "",
      severity: (initial?.severity as RuleSeverity) ?? "medium",
    },
  });

  const ruleType = watch("rule_type");
  const [nutrientKey, setNutrientKey] = useState(
    initial?.target && NUTRIENT_OPTIONS.some((o) => o.value === initial.target)
      ? initial.target
      : "sugars_g"
  );

  function submit(values: FormValues) {
    const isNutrient = values.rule_type === "check_nutrient";
    if (!isNutrient && !values.target?.trim()) {
      setError("target", { message: "확인할 대상을 입력해주세요." });
      return;
    }
    const isInfo =
      values.rule_type === "info_required" ||
      (values.rule_type === "check_origin" &&
        (!values.operator || values.operator === "exists"));

    const thresholdNum =
      values.threshold_value && values.threshold_value.trim() !== ""
        ? Number(values.threshold_value)
        : null;

    const rule: ProfileRuleInput = {
      rule_type: values.rule_type,
      target: isNutrient ? nutrientKey : values.target!.trim(),
      target_label:
        values.target_label?.trim() ||
        (isNutrient
          ? NUTRIENT_OPTIONS.find((o) => o.value === nutrientKey)?.label ?? null
          : null),
      operator: isNutrient
        ? ((values.operator === ">=" ? ">=" : "<=") as RuleOperator)
        : isInfo
          ? "exists"
          : ((values.operator ?? "contains") as RuleOperator),
      threshold_value: isNutrient ? thresholdNum : null,
      unit: isNutrient
        ? values.unit ||
          NUTRIENT_OPTIONS.find((o) => o.value === nutrientKey)?.unit ||
          null
        : null,
      severity: values.severity,
      enabled: initial?.enabled ?? true,
    };
    return onSubmit(rule);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>기준 종류</Label>
        <Select {...register("rule_type")}>
          {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
            <option key={t} value={t}>
              {RULE_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      {ruleType === "check_nutrient" ? (
        <>
          <div className="space-y-1.5">
            <Label>영양성분</Label>
            <Select
              value={nutrientKey}
              onChange={(e) => {
                setNutrientKey(e.target.value);
                const opt = NUTRIENT_OPTIONS.find(
                  (o) => o.value === e.target.value
                );
                if (opt) setValue("unit", opt.unit);
              }}
            >
              {NUTRIENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>조건</Label>
              <Select {...register("operator")}>
                <option value="<=">이하 (&le;)</option>
                <option value=">=">이상 (&ge;)</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>기준값</Label>
              <Input
                type="number"
                step="any"
                placeholder="예: 10"
                {...register("threshold_value")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>단위</Label>
              <Input {...register("unit")} />
            </div>
          </div>
        </>
      ) : ruleType === "info_required" ? (
        <div className="space-y-1.5">
          <Label>필수로 표시되어야 하는 정보</Label>
          <Select {...register("target")}>
            {INFO_FIELD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ) : ruleType === "check_origin" ? (
        <>
          <div className="space-y-1.5">
            <Label>조건</Label>
            <Select {...register("operator")}>
              <option value="exists">원산지 표시 있는지 확인</option>
              <option value="contains">특정 원산지가 있어야 함</option>
              <option value="not_contains">특정 원산지 피하기</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>대상 (exists면 &quot;origin&quot; 그대로 두세요)</Label>
            <Input
              placeholder="예: 국내산 / 특정 국가명"
              {...register("target")}
            />
            {errors.target && (
              <p className="text-xs text-red-600">{errors.target.message}</p>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label>확인할 대상 (쉼표로 여러 개)</Label>
          <Input
            placeholder="예: 우유, 땅콩, 말티톨, 향료"
            {...register("target")}
          />
          {errors.target && (
            <p className="text-xs text-red-600">{errors.target.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>표시 이름 (선택)</Label>
          <Input placeholder="예: 우유 알레르기" {...register("target_label")} />
        </div>
        <div className="space-y-1.5">
          <Label>중요도</Label>
          <Select {...register("severity")}>
            {(Object.keys(SEVERITY_LABELS) as RuleSeverity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
                {s === "high" ? " (충돌로 처리)" : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Spinner />}
        기준 저장
      </Button>
    </form>
  );
}
