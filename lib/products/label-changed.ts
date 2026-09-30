import type { NormalizedLabelRow } from "@/lib/types/database";

export function detectLabelChanges(
  labels: Pick<NormalizedLabelRow, "product_id" | "ingredients_json">[]
): Set<string> {
  const firstTwo = new Map<string, string[]>();
  for (const row of labels) {
    const arr = firstTwo.get(row.product_id) ?? [];
    if (arr.length < 2) arr.push(JSON.stringify(row.ingredients_json ?? []));
    firstTwo.set(row.product_id, arr);
  }
  const changed = new Set<string>();
  for (const [id, arr] of Array.from(firstTwo.entries())) {
    if (arr.length >= 2 && arr[0] !== arr[1]) changed.add(id);
  }
  return changed;
}
