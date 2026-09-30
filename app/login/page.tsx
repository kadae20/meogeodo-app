"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Mode = "signin" | "signup" | "magic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const presetEmail = searchParams.get("email") || "";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
        });
        if (error) throw error;
        toast.success("로그인 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=/app/onboarding` },
        });
        if (error) throw error;
        toast.success("가입 확인 메일을 보냈습니다. 메일함을 확인해주세요. (이메일 확인이 꺼져 있으면 바로 로그인됩니다)");
        // 이메일 확인이 꺼진 프로젝트면 세션이 즉시 생김
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

  async function oauth(provider: "kakao" | "apple") {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=${next}` },
    });
    if (error) {
      toast.error(
        error.message.includes("provider")
          ? "이 로그인은 아직 켜져 있지 않습니다. Supabase에서 Provider를 활성화하세요."
          : error.message
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900">먹어도될까</span>
        </div>

        <h1 className="text-lg font-semibold text-slate-900">
          {mode === "signup" ? "회원가입" : "로그인"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "magic"
            ? "이메일로 로그인 링크를 받아 로그인합니다."
            : "이메일과 비밀번호로 계속하세요."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        <div className="mt-4 space-y-2">
          <p className="text-center text-xs text-slate-400">소셜 로그인</p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => oauth("kakao")}
          >
            카카오로 계속하기
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => oauth("apple")}
          >
            Apple로 계속하기
          </Button>
          <p className="text-center text-xs text-slate-400">
            Supabase Authentication → Providers에서 Kakao/Apple을 켠 뒤 사용할 수
            있습니다.
          </p>
        </div>

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
            <button
              className="hover:underline"
              onClick={() => setMode("signup")}
            >
              계정이 없나요? 회원가입
            </button>
          ) : mode === "signup" ? (
            <button
              className="hover:underline"
              onClick={() => setMode("signin")}
            >
              이미 계정이 있나요? 로그인
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
