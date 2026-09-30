"use client";

import { useRef, useState } from "react";
import { Camera, Link2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { mergeProductFields } from "@/lib/products/fill-from-source";
import { meogeodoListingBookmarklet } from "@/lib/products/bookmarklet";
import type { ProductInput } from "@/lib/types/food";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function ProductInputForm({
  value,
  onChange,
  idPrefix = "p",
}: {
  value: ProductInput;
  onChange: (next: ProductInput) => void;
  idPrefix?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  function set<K extends keyof ProductInput>(key: K, v: ProductInput[K]) {
    onChange({ ...value, [key]: v });
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("jpg, png, webp, gif 이미지만 올릴 수 있습니다.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("이미지는 4MB 이하로 올려주세요.");
      return;
    }

    setOcrLoading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("이미지를 읽지 못했습니다.");
      const mediaType = match[1] as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif";
      const imageBase64 = match[2];

      const res = await fetch("/api/ocr-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: imageBase64,
          media_type: mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "사진 읽기에 실패했습니다.");

      const f = data.fields as Partial<ProductInput>;
      onChange(mergeProductFields(value, f));
      toast.success("사진에서 표시 정보를 채웠습니다. 내용을 확인한 뒤 검수하세요.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "사진 읽기에 실패했습니다.");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function fetchUrl() {
    const url = value.product_url?.trim();
    if (!url) {
      toast.error("상품 URL을 입력해주세요.");
      return;
    }
    setUrlLoading(true);
    try {
      const res = await fetch("/api/fetch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.fields) onChange(mergeProductFields(value, data.fields));
      if (!res.ok) throw new Error(data.error ?? "페이지를 읽지 못했습니다.");
      toast.success(
        data.source === "cache"
          ? "이전에 검수한 상품 정보를 채웠습니다."
          : data.fields?.raw_ingredients_text
            ? "페이지에서 표시 정보를 채웠습니다."
            : "상품명은 가져왔습니다. 원재료가 없으면 검수 결과가 정보 부족일 수 있습니다."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "페이지를 읽지 못했습니다.");
    } finally {
      setUrlLoading(false);
    }
  }

  async function lookupBarcode() {
    const barcode = value.barcode?.trim();
    if (!barcode) {
      toast.error("바코드 숫자를 입력해주세요.");
      return;
    }
    setBarcodeLoading(true);
    try {
      const res = await fetch("/api/lookup-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const data = await res.json();
      if (data.fields) onChange(mergeProductFields(value, { ...data.fields, barcode }));
      if (!res.ok) throw new Error(data.error ?? "바코드를 찾지 못했습니다.");
      toast.success(
        data.source === "cache"
          ? "저장해 둔 상품 정보를 채웠습니다."
          : "공개 DB에서 상품 정보를 채웠습니다. 내용을 확인하세요."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "바코드 조회에 실패했습니다.");
    } finally {
      setBarcodeLoading(false);
    }
  }

  function copyBookmarklet() {
    navigator.clipboard.writeText(meogeodoListingBookmarklet(window.location.origin));
    toast.success("북마크릿을 복사했습니다. 쿠팡에서 상품정보를 펼친 뒤 북마크를 누르세요.");
  }

  const extrasFilled = !!(
    value.product_name.trim() ||
    value.raw_ingredients_text?.trim() ||
    value.raw_nutrition_text?.trim()
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-url`}>상품 URL</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-url`}
            placeholder="https:// 쿠팡, 마켓컬리 등 상품 링크"
            value={value.product_url ?? ""}
            onChange={(e) => set("product_url", e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={urlLoading}
            onClick={fetchUrl}
          >
            {urlLoading ? <Spinner /> : <Link2 className="h-4 w-4" />}
            가져오기
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          쿠팡은 링크만 붙여넣으면 상세를 막을 수 있습니다. 상품 페이지에서
          상품정보를 펼친 뒤 북마크릿을 쓰세요.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
            onClick={copyBookmarklet}
          >
            <Bookmark className="h-3 w-3" />
            북마크릿 복사
          </button>
          <span className="text-xs text-slate-400">
            쇼핑몰이 막으면 상품 페이지에서 북마크릿을 쓰거나, 라벨 사진을
            올려주세요.
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-barcode`}>바코드 (선택)</Label>
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-barcode`}
            inputMode="numeric"
            placeholder="숫자만, 8자리 이상"
            value={value.barcode ?? ""}
            onChange={(e) => set("barcode", e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={barcodeLoading}
            onClick={lookupBarcode}
          >
            {barcodeLoading ? <Spinner /> : null}
            조회
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={ocrLoading}
          onClick={() => fileRef.current?.click()}
        >
          {ocrLoading ? <Spinner /> : <Camera className="h-4 w-4" />}
          {ocrLoading ? "라벨 읽는 중…" : "라벨 사진으로 채우기"}
        </Button>
      </div>

      {extrasFilled && (
        <p className="text-sm text-slate-600">
          {value.product_name.trim() || "이름 미정"}
          {value.raw_ingredients_text?.trim()
            ? " · 원재료를 채웠습니다"
            : " · 원재료는 아직 없음 (정보 부족으로 나올 수 있음)"}
        </p>
      )}

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-sm text-slate-600">
          직접 입력·수정 (상품명, 원재료, 영양 등)
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${idPrefix}-name`}>상품명</Label>
              <Input
                id={`${idPrefix}-name`}
                placeholder="비워 두면 링크에서 가져옵니다"
                value={value.product_name}
                onChange={(e) => set("product_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-brand`}>브랜드명</Label>
              <Input
                id={`${idPrefix}-brand`}
                value={value.brand_name ?? ""}
                onChange={(e) => set("brand_name", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-category`}>카테고리</Label>
            <Input
              id={`${idPrefix}-category`}
              placeholder="예: 과자, 사료, 영양제"
              value={value.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-ingredients`}>원재료명</Label>
            <Textarea
              id={`${idPrefix}-ingredients`}
              placeholder="페이지에서 안 가져와지면 여기에 붙여넣으세요"
              value={value.raw_ingredients_text ?? ""}
              onChange={(e) => set("raw_ingredients_text", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-nutrition`}>영양정보</Label>
            <Textarea
              id={`${idPrefix}-nutrition`}
              placeholder="예: 당류 8g, 나트륨 20mg"
              value={value.raw_nutrition_text ?? ""}
              onChange={(e) => set("raw_nutrition_text", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-allergen`}>알레르기 표시</Label>
              <Textarea
                id={`${idPrefix}-allergen`}
                placeholder="예: 우유, 대두 함유"
                value={value.raw_allergen_text ?? ""}
                onChange={(e) => set("raw_allergen_text", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-origin`}>원산지 정보</Label>
              <Textarea
                id={`${idPrefix}-origin`}
                placeholder="예: 쌀: 국내산"
                value={value.raw_origin_text ?? ""}
                onChange={(e) => set("raw_origin_text", e.target.value)}
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}
