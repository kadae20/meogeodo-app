import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResultBadge } from "./ResultBadge";
import type { ProductResultView } from "./ProductResultTable";

export function CartResultMatrix({ products }: { products: ProductResultView[] }) {
  const profiles = profilesFrom(products);
  if (products.length === 0 || profiles.length === 0) return null;
  if (products.length < 2 && profiles.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>가족 × 상품</CardTitle>
        <CardDescription>
          한눈에 보는 검수 결과입니다. 칸을 누르면 아래 상세로 이동합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 font-medium text-slate-500">상품</th>
              {profiles.map((p) => (
                <th key={p.id} className="px-3 py-2.5 font-medium text-slate-700">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product, i) => (
              <tr key={product.productId ?? i}>
                <td className="max-w-[12rem] truncate px-4 py-2.5 font-medium text-slate-900">
                  <a href={`#product-${i}`} className="hover:text-emerald-700">
                    {product.productName}
                  </a>
                </td>
                {profiles.map((p) => {
                  const result = product.results.find((r) => r.profileId === p.id);
                  return (
                    <td key={p.id} className="px-3 py-2.5">
                      {result ? (
                        <a href={`#product-${i}`}>
                          <ResultBadge status={result.status} />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function profilesFrom(products: ProductResultView[]) {
  const seen = new Map<string, { id: string; name: string }>();
  for (const product of products) {
    for (const r of product.results) {
      if (r.profileId && !seen.has(r.profileId)) {
        seen.set(r.profileId, { id: r.profileId, name: r.profileName });
      }
    }
  }
  return Array.from(seen.values());
}
