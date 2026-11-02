import Image from "next/image";
import { CoupangScene } from "@/components/landing/CoupangScene";
import { LandingMatrix } from "@/components/landing/LandingMatrix";
import { StatusLegend } from "@/components/landing/StatusLegend";
import { Reveal } from "@/components/landing/Reveal";

const OUTCOMES = [
  {
    kicker: "01",
    title: "검색과 메모를 오가지 않음",
    body: "아이 당류, 성인 나트륨, 강아지가 피하는 원재료는 프로필에 이미 있습니다. 상품 페이지에서 그 기준과만 맞춥니다.",
  },
  {
    kicker: "02",
    title: "장바구니를 사람마다 다시 읽지 않음",
    body: "상품이 세 개여도 결과는 한 표입니다. 같은 젤리를 아이 기준으로 한 번, 어른 기준으로 또 읽지 않습니다.",
  },
  {
    kicker: "03",
    title: "표시가 없으면 비워 둠",
    body: "사진만 있는 상세는 정보 부족입니다. 없는 당류를 지어내지 않고, 사람 식품에서 강아지 결과는 빼 둡니다.",
  },
];

export function LandingEffect() {
  return (
    <section id="effect" className="scroll-mt-8 bg-slate-50">
      <Reveal className="px-4 pt-16 lg:px-14 lg:pt-24">
        <p className="font-landing-mono text-[11px] text-emerald-700">기대효과</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight lg:text-5xl">
          결제 전에 이미
          <br />
          가족별로 끝난 화면입니다.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">
          상품 페이지를 연 순간에, 아이·성인 결과가 이미 떠 있습니다.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-3 px-4 lg:grid-cols-2 lg:px-14">
        <Reveal>
          <figure className="relative min-h-[22rem] overflow-hidden rounded-2xl lg:min-h-[28rem]">
            <Image
              src="/landing/landing-before.png"
              alt="원재료명을 노트북으로 다시 읽는 장면"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-5 py-5 text-white">
              <p className="font-landing-mono text-[11px] text-slate-300">이전</p>
              <p className="mt-1 text-lg font-semibold">상세를 열고, 검색하고, 메모를 번갈아 봄</p>
            </figcaption>
          </figure>
        </Reveal>
        <Reveal delayMs={100}>
          <div className="flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 lg:min-h-[28rem] lg:p-6">
            <p className="mb-3 font-landing-mono text-[11px] text-emerald-700">이후 · 같은 상품</p>
            <CoupangScene />
            <p className="mt-8 text-lg font-semibold">상품 페이지에서 아이·성인 결과가 이미 떠 있음</p>
          </div>
        </Reveal>
      </div>

      <div className="mt-3 grid gap-3 px-4 sm:grid-cols-3 lg:px-14">
        {OUTCOMES.map((row, i) => (
          <Reveal key={row.kicker} delayMs={i * 80}>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-landing-mono text-[11px] text-emerald-700">{row.kicker}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug">{row.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{row.body}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal className="space-y-6 px-4 py-12 lg:px-14 lg:py-16">
        <LandingMatrix />
        <StatusLegend />
      </Reveal>
    </section>
  );
}
