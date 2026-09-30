"use client";

import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductInputForm } from "./ProductInputForm";
import type { ProductInput } from "@/lib/types/food";

export const EMPTY_CART_PRODUCT: ProductInput = {
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

export function CartProductRows({
  products,
  onChange,
}: {
  products: ProductInput[];
  onChange: (next: ProductInput[]) => void;
}) {
  const [openIndex, setOpenIndex] = useState(0);

  function updateAt(index: number, next: ProductInput) {
    onChange(products.map((p, i) => (i === index ? next : p)));
  }

  function removeAt(index: number) {
    onChange(products.filter((_, i) => i !== index));
    if (openIndex >= index && openIndex > 0) setOpenIndex(openIndex - 1);
  }

  function add() {
    onChange([...products, { ...EMPTY_CART_PRODUCT }]);
    setOpenIndex(products.length);
  }

  return (
    <div className="space-y-3">
      {products.map((product, i) => {
        const open = openIndex === i;
        return (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{i + 1}</Badge>
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                >
                  <span className="truncate text-sm font-medium text-slate-900">
                    {product.product_name ||
                      product.product_url ||
                      "링크 또는 상품명"}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenIndex(open ? -1 : i)}
                  title={open ? "접기" : "펼치기"}
                >
                  {open ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                {products.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => removeAt(i)}
                    title="상품 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {open && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <ProductInputForm
                    value={product}
                    onChange={(next) => updateAt(i, next)}
                    idPrefix={`cart-${i}`}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button variant="outline" className="w-full" onClick={add}>
        <Plus className="h-4 w-4" />
        상품 추가
      </Button>
    </div>
  );
}
