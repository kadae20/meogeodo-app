"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LandingCtaForm({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
    const q = email.trim()
      ? `?email=${encodeURIComponent(email.trim())}&next=/app`
      : "?next=/app";
    router.push(`/login${q}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`mt-8 flex max-w-xl flex-col gap-6 sm:flex-row sm:items-end ${className}`}
    >
      <label className="sr-only" htmlFor="landing-email">
        이메일
      </label>
      <input
        id="landing-email"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 flex-1 border-0 border-b border-slate-300 bg-transparent font-landing-mono text-sm outline-none placeholder:text-slate-400 focus:border-emerald-700"
      />
      <button
        type="submit"
        className="landing-dot h-12 shrink-0 px-2 font-landing-mono text-sm text-emerald-700"
      >
        {sent ? "이동 중" : "시작 →"}
      </button>
    </form>
  );
}
