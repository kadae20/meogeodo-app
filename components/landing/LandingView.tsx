import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingProgress } from "@/components/landing/LandingProgress";
import { LandingCtaForm } from "@/components/landing/LandingCtaForm";
import { CoupangScene } from "@/components/landing/CoupangScene";
import { LandingEffect } from "@/components/landing/LandingEffect";
import { Reveal } from "@/components/landing/Reveal";

export function LandingView({ loggedIn }: { loggedIn: boolean }) {
  const primaryHref = loggedIn ? "/app" : "/login";

  return (
    <div id="top" className="landing-root min-h-screen text-slate-900">
      <LandingNav loggedIn={loggedIn} />
      <LandingProgress />

      <main className="relative z-10">
        <section className="relative min-h-[100dvh] bg-slate-900">
          <Image
            src="/landing/landing-hero.png"
            alt="장보기 전에 상품을 펼쳐 둔 주방"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-slate-950/20" />
          <div className="landing-hero-copy relative flex min-h-[100dvh] flex-col justify-end px-4 pb-10 pt-28 lg:px-14 lg:pb-16">
            <p className="font-landing-mono text-[11px] text-emerald-300">표시와 기준</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              장볼 때마다
              <br />
              원재료를 다시 읽지 않게
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-200">
              아이 당류, 어른 나트륨, 개가 피해야 하는 원재료. 기준은 한 번만 저장하고 쿠팡
              상품 페이지에서 가족별로 봅니다.
            </p>
            {loggedIn ? (
              <Link
                href="/app"
                className="mt-8 inline-flex h-12 w-fit items-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white"
              >
                앱에서 이어서
              </Link>
            ) : (
              <div className="max-w-md [&_input]:border-white/40 [&_input]:text-white [&_input]:placeholder:text-white/50 [&_button]:text-emerald-200">
                <LandingCtaForm />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white px-4 py-10 lg:px-14 lg:py-14">
          <Reveal>
            <p className="mb-4 font-landing-mono text-[11px] text-emerald-700">쿠팡 상품 페이지에서</p>
            <CoupangScene size="hero" />
          </Reveal>
        </section>

        <section id="problem" className="scroll-mt-8 bg-slate-50">
          <figure className="relative min-h-[70vh] w-full">
            <Image
              src="/landing/landing-before.png"
              alt="원재료와 검색, 메모를 오가며 확인하는 장면"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent px-4 py-8 text-white lg:px-14">
              <Reveal>
                <p className="font-landing-mono text-[11px] text-emerald-300">문제</p>
                <h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
                  결제는 빠른데, 기준 확인은 매번 처음부터
                </h2>
              </Reveal>
            </figcaption>
          </figure>
          <div className="grid gap-3 px-4 py-6 lg:grid-cols-2 lg:px-14 lg:py-10">
            <Reveal>
              <figure className="overflow-hidden rounded-2xl bg-white">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/landing/landing-label.png"
                    alt="원재료명과 영양정보 표시"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>
                <figcaption className="p-4 text-sm text-slate-600">
                  사람마다 당류·원재료 기준이 다른데, 상세는 한 덩어리로만 보입니다.
                </figcaption>
              </figure>
            </Reveal>
            <Reveal delayMs={90}>
              <figure className="overflow-hidden rounded-2xl bg-white">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/landing/landing-phone.png"
                    alt="상품 페이지에서 가족별 결과를 보는 휴대전화"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>
                <figcaption className="p-4 text-sm text-slate-600">
                  개·고양이 프로필은 사람 식품에서 빼서, 급여처럼 보이지 않게 합니다.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        <section id="solution" className="scroll-mt-8 bg-white px-4 py-16 lg:px-14 lg:py-24">
          <Reveal>
            <p className="font-landing-mono text-[11px] text-emerald-700">해결</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight lg:text-5xl">
              기준은 앱에 두고,
              <br />
              확인은 쿠팡에서 합니다.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {[
              {
                src: "/landing/landing-pack.png",
                alt: "비교할 상품 팩",
                kicker: "01 저장",
                body: "아이·성인·강아지·고양이 프로필과 규칙을 만듭니다.",
              },
              {
                src: "/landing/landing-label.png",
                alt: "상품 표시를 읽는 장면",
                kicker: "02 읽기",
                body: "쿠팡 상세가 글자면 바로, 이미지면 표면 표시를 읽습니다.",
              },
              {
                src: "/landing/landing-phone.png",
                alt: "확장프로그램 결과",
                kicker: "03 비교",
                body: "최종 상태는 규칙 엔진이 정합니다. 생성형 AI가 통과를 바꾸지 않습니다.",
              },
            ].map((card, i) => (
              <Reveal key={card.kicker} delayMs={i * 90}>
                <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="relative aspect-[4/3]">
                    <Image src={card.src} alt={card.alt} fill className="object-cover" sizes="(min-width: 1024px) 33vw, 100vw" />
                  </div>
                  <figcaption className="p-5">
                    <p className="font-landing-mono text-[11px] text-emerald-700">{card.kicker}</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{card.body}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12">
            <CoupangScene />
          </Reveal>
        </section>

        <LandingEffect />

        <section id="cta" className="scroll-mt-8 px-4 pb-28 pt-16 lg:px-14 lg:pb-36 lg:pt-24">
          <Reveal>
            <p className="font-landing-mono text-[11px] text-emerald-700">시작</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              다음 장보기 전에
              <br />
              기준부터
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-500">
              의학적·수의학적 조언이 아닙니다. 표시가 없으면 정보 부족으로 둡니다.
            </p>
            {loggedIn ? (
              <Link
                href="/app"
                className="mt-10 inline-flex h-12 items-center rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white"
              >
                앱으로 이동
              </Link>
            ) : (
              <LandingCtaForm />
            )}
            <div className="mt-16 flex flex-wrap font-landing-mono text-[12px] text-slate-500">
              <Link href={primaryHref} className="landing-dot p-2">
                {loggedIn ? "앱" : "로그인"}
              </Link>
              <Link href="/extensions" className="landing-dot p-2">
                확장프로그램
              </Link>
              <Link href="/pricing" className="landing-dot p-2">
                플랜
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
