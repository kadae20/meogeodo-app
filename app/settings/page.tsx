import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { HouseholdSettings } from "@/components/settings/HouseholdSettings";
import { DisplayNameForm } from "@/components/settings/DisplayNameForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("family_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weeklyInspections } = await supabase
    .from("inspections")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", sevenDaysAgo);

  return (
    <AppShell
      email={user.email ?? ""}
      displayName={profile?.display_name}
      profileCount={count ?? 0}
    >
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">설정</h1>
          <p className="mt-1 text-sm text-slate-500">계정과 플랜을 관리합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>계정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">이메일</span>
              <span className="font-medium text-slate-900">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">최근 7일 검수</span>
              <span className="text-slate-700">{weeklyInspections ?? 0}회</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">가입일</span>
              <span className="text-slate-700">
                {user.created_at ? formatDate(user.created_at) : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">가족 프로필</span>
              <span className="text-slate-700">{count ?? 0}개</span>
            </div>
          </CardContent>
        </Card>

        <DisplayNameForm initial={profile?.display_name ?? ""} />

        <HouseholdSettings />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>현재 플랜</CardTitle>
              <Badge variant="green">무료 (베타)</Badge>
            </div>
            <CardDescription>
              베타 기간에는 모든 기능을 무료로 사용할 수 있습니다. 결제는 아직
              지원하지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                플랜 안내 보기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
