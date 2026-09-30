import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResultBadge } from "./ResultBadge";
import { ResultDetailAccordion } from "./ResultDetailAccordion";
import { WhitelistButton } from "./WhitelistButton";
import { MissingInfoGuide } from "./MissingInfoGuide";
import { PROFILE_TYPE_LABELS, type InspectionStatus, type RuleHit, type ProfileType } from "@/lib/types/food";

export interface ProductResultView {
  productId: string | null;
  productName: string;
  productUrl: string | null;
  brandName: string | null;
  category: string | null;
  ingredientsSummary: string;
  results: {
    id: string;
    profileId: string | null;
    profileName: string;
    profileType: ProfileType | null;
    status: InspectionStatus;
    explanation: string | null;
    matched: RuleHit[];
    warnings: RuleHit[];
    conflicts: RuleHit[];
    missing: RuleHit[];
    confidenceScore?: number;
    whitelisted?: boolean;
    whitelistRecheck?: boolean;
  }[];
}

export function ProductResultTable({
  product,
  anchorId,
}: {
  product: ProductResultView;
  anchorId?: string;
}) {
  return (
    <Card id={anchorId}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{product.productName}</CardTitle>
          {product.brandName && <Badge variant="outline">{product.brandName}</Badge>}
          {product.category && <Badge>{product.category}</Badge>}
          {product.productUrl && (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
            >
              상품 링크 <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {product.ingredientsSummary && (
          <p className="text-xs text-slate-500">
            원재료 요약: {product.ingredientsSummary}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-slate-100">
          {product.results.map((r) => (
            <div key={r.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {r.profileName}
                  </span>
                  {r.profileType && (
                    <Badge variant="outline">
                      {PROFILE_TYPE_LABELS[r.profileType]}
                    </Badge>
                  )}
                  <ResultBadge status={r.status} />
                  {typeof r.confidenceScore === "number" && (
                    <span
                      className={
                        r.confidenceScore < 0.5
                          ? "text-xs text-amber-700"
                          : "text-xs text-slate-400"
                      }
                      title="표시 정보와 기준 비교의 확신 정도"
                    >
                      확신 {Math.round(r.confidenceScore * 100)}%
                    </span>
                  )}
                  {r.whitelistRecheck && (
                    <Badge variant="amber">다시 확인</Badge>
                  )}
                  {r.whitelisted && !r.whitelistRecheck && (
                    <Badge variant="green">저장해 둔 상품</Badge>
                  )}
                </div>
                {r.profileId && product.productId && (
                  <WhitelistButton
                    profileId={r.profileId}
                    productId={product.productId}
                    profileName={r.profileName}
                    initiallySaved={!!r.whitelisted || !!r.whitelistRecheck}
                  />
                )}
              </div>
              {r.whitelistRecheck && (
                <p className="mt-2 text-sm text-amber-800">
                  이전에 화이트리스트에 넣었지만, 지금 표시 정보 또는 저장된
                  기준과 맞지 않습니다. 다시 확인한 뒤 저장을 유지할지 결정하세요.
                </p>
              )}
              {r.explanation && (
                <p className="mt-2 text-sm text-slate-600">{r.explanation}</p>
              )}
              <MissingInfoGuide missing={r.missing} />
              <div className="mt-2">
                <ResultDetailAccordion
                  matched={r.matched}
                  warnings={r.warnings}
                  conflicts={r.conflicts}
                  missing={r.missing}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
