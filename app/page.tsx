import { IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnvOptional } from "@/lib/supabase/env";
import { LandingView } from "@/components/landing/LandingView";

const landingSans = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-landing-sans",
  display: "swap",
});

const landingMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-landing-mono",
  display: "swap",
});

export default async function HomePage() {
  let loggedIn = false;
  if (getSupabaseEnvOptional()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = !!user;
  }

  return (
    <div className={`${landingSans.variable} ${landingMono.variable} font-landing`}>
      <LandingView loggedIn={loggedIn} />
    </div>
  );
}
