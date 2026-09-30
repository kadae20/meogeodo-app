"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function Header({
  email,
  displayName,
  profileCount,
  onMenuClick,
}: {
  email: string;
  displayName?: string | null;
  profileCount: number;
  onMenuClick?: () => void;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden truncate text-sm text-slate-600 sm:block">
          {displayName?.trim() || email}
        </span>
        <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500 sm:inline-flex">
          <Users className="h-3 w-3" />
          프로필 {profileCount}개
        </span>
      </div>

      <Link href="/app/check">
        <Button size="sm">
          <Plus className="h-4 w-4" />
          새 검수
        </Button>
      </Link>
      <Button variant="ghost" size="sm" onClick={signOut} title="로그아웃">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">로그아웃</span>
      </Button>
    </header>
  );
}
