import type { ProfileType } from "@/lib/types/food";

export type ProductAudience = "human" | "dog" | "cat" | "pet" | "unknown";

function hay(parts: Array<string | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const DOG = /강아지|반려견|개사료|독.?푸드|\bdog\b|\bpuppy\b|강아지용|애견/;
const CAT = /고양이|반려묘|캣푸드|캣.?푸드|\bcat\b|\bkitty\b|고양이용/;
const PET = /반려동물|펫푸드|펫.?푸드|펫간식|동물용\s*사료|(?:^|[\s\[(])사료(?:$|[\s)\]])/;

/** 제목·분류·본문으로 사람식품 / 반려동물용을 가른다. 확실하지 않으면 unknown. */
export function inferProductAudience(input: {
  product_name?: string;
  category?: string;
  product_url?: string;
  text?: string;
}): ProductAudience {
  const s = hay([
    input.product_name,
    input.category,
    input.product_url,
    input.text?.slice(0, 2500),
  ]);
  if (!s.trim()) return "unknown";
  const dog = DOG.test(s);
  const cat = CAT.test(s);
  if (dog && !cat) return "dog";
  if (cat && !dog) return "cat";
  if (dog && cat) return "pet";
  if (PET.test(s)) return "pet";
  return "human";
}

export function profileFitsAudience(
  type: ProfileType,
  audience: ProductAudience
): boolean {
  if (audience === "unknown") return true;
  if (type === "other") return true;
  const human = type === "child" || type === "adult";
  if (audience === "human") return human;
  if (audience === "dog") return type === "dog";
  if (audience === "cat") return type === "cat";
  if (audience === "pet") return type === "dog" || type === "cat";
  return true;
}

export function audienceSkipLabel(
  type: ProfileType,
  audience: ProductAudience
): string {
  if (audience === "human" && (type === "dog" || type === "cat")) {
    return "사람 식품";
  }
  if (
    (audience === "dog" || audience === "cat" || audience === "pet") &&
    (type === "adult" || type === "child")
  ) {
    return "반려동물용";
  }
  return "대상 아님";
}
