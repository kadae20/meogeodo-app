export function detectCrossContact(...texts: (string | undefined | null)[]): boolean {
  const blob = texts.filter(Boolean).join(" ");
  if (!blob.trim()) return false;
  return /같은\s*(제조\s*)?시설|동일\s*시설|교차\s*오염|혼입\s*(가능|우려)|사용한 제품과 같은/.test(
    blob
  );
}
