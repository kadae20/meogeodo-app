"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#problem", label: "문제" },
  { href: "#solution", label: "해결" },
  { href: "#effect", label: "기대효과" },
  { href: "#cta", label: "시작" },
];

export function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  function go(href: string) {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/55 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 font-landing-mono text-[13px] text-white lg:px-14 lg:py-4">
        <a
          href="#top"
          className="landing-dot pointer-events-auto p-2 font-landing text-[15px] font-bold text-white"
          onClick={(e) => {
            e.preventDefault();
            go("#top");
          }}
        >
          먹어도될까
        </a>

        <nav className="pointer-events-auto hidden items-center lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="landing-dot p-2"
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
            >
              {l.label}
            </a>
          ))}
          <Link href="/extensions" className="landing-dot p-2">
            확장
          </Link>
          <Link href={loggedIn ? "/app" : "/login"} className="landing-dot p-2 text-emerald-300">
            {loggedIn ? "앱" : "로그인"}
          </Link>
        </nav>

        <button
          type="button"
          className="pointer-events-auto relative h-10 w-10 lg:hidden"
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={cn(
              "absolute left-2.5 right-2.5 h-px bg-white transition",
              open ? "top-1/2 rotate-45" : "top-3.5"
            )}
          />
          <span
            className={cn(
              "absolute left-2.5 right-2.5 h-px bg-white transition",
              open ? "top-1/2 -rotate-45" : "bottom-3.5"
            )}
          />
        </button>
      </div>

      {open ? (
        <div
          id="landing-mobile-nav"
          className="pointer-events-auto border-t border-white/10 bg-slate-950 px-4 py-5 lg:hidden"
        >
          <nav className="flex flex-col font-landing-mono text-sm text-white">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-2 py-3"
                onClick={(e) => {
                  e.preventDefault();
                  go(l.href);
                }}
              >
                {l.label}
              </a>
            ))}
            <Link href="/extensions" className="px-2 py-3" onClick={() => setOpen(false)}>
              확장
            </Link>
            <Link
              href={loggedIn ? "/app" : "/login"}
              className="px-2 py-3 text-emerald-300"
              onClick={() => setOpen(false)}
            >
              {loggedIn ? "앱" : "로그인"}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
