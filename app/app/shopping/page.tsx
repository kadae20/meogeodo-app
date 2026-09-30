"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, ExternalLink, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PROFILE_TYPE_LABELS } from "@/lib/types/food";
import type {
  FamilyProfileRow,
  ProductRow,
  WhitelistItemRow,
  NormalizedLabelRow,
} from "@/lib/types/database";
import { detectLabelChanges } from "@/lib/products/label-changed";

export default function ShoppingPage() {
  const supabase = createClient();
  const [items, setItems] = useState<WhitelistItemRow[]>([]);
  const [profiles, setProfiles] = useState<FamilyProfileRow[]>([]);
  const [products, setProducts] = useState<Map<string, ProductRow>>(new Map());
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, profilesRes] = await Promise.all([
      supabase.from("whitelist_items").select("*").order("created_at", { ascending: false }),
      supabase.from("family_profiles").select("*").order("created_at"),
    ]);
    const list = (itemsRes.data ?? []) as WhitelistItemRow[];
    setItems(list);
    setProfiles((profilesRes.data ?? []) as FamilyProfileRow[]);
    const productIds = Array.from(new Set(list.map((i) => i.product_id)));
    if (productIds.length > 0) {
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);
      setProducts(new Map(((productData ?? []) as ProductRow[]).map((p) => [p.id, p])));
      const { data: labels } = await supabase
        .from("normalized_labels")
        .select("product_id, ingredients_json, created_at")
        .in("product_id", productIds)
        .order("created_at", { ascending: false });
      setChanged(detectLabelChanges((labels ?? []) as Pick<NormalizedLabelRow, "product_id" | "ingredients_json">[]));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueProducts = Array.from(new Set(items.map((i) => i.product_id)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">다음 장보기</h1>
          <p className="mt-1 text-sm text-slate-500">
            화이트리스트에 저장한 상품입니다. 표시가 바뀐 상품은 다시 검수하세요.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          목록 인쇄
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-emerald-700" />
        </div>
      ) : uniqueProducts.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="장보기 목록이 비어 있습니다."
          description="검수 결과에서 화이트리스트에 저장하면 여기에 모입니다."
          action={
            <Link href="/app/check">
              <Button>상품 검수하기</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>상품 {uniqueProducts.length}개</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {uniqueProducts.map((pid) => {
              const product = products.get(pid);
              const forProfiles = items
                .filter((i) => i.product_id === pid)
                .map((i) => profiles.find((p) => p.id === i.profile_id))
                .filter(Boolean) as FamilyProfileRow[];
              return (
                <div key={pid} className="flex items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {product?.product_name ?? "삭제된 상품"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {forProfiles.map((p) => (
                        <Badge key={p.id} variant="outline">
                          {p.name} · {PROFILE_TYPE_LABELS[p.profile_type]}
                        </Badge>
                      ))}
                      {changed.has(pid) && (
                        <Badge variant="amber">표시가 바뀐 것 같아요</Badge>
                      )}
                    </div>
                  </div>
                  {product?.product_url && (
                    <a
                      href={product.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

