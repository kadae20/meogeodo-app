// 개발 테스트용 샘플 상품
import type { ProductInput } from "@/lib/types/food";

export const SAMPLE_PRODUCTS: (ProductInput & { expected: string })[] = [
  {
    product_name: "어린이 비타민 젤리",
    brand_name: "샘플브랜드",
    category: "건강기능식품",
    raw_ingredients_text: "설탕, 젤라틴, 향료, 착색료",
    raw_nutrition_text: "100g당 당류 25g, 나트륨 80mg",
    raw_allergen_text: "",
    raw_origin_text: "",
    expected: "확인 필요 또는 정보 부족",
  },
  {
    product_name: "아이 쌀과자",
    brand_name: "샘플브랜드",
    category: "과자",
    raw_ingredients_text: "국내산 쌀가루, 소금",
    raw_nutrition_text: "1회 제공량 30g 당류 1g, 나트륨 80mg",
    raw_allergen_text: "우유를 사용한 제품과 같은 시설에서 제조",
    raw_origin_text: "국내산 쌀 70%",
    expected: "내 기준 통과",
  },
  {
    product_name: "강아지 간식",
    brand_name: "샘플브랜드",
    category: "반려동물 간식",
    raw_ingredients_text: "닭고기, 글리세린, xylitol, 향료",
    raw_nutrition_text: "",
    raw_allergen_text: "",
    raw_origin_text: "",
    expected: "강아지 주의 팩이면 자일리톨 동의어로 충돌",
  },
];
