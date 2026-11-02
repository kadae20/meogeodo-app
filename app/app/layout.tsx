import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { count } = await supabase
    .from("family_profiles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell
      email={user.email ?? ""}
      displayName={profile?.display_name}
      profileCount={count ?? 0}
    >
      {children}
    </AppShell>
  );
}
