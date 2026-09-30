// Supabase 테이블 row 타입
import type {
  InspectionStatus,
  NutritionInfo,
  ProfileType,
  RuleHit,
  RuleOperator,
  RuleSeverity,
  RuleType,
  LabelQuality,
  InspectionSummary,
} from "./food";

export interface UserProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyProfileRow {
  id: string;
  user_id: string;
  name: string;
  profile_type: ProfileType;
  relation_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRuleRow {
  id: string;
  user_id: string;
  profile_id: string;
  rule_type: RuleType;
  target: string;
  target_label: string | null;
  operator: RuleOperator | null;
  threshold_value: number | null;
  unit: string | null;
  severity: RuleSeverity;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  country_code: string;
  retailer: string | null;
  product_url: string | null;
  product_name: string;
  brand_name: string | null;
  category: string | null;
  image_url: string | null;
  barcode: string | null;
  current_normalized_label_id: string | null;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NormalizedLabelRow {
  id: string;
  product_id: string;
  country_code: string;
  language: string;
  raw_ingredients_text: string | null;
  raw_nutrition_text: string | null;
  raw_allergen_text: string | null;
  raw_origin_text: string | null;
  nutrition_json: NutritionInfo;
  ingredients_json: string[];
  allergens_json: string[];
  origins_json: string[];
  label_quality_json: LabelQuality | Record<string, never>;
  confidence_score: number;
  created_at: string;
}

export interface ProductAliasRow {
  id: string;
  product_id: string;
  kind: "barcode" | "coupang_item" | "coupang_vendor_item" | "coupang_product" | "url";
  value: string;
  created_at: string;
}

export interface InspectionRow {
  id: string;
  user_id: string;
  inspection_type: "single_product" | "cart_manual";
  title: string | null;
  total_products: number;
  summary_json: InspectionSummary | Record<string, never>;
  share_token: string | null;
  created_at: string;
}

export interface InspectionProductRow {
  id: string;
  inspection_id: string;
  product_id: string | null;
  normalized_label_id: string | null;
  created_at: string;
}

export interface InspectionResultRow {
  id: string;
  inspection_id: string;
  inspection_product_id: string;
  user_id: string;
  product_id: string | null;
  profile_id: string | null;
  status: InspectionStatus;
  matched_rules_json: RuleHit[];
  warning_rules_json: RuleHit[];
  conflict_rules_json: RuleHit[];
  missing_info_json: RuleHit[];
  explanation: string | null;
  confidence_score: number;
  created_at: string;
}

export interface WhitelistItemRow {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  note: string | null;
  created_at: string;
}

export interface HouseholdRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}
