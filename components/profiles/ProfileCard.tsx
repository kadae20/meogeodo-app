"use client";

import Link from "next/link";
import { Baby, User, Dog, Cat, HelpCircle, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROFILE_TYPE_LABELS, type ProfileType } from "@/lib/types/food";
import type { FamilyProfileRow } from "@/lib/types/database";

const TYPE_ICONS: Record<ProfileType, typeof Baby> = {
  child: Baby,
  adult: User,
  dog: Dog,
  cat: Cat,
  other: HelpCircle,
};

export function ProfileCard({
  profile,
  ruleCount,
  onEdit,
  onDelete,
}: {
  profile: FamilyProfileRow;
  ruleCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const Icon = TYPE_ICONS[profile.profile_type] ?? HelpCircle;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="h-5 w-5" />
        </div>
        <Link href={`/app/profiles/${profile.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900 hover:underline">
              {profile.name}
            </p>
            <Badge variant="outline">
              {PROFILE_TYPE_LABELS[profile.profile_type]}
            </Badge>
            {profile.relation_label && (
              <Badge>{profile.relation_label}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            기준 {ruleCount ?? 0}개
            {profile.notes ? ` · ${profile.notes}` : ""}
          </p>
        </Link>
        <div className="flex shrink-0 gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit} title="수정">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              title="삭제"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
