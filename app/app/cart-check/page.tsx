"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  CartProductRows,
  EMPTY_CART_PRODUCT,
} from "@/components/check/CartProductRows";
import { ProfileSelector } from "@/components/check/ProfileSelector";
import { SAMPLE_PRODUCTS } from "@/lib/rules/sample-products";
import {
  canInspectProduct,
  fillProductFromSources,
} from "@/lib/products/fill-from-source";
import type { ProductInput } from "@/lib/types/food";
import type { FamilyProfileRow } from "@/lib/types/database";

export default function CartCheckPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [products, setProducts] = useState<ProductInput[]>([
    { ...EMPTY_CART_PRODUCT },
  ]);
  const [profiles, setProfiles] = useState<FamilyProfileRow[]>([]);
  const [ruleCounts, setRuleCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [profilesRes, rulesRes] = await Promise.all([
        supabase.from("family_profiles").select("*").order("created_at"),
        supabase.from("profile_rules").select("profile_id").eq("enabled", true),
      ]);
      const list = (profilesRes.data ?? []) as FamilyProfileRow[];
      setProfiles(list);
      setSelected(new Set(list.map((p) => p.id)));
      const counts: Record<string, number> = {};
      for (const r of rulesRes.data ?? []) {
        counts[r.profile_id] = (counts[r.profile_id] ?? 0) + 1;
      }
      setRuleCounts(counts);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSamples() {
    setProducts(
      SAMPLE_PRODUCTS.map((s) => ({
        ...EMPTY_CART_PRODUCT,
        product_name: s.product_name,
        brand_name: s.brand_name,
        category: s.category,
        raw_ingredients_text: s.raw_ingredients_text,
        raw_nutrition_text: s.raw_nutrition_text,
        raw_allergen_text: s.raw_allergen_text,
        raw_origin_text: s.raw_origin_text,
      }))
    );
    setTitle("샘플 장바구니");
    toast.info("샘플 상품 3개를 불러왔습니다.");
  }

  async function submit() {
    const candidates = products.filter(canInspectProduct);
    if (candidates.length === 0) {
      toast.error("상품 URL이나 상품명을 1개 이상 넣어주세요.");
      return;
    }
    if (selected.size === 0) {
      toast.error("검수할 가족 프로필을 1개 이상 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const filled = await Promise.all(
        candidates.map((p) => fillProductFromSources(p))
      );
      setProducts(filled);
      const res = await fetch("/api/inspect-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspection_type: "cart_manual",
          title: title.trim() || undefined,
          profile_ids: Array.from(selected),
          products: filled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검수에 실패했습니다.");
      toast.success("장바구니 검수가 완료되었습니다.");
      router.push(`/app/inspections/${data.inspection_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "검수에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">장바구니 검수</h1>
          <p className="mt-1 text-sm text-slate-500">
            각 상품에 링크만 넣어도 됩니다. 가족 기준으로 함께 검수합니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadSamples}>
          <FlaskConical className="h-3 w-3" />
          샘플 3개 불러오기
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 좌측: 상품 입력 리스트 */}
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-1.5">
            <Label htmlFor="cart-title">검수 제목 (선택)</Label>
            <Input
              id="cart-title"
              placeholder="예: 이번주 장보기"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <CartProductRows products={products} onChange={setProducts} />
        </div>

        {/* 우측: 프로필 선택 + 실행 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>검수 대상 프로필</CardTitle>
              <CardDescription>
                선택한 프로필 기준으로 모든 상품을 검수합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="text-emerald-700" />
                </div>
              ) : (
                <ProfileSelector
                  profiles={profiles}
                  selected={selected}
                  onChange={setSelected}
                  ruleCounts={ruleCounts}
                />
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={submit}
            disabled={submitting || loading}
          >
            {submitting ? <Spinner /> : <ShoppingCart className="h-4 w-4" />}
            {submitting
              ? "검수 중… (상품 수에 따라 시간이 걸립니다)"
              : `상품 ${products.filter(canInspectProduct).length}개 검수 실행`}
          </Button>
        </div>
      </div>
    </div>
  );
}
