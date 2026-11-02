import Image from "next/image";
import { StatusDots } from "@/components/landing/StatusDots";

export function CoupangScene({
  size = "default",
}: {
  size?: "hero" | "default";
}) {
  const hero = size === "hero";

  return (
    <div className="relative w-full">
      <div
        className={`overflow-hidden border border-slate-200 bg-white ${
          hero ? "rounded-none border-x-0 border-t-0 lg:rounded-2xl lg:border" : "rounded-2xl"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 font-landing-mono text-[10px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="ml-2 truncate">coupang.com / vp / products / 190ml</span>
        </div>
        <div
          className={`grid gap-0 bg-white ${
            hero
              ? "grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
              : "grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr]"
          }`}
        >
          <div className={`relative bg-slate-100 ${hero ? "min-h-[52vh] md:min-h-[70vh]" : "min-h-[14rem]"}`}>
            <Image
              src="/landing/landing-pack.png"
              alt="언스위트 아몬드 음료 팩"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 55vw, 100vw"
              priority={hero}
            />
          </div>
          <div className={`flex flex-col justify-center bg-white ${hero ? "p-8 lg:p-12" : "p-5"}`}>
            <p className="font-landing-mono text-[10px] text-slate-400">아몬드음료 · 190ml</p>
            <p className={`mt-2 font-semibold leading-snug tracking-tight ${hero ? "text-3xl lg:text-4xl" : "text-xl"}`}>
              언스위트 아몬드 음료
            </p>
            <p className={`mt-3 font-medium ${hero ? "text-2xl" : "text-[15px]"}`}>3,280원</p>
            <div className="mt-6 space-y-2 text-[13px] leading-relaxed text-slate-500">
              <p>원재료명 · 아몬드, 정제수, 탄산칼슘</p>
              <p>영양정보 · 당류 0g / 나트륨 90mg</p>
            </div>
            <div className="mt-8 h-11 w-full max-w-xs rounded-lg bg-[#047857] text-center text-sm font-semibold leading-[2.75rem] text-white">
              장바구니 담기
            </div>
          </div>
        </div>
      </div>
      <StatusDots
        className={`absolute ${
          hero ? "bottom-4 right-4 sm:bottom-8 sm:right-8" : "-bottom-4 right-3 sm:right-4"
        }`}
      />
    </div>
  );
}
