// 먹어도될까 — 도메인 타입

export type ProfileType = "child" | "adult" | "dog" | "cat" | "other";

export type RuleType =
  | "check_allergen"
  | "avoid_ingredient"
  | "check_additive"
  | "check_nutrient"
  | "check_origin"
  | "info_required";

export type RuleOperator = "<=" | ">=" | "contains" | "not_contains" | "exists";

export type RuleSeverity = "low" | "medium" | "high";

/** 검수 결과 상태 — 이 4개 외 다른 표현 사용 금지 */
export type InspectionStatus =
  | "내 기준 통과"
  | "확인 필요"
  | "내 기준과 충돌"
  | "정보 부족";

export const INSPECTION_STATUSES: InspectionStatus[] = [
  "내 기준 통과",
  "확인 필요",
  "내 기준과 충돌",
  "정보 부족",
];

export type NutritionBasis = "per_serving" | "per_100g" | "unknown";

export const NUTRIENT_VALUE_KEYS = [
  "sugars_g",
  "sodium_mg",
  "saturated_fat_g",
  "protein_g",
  "calories_kcal",
] as const;

export type NutrientValueKey = (typeof NUTRIENT_VALUE_KEYS)[number];

export interface NutritionInfo {
  sugars_g?: number | null;
  sodium_mg?: number | null;
  saturated_fat_g?: number | null;
  protein_g?: number | null;
  calories_kcal?: number | null;
  /** 수치가 1회 제공량 기준인지, 100g/100ml당인지 */
  basis?: NutritionBasis;
  /** 1회 제공량 무게(g). 100g당 → 1회 환산에 사용 */
  serving_size_g?: number | null;
}

export function hasNutritionValues(n: NutritionInfo | undefined): boolean {
  if (!n) return false;
  return NUTRIENT_VALUE_KEYS.some((k) => n[k] != null);
}

/** 당류·나트륨·포화지방처럼 프로필 기준과 비교할 숫자가 있는지 */
export function hasComparableNutrition(n: NutritionInfo | undefined): boolean {
  if (!n) return false;
  return n.sugars_g != null || n.sodium_mg != null || n.saturated_fat_g != null;
}

export interface LabelQuality {
  has_ingredients: boolean;
  has_nutrition: boolean;
  has_allergen: boolean;
  has_origin: boolean;
}

export interface NormalizedLabelData {
  raw_ingredients_text: string;
  raw_nutrition_text: string;
  raw_allergen_text: string;
  raw_origin_text: string;
  ingredients: string[];
  allergens: string[];
  origins: string[];
  nutrition: NutritionInfo;
  label_quality: LabelQuality;
  confidence_score: number;
  /** 파싱에 사용된 방법 */
  parsed_by: "claude" | "fallback";
  /** 같은 시설 제조·교차오염 문구 여부 */
  cross_contact?: boolean;
}

export interface ProfileRuleInput {
  id?: string;
  rule_type: RuleType;
  target: string;
  target_label?: string | null;
  operator?: RuleOperator | null;
  threshold_value?: number | null;
  unit?: string | null;
  severity?: RuleSeverity;
  enabled?: boolean;
}

export interface RuleHit {
  rule_id?: string;
  rule_type: RuleType;
  target: string;
  target_label?: string | null;
  severity: RuleSeverity;
  detail: string;
}

export interface RuleEngineResult {
  status: InspectionStatus;
  matchedRules: RuleHit[];
  warningRules: RuleHit[];
  conflictRules: RuleHit[];
  missingInfo: RuleHit[];
  confidenceScore: number;
  explanationSeed: string;
}

export interface ProductInput {
  product_url?: string;
  product_name: string;
  brand_name?: string;
  category?: string;
  raw_ingredients_text?: string;
  raw_nutrition_text?: string;
  raw_allergen_text?: string;
  raw_origin_text?: string;
  barcode?: string;
  /** 북마크릿이 상품 페이지에서 가져온 본문. 저장하지 않음 */
  page_text?: string;
}

export interface InspectionSummary {
  pass: number;
  check_needed: number;
  conflict: number;
  insufficient: number;
}

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  check_allergen: "알레르기 성분 확인",
  avoid_ingredient: "피하고 싶은 원재료",
  check_additive: "첨가물 확인",
  check_nutrient: "영양성분 확인",
  check_origin: "원산지 확인",
  info_required: "정보 표시 확인",
};

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  child: "아이",
  adult: "성인",
  dog: "강아지",
  cat: "고양이",
  other: "기타",
};

export const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};
