"use client";

import { useState, Suspense, useEffect, type ButtonHTMLAttributes } from "react";
import type { Provider } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getAppUrl } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "magic";
type OAuthProvider = "kakao" | "naver" | "google";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const presetEmail = searchParams.get("email") || "";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const oauthError = searchParams.get("error");

  useEffect(() => {
    if (oauthError === "oauth") {
      toast.error("간편 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  }, [oauthError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${getAppUrl()}/auth/callback?next=${next}` },
        });
        if (error) throw error;
        toast.success("로그인 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${getAppUrl()}/auth/callback?next=/app/onboarding` },
        });
        if (error) throw error;
        toast.success("가입 확인 메일을 보냈습니다. 메일함을 확인해주세요. (이메일 확인이 꺼져 있으면 바로 로그인됩니다)");
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          router.push("/app/onboarding");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: OAuthProvider) {
    setLoading(true);
    const supabase = createClient();
    const dest = next.startsWith("/") ? next : "/app";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: (provider === "naver" ? "custom:naver" : provider) as Provider,
      options: {
        redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(dest)}`,
        queryParams:
          provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("provider")
          ? "이 로그인은 아직 켜져 있지 않습니다. Supabase에서 Provider를 활성화하세요."
          : error.message
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-12 shadow-sm sm:px-10">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900">먹어도될까</span>
        </div>

        <h1 className="text-center text-xl font-bold leading-snug text-slate-900">
          지금 로그인하고
          <br />
          장보기 전에 비교하세요.
        </h1>

        <div className="mt-8 space-y-3">
          <SocialButton
            disabled={loading}
            onClick={() => oauth("kakao")}
            className="bg-[#FEE500] text-[#191919] hover:bg-[#f5dc00]"
          >
            <KakaoMark />
            카카오로 간편 로그인하기
          </SocialButton>
          <SocialButton
            disabled={loading}
            onClick={() => oauth("naver")}
            className="bg-[#03C75A] text-white hover:bg-[#02b351]"
          >
            <NaverMark />
            네이버로 간편 로그인하기
          </SocialButton>
          <SocialButton
            disabled={loading}
            onClick={() => oauth("google")}
            className="border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          >
            <GoogleMark />
            구글로 간편 로그인하기
          </SocialButton>
          <p className="rounded-2xl bg-slate-100 px-4 py-3.5 text-center text-sm leading-relaxed text-slate-400">
            별도 아이디, 비밀번호 없이 카카오·네이버·구글로
            간편하게 로그인할 수 있어요.
          </p>
        </div>

        <div className="my-8 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          또는 이메일
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <p className="text-sm text-slate-500">
          {mode === "signup"
            ? "이메일로 회원가입"
            : mode === "magic"
              ? "이메일로 로그인 링크를 받아 로그인합니다."
              : "이메일과 비밀번호로 계속하세요."}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode !== "magic" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner />}
            {mode === "signin" && "로그인"}
            {mode === "signup" && "가입하기"}
            {mode === "magic" && "로그인 링크 보내기"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-1 text-center text-sm text-slate-500">
          {mode !== "magic" ? (
            <button
              className="text-emerald-700 hover:underline"
              onClick={() => setMode("magic")}
            >
              비밀번호 없이 이메일 링크로 로그인
            </button>
          ) : (
            <button
              className="text-emerald-700 hover:underline"
              onClick={() => setMode("signin")}
            >
              비밀번호로 로그인
            </button>
          )}
          {mode === "signin" ? (
            <button className="hover:underline" onClick={() => setMode("signup")}>
              계정이 없나요? 회원가입
            </button>
          ) : mode === "signup" ? (
            <button className="hover:underline" onClick={() => setMode("signin")}>
              이미 계정이 있나요? 로그인
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SocialButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function KakaoMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4C7.03 4 3 7.13 3 10.98c0 2.47 1.64 4.64 4.12 5.9-.18.66-.65 2.4-.74 2.77-.11.46.17.45.36.33.15-.1 2.4-1.64 3.37-2.3.6.08 1.22.13 1.89.13 4.97 0 9-3.13 9-6.98C21 7.13 16.97 4 12 4z"
      />
    </svg>
  );
}

function NaverMark() {
  return (
    <span className="text-base font-black leading-none" aria-hidden>
      N
    </span>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
