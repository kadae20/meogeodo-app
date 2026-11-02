"use client";

import { useEffect, useState } from "react";

export function LandingProgress() {
  const [progress, setProgress] = useState(0.08);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max <= 0 ? 0.08 : Math.min(1, 0.08 + 0.92 * (window.scrollY / max)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none fixed right-3 top-1/2 z-40 hidden h-48 w-8 -translate-y-1/2 lg:block"
      aria-hidden
    >
      <svg width="10" height="192" viewBox="0 0 10 192" className="mx-auto text-emerald-700">
        <path
          d="M5 4 V188"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M5 4 V188"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          className="transition-[stroke-dasharray] duration-150 ease-out"
          strokeDasharray={`${progress} ${1 - progress}`}
        />
      </svg>
    </div>
  );
}
