"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { PROFILE_TYPE_LABELS, type ProfileType } from "@/lib/types/food";
import type { FamilyProfileRow } from "@/lib/types/database";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해주세요.").max(30),
  profile_type: z.enum(["child", "adult", "dog", "cat", "other"]),
  relation_label: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
});

export type ProfileFormValues = z.infer<typeof schema>;

export function ProfileForm({
  initial,
  onSubmit,
  submitLabel = "저장",
  loading,
}: {
  initial?: Partial<FamilyProfileRow>;
  onSubmit: (values: ProfileFormValues) => void | Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      profile_type: (initial?.profile_type as ProfileType) ?? "child",
      relation_label: initial?.relation_label ?? "",
      notes: initial?.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">이름 *</Label>
        <Input id="pf-name" placeholder="예: 민준이, 초코" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pf-type">프로필 타입 *</Label>
          <Select id="pf-type" {...register("profile_type")}>
            {(Object.keys(PROFILE_TYPE_LABELS) as ProfileType[]).map((t) => (
              <option key={t} value={t}>
                {PROFILE_TYPE_LABELS[t]} ({t})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-relation">관계</Label>
          <Input
            id="pf-relation"
            placeholder="예: 아이, 엄마, 강아지"
            {...register("relation_label")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-notes">메모</Label>
        <Textarea
          id="pf-notes"
          placeholder="예: 우유 알레르기 있음, 단 간식 줄이는 중"
          {...register("notes")}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Spinner />}
        {submitLabel}
      </Button>
    </form>
  );
}
