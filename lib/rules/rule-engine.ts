// Rule Engine — 최종 status는 항상 이 코드가 결정한다 (Claude가 결정하지 않음)
import type {
  InspectionStatus,
  NormalizedLabelData,
  RuleEngineResult,
  RuleHit,
  RuleSeverity,
} from "@/lib/types/food";
import type { ProfileRuleRow } from "@/lib/types/database";
import { listHasTarget, textHasTarget } from "@/lib/rules/synonyms";
import { isUsefulOriginText } from "@/lib/rules/fallback-parser";
import {
  hasNutritionValues,
  NUTRIENT_VALUE_KEYS,
  type NutrientValueKey,
} from "@/lib/types/food";

export type RuleForEngine = Pick<
  ProfileRuleRow,
  | "id"
  | "rule_type"
  | "target"
  | "target_label"
  | "operator"
  | "threshold_value"
  | "unit"
  | "severity"
  | "enabled"
>;

function splitTargets(target: string): string[] {
  return target
    .split(/[,、|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function hit(
  rule: RuleForEngine,
  target: string,
  detail: string
): RuleHit {
  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    target,
    target_label: rule.target_label,
    severity: (rule.severity ?? "medium") as RuleSeverity,
    detail,
  };
}

const NUTRIENT_LABELS: Record<string, string> = {
  sugars_g: "당류",
  sodium_mg: "나트륨",
  saturated_fat_g: "포화지방",
  protein_g: "단백질",
  calories_kcal: "열량",
};

export function runRuleEngine(
  label: NormalizedLabelData,
  rules: RuleForEngine[]
): RuleEngineResult {
  const matchedRules: RuleHit[] = [];
  const warningRules: RuleHit[] = [];
  const conflictRules: RuleHit[] = [];
  const missingInfo: RuleHit[] = [];

  const hasIngredients =
    label.ingredients.length > 0 || !!label.raw_ingredients_text;
  const hasAllergenInfo =
    label.allergens.length > 0 || !!label.raw_allergen_text;
  const hasOrigin =
    label.origins.length > 0 || isUsefulOriginText(label.raw_origin_text);
  const hasNutrition = hasNutritionValues(label.nutrition);

  const ingredientHaystack = [
    ...label.ingredients,
    label.raw_ingredients_text ?? "",
  ];

  for (const rule of rules) {
    if (rule.enabled === false) continue;

    switch (rule.rule_type) {
      case "avoid_ingredient": {
        if (!hasIngredients) {
          missingInfo.push(
            hit(rule, rule.target, "원재료명 정보가 없어 이 기준을 확인할 수 없습니다.")
          );
          break;
        }
        const targets = splitTargets(rule.target);
        const found = targets.filter(
          (t) =>
            listHasTarget(label.ingredients, t) ||
            textHasTarget(label.raw_ingredients_text, t)
        );
        if (found.length > 0) {
          conflictRules.push(
            hit(rule, found.join(", "), `피하기로 한 원재료(${found.join(", ")})가 원재료명에 포함되어 있습니다.`)
          );
        } else {
          matchedRules.push(
            hit(rule, rule.target, `피하기로 한 원재료(${rule.target})가 원재료명에서 확인되지 않았습니다.`)
          );
        }
        break;
      }

      case "check_allergen": {
        if (!hasAllergenInfo && !hasIngredients) {
          missingInfo.push(
            hit(rule, rule.target, "알레르기 표시와 원재료명이 모두 없어 이 기준을 확인할 수 없습니다.")
          );
          break;
        }
        const targets = splitTargets(rule.target);
        if (targets.length === 0) {
          // target 미지정 → 알레르기 표시 존재 여부만 확인
          if (hasAllergenInfo) {
            warningRules.push(
              hit(rule, "알레르기 표시", `알레르기 표시가 있습니다: ${label.allergens.join(", ") || label.raw_allergen_text}`)
            );
          } else {
            matchedRules.push(hit(rule, "알레르기 표시", "별도 알레르기 표시가 확인되지 않았습니다."));
          }
          break;
        }
        const found = targets.filter(
          (t) =>
            listHasTarget(label.allergens, t) ||
            ingredientHaystack.some((h) => textHasTarget(h, t))
        );
        if (found.length > 0) {
          conflictRules.push(
            hit(rule, found.join(", "), `확인 대상 알레르기 성분(${found.join(", ")})이 표시에 포함되어 있습니다.`)
          );
        } else if (label.cross_contact) {
          warningRules.push(
            hit(
              rule,
              rule.target,
              `원재료·알레르기 표시에서 ${rule.target}은(는) 확인되지 않았지만, 같은 제조 시설에서 제조될 수 있다는 문구가 있습니다.`
            )
          );
        } else {
          const inRaw = targets.filter((t) =>
            textHasTarget(label.raw_allergen_text, t)
          );
          if (inRaw.length > 0) {
            conflictRules.push(
              hit(rule, inRaw.join(", "), `확인 대상 알레르기 성분(${inRaw.join(", ")})이 표시에 포함되어 있습니다.`)
            );
          } else {
            matchedRules.push(
              hit(rule, rule.target, `확인 대상 알레르기 성분(${rule.target})이 표시에서 확인되지 않았습니다.`)
            );
          }
        }
        break;
      }

      case "check_additive": {
        if (!hasIngredients) {
          missingInfo.push(
            hit(rule, rule.target, "원재료명 정보가 없어 첨가물 기준을 확인할 수 없습니다.")
          );
          break;
        }
        const targets = splitTargets(rule.target);
        const found = targets.filter((t) =>
          ingredientHaystack.some((h) => textHasTarget(h, t))
        );
        if (found.length > 0) {
          conflictRules.push(
            hit(
              rule,
              found.join(", "),
              `원재료명에서 ${found.join(", ")}이(가) 확인되어 이 프로필의 첨가물 기준과 충돌합니다.`
            )
          );
        } else {
          matchedRules.push(
            hit(rule, rule.target, "지정한 첨가물이 원재료명에서 확인되지 않았습니다.")
          );
        }
        break;
      }

      case "check_nutrient": {
        const key = rule.target;
        const nutrientLabel =
          rule.target_label ?? NUTRIENT_LABELS[key] ?? key;
        const isNutrientKey = (NUTRIENT_VALUE_KEYS as readonly string[]).includes(
          key
        );
        const rawValue = isNutrientKey
          ? label.nutrition?.[key as NutrientValueKey]
          : undefined;
        if (rawValue === undefined || rawValue === null) {
          const detail = `${nutrientLabel} 수치가 영양정보에서 확인되지 않아 기준(${rule.operator ?? "<="} ${rule.threshold_value ?? "?"}${rule.unit ?? ""})을 확인할 수 없습니다.`;
          if (hasIngredients) {
            warningRules.push(hit(rule, key, detail));
          } else {
            missingInfo.push(hit(rule, key, detail));
          }
          break;
        }
        const threshold = rule.threshold_value;
        if (threshold === null || threshold === undefined) {
          matchedRules.push(
            hit(rule, key, `${nutrientLabel} ${rawValue}${rule.unit ?? ""} 수치가 확인되었습니다 (기준값 미설정).`)
          );
          break;
        }

        const basis = label.nutrition?.basis ?? "unknown";
        const serving = label.nutrition?.serving_size_g;
        const op = rule.operator ?? "<=";
        let compareValue = rawValue;
        let basisNote = "";

        if (basis === "per_100g") {
          if (serving != null && serving > 0) {
            compareValue =
              Math.round(((rawValue * serving) / 100) * 100) / 100;
            basisNote = ` (100g당 ${rawValue} → 1회 ${serving}g 환산 ${compareValue})`;
          } else {
            warningRules.push(
              hit(
                rule,
                key,
                `${nutrientLabel} ${rawValue}${rule.unit ?? ""}는 100g(또는 100ml)당 수치입니다. 저장된 기준은 1회 제공량(${op} ${threshold}${rule.unit ?? ""})이라 바로 비교하지 않았습니다.`
              )
            );
            break;
          }
        } else if (basis === "per_serving") {
          basisNote = " (1회 제공량 기준)";
        }

        const ok = op === ">=" ? compareValue >= threshold : compareValue <= threshold;
        if (ok) {
          matchedRules.push(
            hit(rule, key, `${nutrientLabel} ${compareValue}${rule.unit ?? ""} — 기준(${op} ${threshold}${rule.unit ?? ""}) 안에 있습니다.${basisNote}`)
          );
        } else {
          conflictRules.push(
            hit(rule, key, `${nutrientLabel} ${compareValue}${rule.unit ?? ""} — 기준(${op} ${threshold}${rule.unit ?? ""})을 벗어났습니다.${basisNote}`)
          );
        }
        break;
      }

      case "check_origin": {
        if (!hasOrigin) {
          const detail = "원산지 기준이 있지만 원산지 정보가 없습니다.";
          if (hasIngredients) {
            warningRules.push(hit(rule, rule.target, detail));
          } else {
            missingInfo.push(hit(rule, rule.target, detail));
          }
          break;
        }
        const op = rule.operator ?? "exists";
        if (op === "not_contains") {
          const targets = splitTargets(rule.target);
          const found = targets.filter(
            (t) =>
              listHasTarget(label.origins, t) ||
              textHasTarget(label.raw_origin_text, t)
          );
          if (found.length > 0) {
            conflictRules.push(
              hit(rule, found.join(", "), `피하기로 한 원산지(${found.join(", ")})가 표시에 포함되어 있습니다.`)
            );
          } else {
            matchedRules.push(
              hit(rule, rule.target, "피하기로 한 원산지가 표시에서 확인되지 않았습니다.")
            );
          }
        } else if (op === "contains") {
          const targets = splitTargets(rule.target);
          const found = targets.filter(
            (t) =>
              listHasTarget(label.origins, t) ||
              textHasTarget(label.raw_origin_text, t)
          );
          if (found.length > 0) {
            matchedRules.push(
              hit(rule, found.join(", "), `기대한 원산지(${found.join(", ")})가 표시에서 확인되었습니다.`)
            );
          } else {
            warningRules.push(
              hit(rule, rule.target, `기대한 원산지(${rule.target})가 표시에서 확인되지 않았습니다. 표시된 원산지: ${label.origins.join(", ") || label.raw_origin_text}`)
            );
          }
        } else {
          matchedRules.push(
            hit(rule, "원산지", `원산지 표시가 확인되었습니다: ${label.origins.join(", ") || label.raw_origin_text}`)
          );
        }
        break;
      }

      case "info_required": {
        const field = rule.target;
        const fieldLabel = rule.target_label ?? field;
        let present = false;
        if (field === "ingredients") present = hasIngredients;
        else if (field === "origin") present = hasOrigin;
        else if (field === "nutrition") present = hasNutrition;
        else if (field === "allergen") present = hasAllergenInfo;
        else present = hasIngredients; // 기본: 원재료명 기준

        if (present) {
          matchedRules.push(
            hit(rule, field, `${fieldLabel} 정보가 표시되어 있습니다.`)
          );
        } else {
          missingInfo.push(
            hit(rule, field, `${fieldLabel} 정보가 확인되지 않습니다.`)
          );
        }
        break;
      }
    }
  }

  // 상태 우선순위: 충돌 > 정보 부족 > 확인 필요 > 통과
  let status: InspectionStatus;
  if (conflictRules.length > 0) status = "내 기준과 충돌";
  else if (missingInfo.length > 0) status = "정보 부족";
  else if (warningRules.length > 0) status = "확인 필요";
  else status = "내 기준 통과";

  const totalRules =
    matchedRules.length +
    warningRules.length +
    conflictRules.length +
    missingInfo.length;
  const verifiable = totalRules - missingInfo.length;
  const base = totalRules === 0 ? 0.3 : verifiable / totalRules;
  const confidenceScore =
    Math.round((0.4 * (label.confidence_score ?? 0) + 0.6 * base) * 100) / 100;

  const seedParts: string[] = [];
  if (conflictRules.length > 0)
    seedParts.push(`충돌 ${conflictRules.length}건: ${conflictRules.map((r) => r.detail).join(" / ")}`);
  if (missingInfo.length > 0)
    seedParts.push(`정보 부족 ${missingInfo.length}건: ${missingInfo.map((r) => r.detail).join(" / ")}`);
  if (warningRules.length > 0)
    seedParts.push(`확인 필요 ${warningRules.length}건: ${warningRules.map((r) => r.detail).join(" / ")}`);
  if (matchedRules.length > 0)
    seedParts.push(`기준 안 ${matchedRules.length}건`);

  return {
    status,
    matchedRules,
    warningRules,
    conflictRules,
    missingInfo,
    confidenceScore,
    explanationSeed: seedParts.join(" | ") || "설정된 기준이 없습니다.",
  };
}
