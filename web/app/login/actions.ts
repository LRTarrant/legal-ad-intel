"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login?error=Invalid+credentials");
  }

  // Fire-and-forget login activity tracking — never block the login flow
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role !== "super_admin") {
        await supabase.from("activity_log").insert({
          tenant_id: profile.tenant_id,
          user_id: user.id,
          event_type: "login",
          page_path: "/login",
          metadata: {},
        });
      }
    }
  } catch {
    // Never block login on tracking failure
  }

  revalidatePath("/", "layout");
  redirect("/overview");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
