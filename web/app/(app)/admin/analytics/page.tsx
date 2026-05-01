import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsAdmin } from "./analytics-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Site Analytics | Admin",
};

export default async function AdminAnalyticsPage() {
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

  if (!profile || !["tenant_admin", "super_admin"].includes(profile.role)) {
    redirect("/overview");
  }

  return <AnalyticsAdmin />;
}
