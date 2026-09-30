"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, ExternalLink, Trash2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import { PROFILE_TYPE_LABELS } from "@/lib/types/food";
import type {
  FamilyProfileRow,
  ProductRow,
  WhitelistItemRow,
  NormalizedLabelRow,
} from "@/lib/types/database";
import { detectLabelChanges } from "@/lib/products/label-changed";

export default function WhitelistPage() {
  const supabase = createClient();
  const [items, setItems] = useState<WhitelistItemRow[]>([]);
  const [profiles, setProfiles] = useState<FamilyProfileRow[]>([]);
  const [products, setProducts] = useState<Map<string, ProductRow>>(new Map());
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, profilesRes] = await Promise.all([
      supabase
        .from("whitelist_items")
        .select("*")
        .order("created_at", { ascending: false }),
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
      setProducts(
        new Map(((productData ?? []) as ProductRow[]).map((p) => [p.id, p]))
      );
      const { data: labels } = await supabase
        .from("normalized_labels")
        .select("product_id, ingredients_json, created_at")
        .in("product_id", productIds)
        .order("created_at", { ascending: false });
      setChanged(
        detectLabelChanges(
          (labels ?? []) as Pick<NormalizedLabelRow, "product_id" | "ingredients_json">[]
        )
      );
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(item: WhitelistItemRow) {
    const { error } = await supabase
      .from("whitelist_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      toast.error("삭제에 실패했습니다.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success("화이트리스트에서 삭제했습니다.");
  }

  const byProfile = profiles
    .map((p) => ({
      profile: p,
      items: items.filter((i) => i.profile_id === p.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">화이트리스트</h1>
        <p className="mt-1 text-sm text-slate-500">
          프로필별로 저장해둔 상품입니다. 같은 상품을 다시 검수하면 결과가
          달라졌는지 알려 드립니다.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-emerald-700" />
        </div>
      ) : byProfile.length === 0 ? (
        <EmptyState
          icon={<Star className="h-8 w-8" />}
          title="저장된 상품이 없습니다."
          description="검수 결과 화면에서 '화이트리스트에 저장'을 누르면 여기에 모입니다."
          action={
            <Link href="/app/check">
              <Button>상품 검수하러 가기</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {byProfile.map(({ profile, items: profileItems }) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{profile.name}</CardTitle>
                  <Badge variant="outline">
                    {PROFILE_TYPE_LABELS[profile.profile_type]}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {profileItems.length}개 상품
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {profileItems.map((item) => {
                    const product = products.get(item.product_id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {product?.product_name ?? "삭제된 상품"}
                            {product?.brand_name && (
                              <span className="ml-1 text-xs font-normal text-slate-400">
                                {product.brand_name}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            저장일 {formatDate(item.created_at)}
                            {item.note ? ` · ${item.note}` : ""}
                          </p>
                          {changed.has(item.product_id) && (
                            <Badge variant="amber" className="mt-1">
                              표시가 바뀐 것 같아요
                            </Badge>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {product?.product_url && (
                            <a
                              href={product.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                              title="상품 링크"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <Link
                            href="/app/check"
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700"
                            title="다시 검수"
                          >
                            <ScanSearch className="h-4 w-4" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => remove(item)}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
