/** 원재료·알레르기 매칭용 동의어. 공백·대소문자 무시. */

export function foldTerm(s: string): string {
  return s.replace(/\s+/g, "").replace(/[-_]/g, "").toLowerCase();
}

/** 같은 줄의 이름은 서로 같은 대상으로 본다. */
export const SYNONYM_GROUPS: string[][] = [
  ["자일리톨", "xylitol", "e967", "자이리톨"],
  ["양파", "onion", "양파분말", "양파가루", "양파추출물", "양파농축액"],
  ["마늘", "garlic", "마늘분말", "마늘가루", "마늘추출물"],
  ["포도", "grape", "건포도", "raisin", "raisins", "포도추출물"],
  ["초콜릿", "chocolate", "카카오", "cocoa", "코코아", "카카오매스", "코코아매스"],
  ["커피", "coffee", "카페인", "caffeine", "카페인이함유"],
  ["마카다미아", "macadamia"],
  ["아보카도", "avocado"],
  ["알코올", "alcohol", "주정", "에탄올", "ethanol", "소주", "맥주", "와인"],
  ["꿀", "honey", "벌꿀", "허니"],
  ["닭고기", "계육", "닭가슴살", "닭가슴", "chicken", "치킨"],
  ["소고기", "우육", "beef", "쇠고기"],
  ["돼지고기", "돈육", "pork"],
  ["우유", "milk", "탈지분유", "전지분유", "유청", "유단백", "분유"],
  ["계란", "달걀", "난백", "난황", "egg", "eggs", "난류"],
  ["땅콩", "peanut", "peanuts", "피넛"],
  ["대두", "대두단백", "soy", "soybean", "콩단백"],
  ["밀", "밀가루", "소맥", "소맥분", "wheat", "글루텐", "gluten"],
  ["새우", "shrimp", "prawn"],
  ["호두", "walnut", "walnuts"],
  ["아몬드", "almond"],
  ["메밀", "buckwheat"],
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latinWord(n: string): boolean {
  return /^[a-z0-9]+$/.test(n);
}

function haystackHas(haystackFold: string, needle: string): boolean {
  const n = foldTerm(needle);
  if (n.length < 2) return false;
  if (latinWord(n)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(n)}([^a-z0-9]|$)`).test(
      haystackFold
    );
  }
  let from = 0;
  while (from < haystackFold.length) {
    const idx = haystackFold.indexOf(n, from);
    if (idx === -1) return false;
    const after = haystackFold.slice(idx + n.length);
    // 포도당(glucose) ≠ 포도(grape)
    if (n === "포도" && after.startsWith("당")) {
      from = idx + n.length;
      continue;
    }
    return true;
  }
  return false;
}

export function expandSynonyms(term: string): string[] {
  const folded = foldTerm(term);
  if (folded.length < 2) return [term];

  const extra = new Set<string>([term]);
  for (const group of SYNONYM_GROUPS) {
    const belongs = group.some((member) => {
      const m = foldTerm(member);
      if (m.length < 2) return false;
      return m === folded || folded.includes(m) || m.includes(folded);
    });
    if (belongs) {
      for (const g of group) extra.add(g);
    }
  }
  return Array.from(extra);
}

export function textHasTarget(haystack: string, target: string): boolean {
  if (!haystack?.trim() || !target?.trim()) return false;
  const hay = foldTerm(haystack);
  return expandSynonyms(target).some((v) => haystackHas(hay, v));
}

export function listHasTarget(list: string[], target: string): boolean {
  return list.some((item) => textHasTarget(item, target));
}
