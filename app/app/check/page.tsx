"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanSearch, FlaskConical, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SAMPLE_PRODUCTS } from "@/lib/rules/sample-products";
import {
  hasAnyLabel,
  tryFillProduct,
} from "@/lib/products/fill-from-source";
import {
  inferProductAudience,
  profileFitsAudience,
} from "@/lib/products/audience";
import type { ProductInput } from "@/lib/types/food";
import type { FamilyProfileRow } from "@/lib/types/database";

const EMPTY_PRODUCT: ProductInput = {
  product_url: "",
  product_name: "",
  brand_name: "",
  category: "",
  raw_ingredients_text: "",
  raw_nutrition_text: "",
  raw_allergen_text: "",
  raw_origin_text: "",
  barcode: "",
};

type Stage = "url" | "gap";

export default function CheckPage() {
  const router = useRouter();
  const supabase = createClient();
  const listingRef = useRef<{
    url?: string;
    title?: string;
    text?: string;
  } | null>(null);
  const autoRan = useRef(false);

  const [product, setProduct] = useState<ProductInput>(EMPTY_PRODUCT);
  const [stage, setStage] = useState<Stage>("url");
  const [profiles, setProfiles] = useState<FamilyProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const data = e.data as {
        type?: string;
        payload?: { url?: string; title?: string; text?: string };
      };
      if (data?.type !== "meogeodo-listing" || !data.payload?.text) return;
      listingRef.current = data.payload;
      setProduct((prev) => ({
        ...prev,
        product_url: data.payload?.url || prev.product_url,
        product_name: prev.product_name.trim()
          ? prev.product_name
          : data.payload?.title || "",
        page_text: data.payload?.text,
      }));
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const url = q.get("url") ?? "";
    const name = q.get("name") ?? "";
    const barcode = q.get("barcode") ?? "";
    if (url || name || barcode) {
      setProduct((prev) => ({
        ...prev,
        product_url: url || prev.product_url,
        product_name: name || prev.product_name,
        barcode: barcode || prev.barcode,
      }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [profilesRes] = await Promise.all([
        supabase.from("family_profiles").select("*").order("created_at"),
      ]);
      const list = (profilesRes.data ?? []) as FamilyProfileRow[];
      setProfiles(list);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function profileIdsFor(source: ProductInput): string[] {
    const audience = inferProductAudience({
      product_name: source.product_name,
      category: source.category,
      product_url: source.product_url,
      text: source.raw_ingredients_text,
    });
    const fit = profiles.filter((p) =>
      profileFitsAudience(p.profile_type, audience)
    );
    return fit.map((p) => p.id);
  }

  async function runInspect(source: ProductInput) {
    const profile_ids = profileIdsFor(source);
    if (profile_ids.length === 0) {
      toast.error(
        "이 상품은 지금 가족과 대상이 다릅니다. 사람 식품이면 사람 프로필이, 사료면 반려동물 프로필이 필요합니다."
      );
      return;
    }
    if (!hasAnyLabel(source)) {
      setProduct(source);
      setStage("gap");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inspect-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspection_type: "single_product",
          profile_ids,
          products: [source],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "검수에 실패했습니다.");
      toast.success("가족 기준으로 비교했습니다.");
      router.push(`/app/inspections/${data.inspection_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "검수에 실패했습니다.");
      setSubmitting(false);
    }
  }

  async function readFromUrl(source: ProductInput) {
    const url = source.product_url?.trim();
    if (!url && !source.page_text?.trim() && !hasAnyLabel(source)) {
      toast.error("상품 URL을 붙여넣어 주세요.");
      return;
    }
    setReading(true);
    try {
      const { product: filled, missing } = await tryFillProduct(source);
      setProduct(filled);
      if (missing) {
        setStage("gap");
        return;
      }
      await runInspect(filled);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상품 정보를 읽지 못했습니다.");
      setStage("gap");
    } finally {
      setReading(false);
    }
  }

  useEffect(() => {
    if (loading || autoRan.current || reading || submitting) return;
    const q = new URLSearchParams(window.location.search);
    const url = q.get("url") ?? "";
    if (q.get("go") !== "1" && !url) return;
    autoRan.current = true;
    const fromPage = q.get("from") === "page";
    (async () => {
      let extra: Partial<ProductInput> = {
        product_url: url,
        product_name: q.get("name") ?? "",
        barcode: q.get("barcode") ?? "",
      };
      if (fromPage) {
        const start = Date.now();
        while (!listingRef.current?.text && Date.now() - start < 4000) {
          await new Promise((r) => setTimeout(r, 150));
        }
        const cap = listingRef.current;
        extra = {
          ...extra,
          product_url: cap?.url || extra.product_url,
          product_name: extra.product_name || cap?.title || "",
          page_text: cap?.text,
        };
      }
      await readFromUrl({ ...EMPTY_PRODUCT, ...extra });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const busy = reading || submitting || loading;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">상품 검수</h1>
        <ol className="mt-2 space-y-0.5 text-sm text-slate-500">
          <li>1. 상품 URL을 붙여넣거나, 쿠팡에서 확장을 켠 뒤 「자세히」</li>
          <li>2. 저장된 캐시·확장에서 읽은 표시로 비교</li>
          <li>3. 가족 기준으로 결과 확인</li>
        </ol>
      </div>

      {stage === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>상품 URL</CardTitle>
            <CardDescription>
              링크를 붙여넣으면 저장된 캐시·페이지에서 표시를 읽습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                readFromUrl(product);
              }}
              className="space-y-3"
            >
              <Input
                type="url"
                inputMode="url"
                autoFocus
                placeholder="https:// 상품 링크"
                value={product.product_url ?? ""}
                onChange={(e) =>
                  setProduct({ ...product, product_url: e.target.value })
                }
              />
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {reading ? <Spinner /> : <ScanSearch className="h-4 w-4" />}
                {reading ? "상품 정보를 읽는 중…" : "상품 정보 읽기"}
              </Button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PRODUCTS.map((s, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = {
                      ...EMPTY_PRODUCT,
                      product_name: s.product_name,
                      brand_name: s.brand_name,
                      category: s.category,
                      raw_ingredients_text: s.raw_ingredients_text,
                      raw_nutrition_text: s.raw_nutrition_text,
                      raw_allergen_text: s.raw_allergen_text,
                      raw_origin_text: s.raw_origin_text,
                    };
                    setProduct(next);
                    runInspect(next);
                  }}
                >
                  <FlaskConical className="h-3 w-3" />
                  샘플{i + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "gap" && (
        <Card>
          <CardHeader>
            <CardTitle>이 링크의 표시가 아직 없습니다</CardTitle>
            <CardDescription>
              서버는 쿠팡 상세를 열지 못합니다. 쿠팡 상품상세에서 영양·원재료가
              보이게 연 뒤, 확장 카드가 점수를 주면 그 내용이 저장됩니다. 사진이나
              원재료를 따로 붙이지 않아도 됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                쿠팡 상품으로 돌아가기
              </a>
            )}
            <Button
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => readFromUrl(product)}
            >
              {reading ? <Spinner /> : <ScanSearch className="h-4 w-4" />}
              저장된 표시 다시 읽기
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-slate-400 hover:underline"
              onClick={() => setStage("url")}
            >
              URL 다시 입력
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
