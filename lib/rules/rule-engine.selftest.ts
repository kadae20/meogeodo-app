import { runRuleEngine } from "./rule-engine";
import { fallbackParse } from "./fallback-parser";
import { textHasTarget } from "./synonyms";
import { parseCoupangUrl, aliasesFromUrl } from "@/lib/products/aliases";
import { publicSearchName } from "@/lib/products/public-nutri";
import { harvestFromPageText } from "@/lib/products/listing-extract";
import { inferProductAudience, profileFitsAudience } from "@/lib/products/audience";
import type { RuleForEngine } from "./rule-engine";

function rule(
  partial: Partial<RuleForEngine> & Pick<RuleForEngine, "rule_type" | "target">
): RuleForEngine {
  return {
    id: "t",
    target_label: null,
    operator: "contains",
    threshold_value: null,
    unit: null,
    severity: "high",
    enabled: true,
    ...partial,
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

export function runRuleEngineSelfTests() {
  assert(textHasTarget("xylitol, glycerin", "자일리톨"), "xylitol ≈ 자일리톨");
  assert(!textHasTarget("포도당액", "포도"), "포도당 ≠ 포도");

  const xylitol = fallbackParse({
    raw_ingredients_text: "chicken, xylitol, flavor",
  });
  const dog = runRuleEngine(xylitol, [
    rule({
      rule_type: "avoid_ingredient",
      target: "자일리톨",
    }),
  ]);
  assert(dog.status === "내 기준과 충돌", "자일리톨 동의어 충돌");

  const per100 = fallbackParse({
    raw_nutrition_text: "100g당 당류 25g",
  });
  const sugars = runRuleEngine(per100, [
    rule({
      rule_type: "check_nutrient",
      target: "sugars_g",
      operator: "<=",
      threshold_value: 10,
      unit: "g",
      severity: "medium",
    }),
  ]);
  assert(sugars.status === "확인 필요", "100g당은 바로 충돌하지 않음");

  const facility = fallbackParse({
    raw_ingredients_text: "쌀가루",
    raw_allergen_text: "우유를 사용한 제품과 같은 시설에서 제조",
  });
  assert(facility.cross_contact === true, "동일 시설 문구 감지");
  const allergen = runRuleEngine(facility, [
    rule({ rule_type: "check_allergen", target: "우유" }),
  ]);
  assert(allergen.status === "확인 필요", "교차오염은 확인 필요");

  const coupang = parseCoupangUrl(
    "https://www.coupang.com/vp/products/9196219302?itemId=27145693972&vendorItemId=94123063130&q=foo"
  );
  assert(coupang?.productId === "9196219302", "쿠팡 productId");
  assert(coupang?.itemId === "27145693972", "쿠팡 itemId");
  const aliases = aliasesFromUrl(
    "https://www.coupang.com/vp/products/9196219302?itemId=27145693972&vendorItemId=94123063130"
  );
  assert(
    aliases.some((a) => a.kind === "coupang_item" && a.value === "27145693972"),
    "쿠팡 item alias"
  );

  assert(
    publicSearchName("[농심] 신라면 120g - 쿠팡") === "신라면 120g",
    "공공DB 검색명"
  );
  assert(
    publicSearchName("coupang.com 상품") === null,
    "가짜 상품명 제외"
  );

  const jellyText = `원재료명
정제수, 양배추농축액(양배추추출액(정제수, 양배추(국내산)), 케일추출액(정제수, 케일(국내산)), 사과농축액(사과/국내산)), 혼합제제(로커스트콩검, 잔탄검, 포도당, 한천, 타마린드검), 향료, 꾸지뽕잎추출분말, 효소처리스테비아(감미료), 수크랄로스(감미료)
우유, 대두 함유
영양정보 1포(20g) 당 10Kcal 나트륨 11mg 당류 1g 미만 포화지방 0g`;
  const jelly = fallbackParse({
    raw_ingredients_text: jellyText,
    raw_nutrition_text: jellyText,
  });
  assert(jelly.allergens.some((a) => a.includes("우유") || a === "우유"), "함유→우유");
  assert(jelly.origins.includes("국내산"), "국내산 원산지");
  assert((jelly.nutrition.sugars_g ?? 99) <= 1, "1g 미만 당류");
  assert((jelly.nutrition.sodium_mg ?? 0) === 11, "1포 나트륨");
  const adult = runRuleEngine(jelly, [
    rule({
      rule_type: "check_nutrient",
      target: "sugars_g",
      operator: "<=",
      threshold_value: 10,
      unit: "g",
      severity: "medium",
    }),
    rule({
      rule_type: "check_nutrient",
      target: "sodium_mg",
      operator: "<=",
      threshold_value: 300,
      unit: "mg",
      severity: "medium",
    }),
    rule({
      rule_type: "info_required",
      target: "ingredients",
    }),
    rule({
      rule_type: "check_origin",
      target: "origin",
      operator: "exists",
    }),
  ]);
  assert(adult.status === "내 기준 통과", "성인 기본 기준은 통과");
  const adultIngOnly = runRuleEngine(
    fallbackParse({
      raw_ingredients_text: "정제수, 양배추농축액, 향료",
    }),
    [
      rule({
        rule_type: "check_nutrient",
        target: "sugars_g",
        operator: "<=",
        threshold_value: 10,
        unit: "g",
        severity: "medium",
      }),
      rule({
        rule_type: "check_origin",
        target: "origin",
        operator: "exists",
      }),
      rule({ rule_type: "info_required", target: "ingredients" }),
    ]
  );
  assert(
    adultIngOnly.status === "확인 필요",
    "원재료는 있고 영양·원산지만 없으면 부족이 아님"
  );
  const dogOk = runRuleEngine(jelly, [
    rule({
      rule_type: "avoid_ingredient",
      target:
        "자일리톨,양파,마늘,포도,건포도,초콜릿,카카오,마카다미아,아보카도,알코올,커피",
    }),
  ]);
  assert(dogOk.status === "내 기준 통과", "독성 팩만 보면 통과(급여 가능 아님)");

  const coupangChrome = `원산지 표시가 확인되었습니다: 상품 상세설명 참조 1, 464 개 상품평 한 달간 7, 000명 이상 구매했어요 19% 35, 000원 28, 100원 와우할인 14개 28, 050원 무료배송 내일(월) 새벽 7시 전 도착 보장 다른 판매자 보기(3), 국내산`;
  const chromeParsed = fallbackParse({ raw_origin_text: coupangChrome });
  assert(chromeParsed.origins.join(",") === "국내산", "원산지는 국내산만");
  assert(!/상품평|와우할인/.test(chromeParsed.raw_origin_text), "원산지에 상품평 없음");

  const tableNutri = fallbackParse({
    raw_nutrition_text:
      "영양정보 1회 제공량 30g 열량 120kcal 나트륨(mg) 200 당류(g) 8 포화지방(g) 1.5 내용량 100g",
  });
  assert(tableNutri.nutrition.sugars_g === 8, "표 당류");
  assert(tableNutri.nutrition.sodium_mg === 200, "표 나트륨");
  assert(tableNutri.nutrition.saturated_fat_g === 1.5, "표 포화지방");
  assert(tableNutri.nutrition.basis === "per_serving", "내용량 100g이어도 1회 제공");

  const harvested = harvestFromPageText(
    `${coupangChrome}\n원재료명 양배추(국내산), 정제수\n영양정보 1회 제공량 20g 나트륨 11mg 당류 1g 포화지방 0g`
  );
  assert(harvested.raw_origin_text === "국내산", "수확 원산지");
  assert(/당류 1g/.test(harvested.raw_nutrition_text), "수확 영양");

  assert(
    inferProductAudience({ product_name: "양배추 젤리 스틱" }) === "human",
    "젤리=사람 식품"
  );
  assert(
    inferProductAudience({ product_name: "강아지 사료 2kg" }) === "dog",
    "사료=강아지"
  );
  assert(profileFitsAudience("dog", "human") === false, "사람 식품에 개 제외");
  assert(profileFitsAudience("adult", "dog") === false, "사료에 성인 제외");

  const almond = fallbackParse({
    raw_ingredients_text:
      "아몬드액 95%(아몬드고형분 2.1% 이상, 미국 캘리포니아산), 정제수, 식염(국산), 영양강화제 3종, 산도조절제, 유화제, 절란검, 향료",
    raw_nutrition_text:
      "영양정보 총 내용량 190 mL / 30 kcal 나트륨 140 mg(7%) 탄수화물 0.8 g(0%) 당류 0.2 g(0%) 지방 2.3 g(4%) 트랜스지방 0 g 포화지방 0.2 g(1%)",
  });
  assert(almond.nutrition.sugars_g === 0.2, "아몬드 당류");
  assert(almond.nutrition.sodium_mg === 140, "아몬드 나트륨");
  assert(almond.nutrition.saturated_fat_g === 0.2, "아몬드 포화지방");
  assert(almond.origins.includes("국산"), "식염 국산");
  const almondChild = runRuleEngine(almond, [
    rule({
      rule_type: "check_nutrient",
      target: "sugars_g",
      operator: "<=",
      threshold_value: 10,
      unit: "g",
      severity: "medium",
    }),
    rule({
      rule_type: "check_nutrient",
      target: "sodium_mg",
      operator: "<=",
      threshold_value: 300,
      unit: "mg",
      severity: "medium",
    }),
    rule({
      rule_type: "check_additive",
      target: "향료,착색료,감미료,보존료,산도조절제,발색제",
      severity: "medium",
    }),
    rule({ rule_type: "info_required", target: "ingredients" }),
    rule({
      rule_type: "check_origin",
      target: "origin",
      operator: "exists",
    }),
  ]);
  assert(almondChild.status === "내 기준과 충돌", "향료·산도조절제는 검수 결과 충돌");
  assert(
    almondChild.conflictRules.some((h) => /향료|산도조절제/.test(h.detail)),
    "충돌 이유는 첨가물"
  );
  assert(
    !almondChild.warningRules.some((h) => /수치가 영양정보에서 확인되지/.test(h.detail)),
    "영양 숫자는 읽힘"
  );

  return { ok: true as const, cases: 33 };
}

if (process.env.RUN_SELFTEST === "1") {
  runRuleEngineSelfTests();
  // eslint-disable-next-line no-console
  console.log("rule-engine selftest ok");
}
