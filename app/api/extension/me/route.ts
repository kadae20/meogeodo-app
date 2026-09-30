import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const { data: profiles } = await supabase
    .from("family_profiles")
    .select("id, name")
    .order("created_at");

  return NextResponse.json({
    email: user.email,
    profiles: profiles ?? [],
  });
}
