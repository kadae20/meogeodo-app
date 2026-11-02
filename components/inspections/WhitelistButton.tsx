"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function WhitelistButton({
  profileId,
  productId,
  profileName,
  initiallySaved = false,
}: {
  profileId: string;
  productId: string;
  profileName: string;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("whitelist_items").insert({
      user_id: userData.user.id,
      profile_id: profileId,
      product_id: productId,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("이미 이 프로필의 화이트리스트에 있는 상품입니다.");
        setSaved(true);
      } else {
        toast.error("화이트리스트 저장에 실패했습니다.");
      }
      return;
    }
    setSaved(true);
    toast.success(`${profileName} 화이트리스트에 저장했습니다.`);
  }

  return (
    <Button
      variant={saved ? "secondary" : "ghost"}
      size="sm"
      onClick={save}
      disabled={saving || saved}
    >
      <Star className={`h-3.5 w-3.5 ${saved ? "fill-emerald-600" : ""}`} />
      {saved ? "저장됨" : "화이트리스트에 저장"}
    </Button>
  );
}
