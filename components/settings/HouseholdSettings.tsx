"use client";

import { useEffect, useState } from "react";
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
import type { HouseholdRow } from "@/lib/types/database";

export function HouseholdSettings() {
  const supabase = createClient();
  const [house, setHouse] = useState<HouseholdRow | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("households").select("*").limit(1);
    if (error) {
      setHouse(null);
      setLoading(false);
      return;
    }
    const row = (data?.[0] ?? null) as HouseholdRow | null;
    setHouse(row);
    if (row) {
      const { count } = await supabase
        .from("household_members")
        .select("*", { count: "exact", head: true })
        .eq("household_id", row.id);
      setMemberCount(count ?? 0);
    } else {
      setMemberCount(0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createHouse() {
    setSaving(true);
    const { error } = await supabase.rpc("create_household", {
      house_name: "우리 집",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("가구를 만들었습니다. 초대 코드를 공유하세요.");
    load();
  }

  async function join() {
    setSaving(true);
    const { error } = await supabase.rpc("join_household", {
      code: code.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("가구에 참여했습니다. 가족 프로필을 함께 볼 수 있습니다.");
    load();
  }

  async function leave() {
    setSaving(true);
    const { error } = await supabase.rpc("leave_household");
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("가구에서 나왔습니다.");
    setHouse(null);
    setMemberCount(0);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>가구 공유</CardTitle>
        <CardDescription>
          배우자·가족과 프로필·기준·검수 기록을 함께 봅니다. 수정은 각자 본인
          것만 가능합니다. (SQL 마이그레이션 002를 실행해야 동작합니다)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading ? (
          <Spinner className="text-emerald-700" />
        ) : house ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">가구 이름</span>
              <span className="font-medium text-slate-900">{house.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">초대 코드</span>
              <button
                className="font-mono font-medium text-emerald-800 hover:underline"
                onClick={() => {
                  navigator.clipboard.writeText(house.invite_code);
                  toast.success("초대 코드를 복사했습니다.");
                }}
              >
                {house.invite_code}
              </button>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">구성원</span>
              <span>{memberCount}명</span>
            </div>
            <Button variant="outline" size="sm" onClick={leave} disabled={saving}>
              {saving && <Spinner />}
              가구에서 나가기
            </Button>
          </>
        ) : (
          <>
            <Button onClick={createHouse} disabled={saving}>
              {saving && <Spinner />}
              가구 만들기
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="invite-code">초대 코드로 참여</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-code"
                  placeholder="예: A1B2C3D4"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <Button
                  variant="secondary"
                  onClick={join}
                  disabled={saving || code.trim().length < 4}
                >
                  참여
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
