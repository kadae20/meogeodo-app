// 프로필 타입별 추천 기준 템플릿
import type { ProfileRuleInput, ProfileType } from "@/lib/types/food";

export interface RuleTemplate extends ProfileRuleInput {
  /** 템플릿 식별 키 */
  key: string;
  /** 체크박스에 표시할 이름 */
  label: string;
  /** 부가 설명 */
  description: string;
  /** target을 사용자가 입력해야 하는지 */
  needs_target_input?: boolean;
  /** target 입력 placeholder */
  target_placeholder?: string;
}

const COMMON: Record<string, RuleTemplate> = {
  allergen: {
    key: "allergen",
    label: "알레르기 성분 확인",
    description: "지정한 알레르기 성분이 표시에 포함되어 있는지 확인",
    rule_type: "check_allergen",
    target: "",
    needs_target_input: true,
    target_placeholder: "예: 우유, 땅콩, 계란 (쉼표로 구분)",
    operator: "contains",
    severity: "high",
  },
  avoid: {
    key: "avoid",
    label: "피하고 싶은 원재료 확인",
    description: "원재료명에 지정한 재료가 포함되면 충돌로 표시",
    rule_type: "avoid_ingredient",
    target: "",
    needs_target_input: true,
    target_placeholder: "예: 말티톨, 수크랄로스, 닭고기 (쉼표로 구분)",
    operator: "contains",
    severity: "high",
  },
  additive: {
    key: "additive",
    label: "첨가물 확인",
    description:
      "지정한 첨가물이 원재료명에 있으면 내 기준과 충돌로 표시합니다. 표시만 보고 사람이 다시 확인하지 않습니다.",
    rule_type: "check_additive",
    target: "향료,착색료,감미료,보존료,산도조절제,발색제",
    target_label: "주요 첨가물",
    operator: "contains",
    severity: "medium",
  },
  sugars: {
    key: "sugars",
    label: "당류 확인",
    description: "1회 제공량 기준 당류가 기준값을 넘는지 확인. 100g당만 있으면 바로 충돌시키지 않습니다.",
    rule_type: "check_nutrient",
    target: "sugars_g",
    target_label: "당류",
    operator: "<=",
    threshold_value: 10,
    unit: "g",
    severity: "medium",
  },
  sodium: {
    key: "sodium",
    label: "나트륨 확인",
    description: "1회 제공량 기준 나트륨이 기준값을 넘는지 확인. 100g당만 있으면 바로 충돌시키지 않습니다.",
    rule_type: "check_nutrient",
    target: "sodium_mg",
    target_label: "나트륨",
    operator: "<=",
    threshold_value: 300,
    unit: "mg",
    severity: "medium",
  },
  saturated_fat: {
    key: "saturated_fat",
    label: "포화지방 확인",
    description: "1회 제공량 기준 포화지방이 기준값을 넘는지 확인. 100g당만 있으면 바로 충돌시키지 않습니다.",
    rule_type: "check_nutrient",
    target: "saturated_fat_g",
    target_label: "포화지방",
    operator: "<=",
    threshold_value: 5,
    unit: "g",
    severity: "medium",
  },
  ingredients_required: {
    key: "ingredients_required",
    label: "원재료명 확인",
    description: "원재료명 표시가 없으면 정보 부족으로 표시",
    rule_type: "info_required",
    target: "ingredients",
    target_label: "원재료명",
    operator: "exists",
    severity: "medium",
  },
  origin_required: {
    key: "origin_required",
    label: "원산지 확인",
    description: "원산지 표시가 없으면 정보 부족으로 표시",
    rule_type: "check_origin",
    target: "origin",
    target_label: "원산지",
    operator: "exists",
    severity: "medium",
  },
  info_required: {
    key: "info_required",
    label: "정보 부족 여부 확인",
    description: "원재료명·원산지 등 핵심 정보가 없으면 정보 부족으로 표시",
    rule_type: "info_required",
    target: "ingredients",
    target_label: "핵심 표시 정보",
    operator: "exists",
    severity: "medium",
  },
  protein_source: {
    key: "protein_source",
    label: "단백질 원료 확인",
    description: "주 단백질 원료가 원재료명에 표시되어 있는지 확인",
    rule_type: "info_required",
    target: "ingredients",
    target_label: "단백질 원료",
    operator: "exists",
    severity: "medium",
  },
  child_caution: {
    key: "child_caution",
    label: "아이 주의 원재료 (꿀·카페인)",
    description:
      "꿀·벌꿀·카페인·커피가 표시에 있으면 충돌로 표시합니다. 영어 표기(honey, caffeine)도 같은 대상으로 봅니다.",
    rule_type: "avoid_ingredient",
    target: "꿀,카페인,커피",
    target_label: "아이 주의 원재료",
    operator: "contains",
    severity: "high",
  },
  dog_toxic: {
    key: "dog_toxic",
    label: "강아지 주의 원재료 팩",
    description:
      "자일리톨, 양파, 마늘, 포도·건포도, 초콜릿·카카오, 마카다미아, 아보카도, 알코올, 커피. 영어·E번호 표기도 같은 대상으로 봅니다. 수의학 판단이 아닙니다.",
    rule_type: "avoid_ingredient",
    target:
      "자일리톨,양파,마늘,포도,건포도,초콜릿,카카오,마카다미아,아보카도,알코올,커피",
    target_label: "강아지 주의 원재료",
    operator: "contains",
    severity: "high",
  },
  cat_toxic: {
    key: "cat_toxic",
    label: "고양이 주의 원재료 팩",
    description:
      "양파, 마늘, 포도, 초콜릿·카카오, 커피, 알코올. 영어 표기도 같은 대상으로 봅니다. 수의학 판단이 아닙니다.",
    rule_type: "avoid_ingredient",
    target: "양파,마늘,포도,초콜릿,카카오,커피,알코올",
    target_label: "고양이 주의 원재료",
    operator: "contains",
    severity: "high",
  },
};

export const RULE_TEMPLATES: Record<ProfileType, RuleTemplate[]> = {
  child: [
    COMMON.allergen,
    COMMON.child_caution,
    COMMON.additive,
    COMMON.sugars,
    COMMON.sodium,
    COMMON.ingredients_required,
    COMMON.origin_required,
  ],
  adult: [
    COMMON.sugars,
    COMMON.sodium,
    COMMON.saturated_fat,
    COMMON.ingredients_required,
    COMMON.origin_required,
    COMMON.avoid,
  ],
  dog: [
    COMMON.dog_toxic,
    COMMON.allergen,
    COMMON.avoid,
    COMMON.additive,
    COMMON.origin_required,
    COMMON.info_required,
  ],
  cat: [
    COMMON.cat_toxic,
    COMMON.allergen,
    COMMON.protein_source,
    COMMON.additive,
    COMMON.origin_required,
    COMMON.info_required,
  ],
  other: [
    COMMON.ingredients_required,
    COMMON.allergen,
    COMMON.avoid,
    COMMON.origin_required,
  ],
};
