import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LMI_TENANT_ID = "8686f826-8c17-4edc-9e7b-c042bdf52cd7";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure the user has a profile row (auto-create for new OAuth users)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!profile) {
          const fullName =
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email ??
            "";

          await supabase.from("profiles").insert({
            id: user.id,
            tenant_id: LMI_TENANT_ID,
            role: "user",
            full_name: fullName,
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to the login page with an error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
