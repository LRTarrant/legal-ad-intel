import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/roles";
import { UserActivityClient } from "./user-activity-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Activity | Admin",
};

export default async function UserActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!isSuperAdmin(profile?.role)) {
    redirect("/overview");
  }

  return <UserActivityClient />;
}
