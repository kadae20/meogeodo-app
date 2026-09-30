"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function DisplayNameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      toast.error("로그인이 필요합니다.");
      return;
    }
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const payload = {
      user_id: userData.user.id,
      display_name: name.trim() || null,
    };
    const { error } = existing
      ? await supabase.from("user_profiles").update(payload).eq("id", existing.id)
      : await supabase.from("user_profiles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("이름 저장에 실패했습니다.");
      return;
    }
    toast.success("표시 이름을 저장했습니다.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>표시 이름</CardTitle>
        <CardDescription>헤더에 이메일 대신 보여 줄 이름입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1 space-y-1.5">
            <Label htmlFor="display-name">이름</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 민지"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            저장
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
