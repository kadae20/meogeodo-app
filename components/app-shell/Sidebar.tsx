"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ScanSearch,
  ShoppingCart,
  History,
  Star,
  ShoppingBag,
  Settings,
  Puzzle,
  Leaf,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/app/profiles", label: "가족 프로필", icon: Users },
  { href: "/app/check", label: "상품 검수", icon: ScanSearch },
  { href: "/app/cart-check", label: "장바구니 검수", icon: ShoppingCart },
  { href: "/app/inspections", label: "검수 히스토리", icon: History },
  { href: "/app/whitelist", label: "화이트리스트", icon: Star },
  { href: "/app/shopping", label: "다음 장보기", icon: ShoppingBag },
  { href: "/extensions", label: "Chrome 확장", icon: Puzzle },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-emerald-50 text-emerald-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white">
        <Leaf className="h-4 w-4" />
      </div>
      <span className="text-sm font-bold text-slate-900">먹어도될까</span>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        {brand}
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pr-2">
              {brand}
              <button
                onClick={onClose}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100"
                aria-label="메뉴 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
