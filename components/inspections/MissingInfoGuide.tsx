import type { RuleHit, RuleType } from "@/lib/types/food";

const HINTS: Partial<Record<RuleType | string, string>> = {
  info_required: "라벨 사진으로 채우거나, 상품 페이지의 해당 칸을 그대로 붙여넣으세요.",
  check_origin: "상품 상세의 원산지·원재료 원산지 표를 확인하거나 판매자에게 문의하세요.",
  check_nutrient: "영양성분표 사진을 찍거나, 1회 제공량 기준 숫자를 붙여넣으세요.",
  check_allergen: "알레르기 유발물질 표시와 ‘같은 시설에서 제조’ 문구를 확인하세요.",
  avoid_ingredient: "원재료명 전체를 붙여넣거나, 쿠팡이면 상품정보를 펼친 뒤 북마크릿을 쓰세요.",
  check_additive: "원재료명에서 첨가물 이름을 찾지 못했습니다. 표시를 다시 읽어 주세요.",
};

export function MissingInfoGuide({ missing }: { missing: RuleHit[] }) {
  if (missing.length === 0) return null;
  const tips = Array.from(
    new Set(missing.map((m) => HINTS[m.rule_type] ?? HINTS.info_required))
  );
  return (
    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
      <p className="font-medium">정보가 부족할 때</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
