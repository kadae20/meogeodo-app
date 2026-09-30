import Link from "next/link";
import { Leaf } from "lucide-react";

export function ExtensionsNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-semibold">먹어도될까</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-white/5 hover:text-white"
          >
            홈
          </Link>
          <Link
            href="/extensions"
            className="rounded-md bg-white/10 px-3 py-1.5 font-medium text-white"
          >
            PC Chrome 확장프로그램
          </Link>
          <Link
            href="/login"
            className="ml-2 rounded-full border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/5"
          >
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
