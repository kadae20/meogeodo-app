"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  Monitor,
  ShieldCheck,
  Smartphone,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ExtensionsNav } from "@/components/extensions/ExtensionsNav";

type Status = {
  version: string;
  channel: string;
  store: string;
  chrome_min: string;
};

const STEPS = [
  {
    n: "1",
    title: "ZIP 다운로드",
    body: "아래 다운로드 버튼을 누릅니다. 로그인할 필요는 없습니다.",
  },
  {
    n: "2",
    title: "ZIP 압축 해제",
    body: "받은 ZIP을 계속 둘 폴더에 풉니다. 설치 후 이 폴더를 옮기거나 지우지 마세요.",
  },
  {
    n: "3",
    title: "확장프로그램 관리 열기",
    body: "PC Chrome 주소창에 chrome://extensions 를 입력합니다.",
  },
  {
    n: "4",
    title: "개발자 모드 켜기",
    body: "화면 오른쪽 위의 개발자 모드 스위치를 켭니다.",
  },
  {
    n: "5",
    title: "압축해제된 확장 프로그램 로드",
    body: "왼쪽 위의 ‘압축해제된 확장 프로그램을 로드합니다’를 누릅니다.",
  },
  {
    n: "6",
    title: "manifest.json이 있는 폴더 선택",
    body: "푼 폴더 안에서 manifest.json이 바로 보이는 폴더를 고릅니다.",
  },
];

export default function ExtensionsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    fetch("/api/extension/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
  }, []);

  const installUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/extensions`;

  async function copyLink() {
    await navigator.clipboard.writeText(installUrl);
    toast.success("설치 페이지 링크를 복사했습니다.");
  }

  async function sendToPc() {
    const title = "먹어도될까 PC Chrome 확장프로그램";
    const text = `PC Chrome에서 이 링크를 열고 설치하세요.\n${installUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: installUrl });
        return;
      } catch {
        /* 사용자가 취소하면 메일로 */
      }
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <ExtensionsNav />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              PC Chrome 확장프로그램
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              쿠팡 상품을 열면
              <br />
              가족 기준이 바로 보입니다.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              우측 하단에 작은 카드가 뜨고, 민준·엄마처럼 프로필마다 초록·노랑·빨강
              점으로 표시합니다. 웹스토어 공개 전까지는 개발자 모드로 설치합니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatusOpen(true);
                  document.getElementById("deploy-status")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                배포 상태 확인
              </button>
              <a
                href="/api/extension/zip"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                <Download className="h-4 w-4" />
                ZIP 다운로드
              </a>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white">설치 환경</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <Monitor className="mt-0.5 h-4 w-4 text-emerald-400" />
                <span>
                  <strong className="text-white">설치·실행</strong>
                  <br />
                  Windows 또는 macOS의 PC Chrome
                </span>
              </li>
              <li className="flex gap-3">
                <Smartphone className="mt-0.5 h-4 w-4 text-amber-300" />
                <span>
                  <strong className="text-white">모바일</strong>
                  <br />
                  설치 불가. PC로 링크만 보낼 수 있습니다.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-300" />
                <span>
                  <strong className="text-white">권한</strong>
                  <br />
                  쿠팡 상품 페이지 읽기, 먹어도될까 로그인 쿠키
                </span>
              </li>
            </ul>
            <button
              type="button"
              onClick={sendToPc}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-medium hover:bg-white/5"
            >
              <Send className="h-4 w-4" />
              PC로 설치 링크 보내기
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs text-slate-400 hover:text-white"
            >
              <Copy className="h-3.5 w-3.5" />
              링크 복사
            </button>
          </aside>
        </div>

        <section id="deploy-status" className="mt-16">
          <h2 className="text-xl font-bold text-white">배포 상태</h2>
          <p className="mt-2 text-sm text-slate-400">
            필요한 기능과 조건을 먼저 확인하세요.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            {statusOpen || status ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">채널</dt>
                  <dd className="font-medium text-white">
                    {status?.channel ?? "제한 배포"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">버전</dt>
                  <dd className="font-medium text-white">
                    v{status?.version ?? "0.1.0"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Chrome 웹스토어</dt>
                  <dd className="font-medium text-white">
                    {status?.store ?? "준비 중"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">최소 Chrome</dt>
                  <dd className="font-medium text-white">
                    {status?.chrome_min ?? "116"} 이상
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">상태를 불러오는 중…</p>
            )}
            <p className="mt-4 text-xs text-slate-500">
              쿠팡 상품 상세에서만 카드가 뜹니다. 검수 전에{" "}
              <Link href="/login" className="text-emerald-300 underline">
                앱 로그인
              </Link>
              과 가족 프로필이 있어야 합니다.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-xl font-bold text-white">온보딩 · 설치</h2>
          <p className="mt-2 text-sm text-slate-400">
            ZIP 압축 해제 후 폴더를 Chrome에 등록합니다.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                  {s.n}
                </div>
                <h3 className="mt-3 font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500">
            개발 중이라면 ZIP 대신 저장소의{" "}
            <code className="text-slate-300">extension</code> 폴더를 그대로
            로드해도 됩니다. 폴더를 옮기면 Chrome에서 다시 등록해야 합니다.
          </p>
        </section>
      </main>
    </div>
  );
}
