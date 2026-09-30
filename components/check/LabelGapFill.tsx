"use client";

import { useRef, useState } from "react";
import { Camera, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { mergeProductFields } from "@/lib/products/fill-from-source";
import type { ProductInput } from "@/lib/types/food";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function LabelGapFill({
  value,
  onChange,
}: {
  value: ProductInput;
  onChange: (next: ProductInput) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);

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
      const mediaType = match[1];
      if (
        mediaType !== "image/jpeg" &&
        mediaType !== "image/png" &&
        mediaType !== "image/webp" &&
        mediaType !== "image/gif"
      ) {
        toast.error("jpg, png, webp, gif 이미지만 올릴 수 있습니다.");
        return;
      }
      const res = await fetch("/api/ocr-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: match[2],
          media_type: mediaType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "사진을 읽지 못했습니다.");
      onChange(mergeProductFields(value, data.fields as Partial<ProductInput>));
      toast.success("성분표 사진에서 표시를 채웠습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "사진을 읽지 못했습니다.");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pasteFromClipboard() {
    setPasteLoading(true);
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File(
              [blob],
              "clipboard",
              { type: imageType === "image/jpg" ? "image/jpeg" : imageType }
            );
            await onPickImage(file);
            return;
          }
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            const text = (await blob.text()).trim();
            if (text) {
              onChange({
                ...value,
                raw_ingredients_text: text,
                page_text: text,
              });
              toast.success("복사한 글을 넣었습니다.");
              return;
            }
          }
        }
      }
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        toast.error("클립보드가 비어 있습니다. 쿠팡에서 원재료를 복사한 뒤 다시 눌러 주세요.");
        return;
      }
      onChange({
        ...value,
        raw_ingredients_text: text,
        page_text: text,
      });
      toast.success("복사한 글을 넣었습니다.");
    } catch {
      toast.error("클립보드를 읽지 못했습니다. 아래 칸에 직접 붙여넣으세요.");
    } finally {
      setPasteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPickImage(e.target.files?.[0])}
      />
      <Button
        type="button"
        className="w-full"
        disabled={ocrLoading || pasteLoading}
        onClick={pasteFromClipboard}
      >
        {pasteLoading ? <Spinner /> : <ClipboardPaste className="h-4 w-4" />}
        방금 복사한 원재료 넣기
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={ocrLoading || pasteLoading}
        onClick={() => fileRef.current?.click()}
      >
        {ocrLoading ? <Spinner /> : <Camera className="h-4 w-4" />}
        {ocrLoading ? "성분표 읽는 중…" : "성분표 사진 올리기"}
      </Button>
      <div className="space-y-1.5">
        <Label htmlFor="gap-ingredients">또는 원재료명 붙여넣기</Label>
        <Textarea
          id="gap-ingredients"
          className="min-h-[120px]"
          placeholder="상품 페이지나 라벨의 원재료명을 그대로 붙여넣으세요"
          value={value.raw_ingredients_text ?? ""}
          onChange={(e) =>
            onChange({ ...value, raw_ingredients_text: e.target.value })
          }
        />
      </div>
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
