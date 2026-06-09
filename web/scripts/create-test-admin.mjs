// Create (or repair) the dedicated QA admin account used for browser testing.
//
//   cd web
//   node --env-file=.env.local scripts/create-test-admin.mjs            # DRY RUN (default)
//   node --env-file=.env.local scripts/create-test-admin.mjs --live     # actually write
//
// Dry run introspects the live `profiles` table + resolves the owner tenant and
// prints exactly what it WOULD do. The live run creates an email+password auth
// user (email pre-confirmed), upserts a tenant_admin profiles row, and appends
// LMI_TEST_ADMIN_EMAIL / LMI_TEST_ADMIN_PASSWORD to .env.local for reuse.
//
// Writes to the PRODUCTION Supabase project (the URL in .env.local). Inspect the
// dry-run output before passing --live.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";

const LIVE = process.argv.includes("--live");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.LMI_OWNER_EMAIL || "lancetarrant@legalmarketingintelligence.com";
const email = process.env.LMI_TEST_ADMIN_EMAIL || "lmi-qa-admin@legalmarketingintelligence.com";
let password = process.env.LMI_TEST_ADMIN_PASSWORD || `QA-${randomBytes(12).toString("base64url")}`;

if (!url || !key) {
  console.error("❌ Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const log = (...a) => console.log(...a);
log(`Mode: ${LIVE ? "LIVE WRITE" : "DRY RUN"}  ·  project: ${url}`);

// Resolve the owner's tenant so the QA admin lands in the same tenant.
// profiles has no email column, so find the owner's auth user id first.
const { data: ownerList, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) { console.error("❌ listUsers failed:", listErr.message); process.exit(1); }
const ownerUser = ownerList.users.find((u) => u.email === OWNER_EMAIL);
if (!ownerUser) { console.error(`❌ no auth user for ${OWNER_EMAIL} (set LMI_OWNER_EMAIL)`); process.exit(1); }

const { data: owner, error: ownerErr } = await admin
  .from("profiles")
  .select("*")
  .eq("id", ownerUser.id)
  .maybeSingle();

if (ownerErr) { console.error("❌ owner profile lookup failed:", ownerErr.message); process.exit(1); }
if (!owner) { console.error(`❌ no profiles row for ${OWNER_EMAIL}`); process.exit(1); }

const tenantId = process.env.LMI_TEST_TENANT_ID || owner.tenant_id;
log(`Owner profile columns: ${Object.keys(owner).join(", ")}`);
log(`Resolved tenant_id: ${tenantId}`);
log(`QA admin email: ${email}  ·  role: tenant_admin`);

if (!LIVE) {
  log("\n(dry run — no writes) Re-run with --live to create the account.");
  process.exit(0);
}

// 1) Create the auth user (or reuse if it already exists).
let userId;
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "LMI QA Admin" },
});
if (created.error) {
  if (/already.*registered|exists/i.test(created.error.message)) {
    log("User already exists — looking it up + resetting password.");
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list.users.find((u) => u.email === email);
    if (!existing) { console.error("❌ exists but not found in first page"); process.exit(1); }
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    console.error("❌ createUser failed:", created.error.message);
    process.exit(1);
  }
} else {
  userId = created.data.user.id;
}
log(`auth user id: ${userId}`);

// 2) Upsert the profiles row as tenant_admin in the owner's tenant.
const row = { id: userId, role: "tenant_admin", tenant_id: tenantId };
if ("email" in owner) row.email = email;
if ("full_name" in owner) row.full_name = "LMI QA Admin";
const { error: upErr } = await admin.from("profiles").upsert(row, { onConflict: "id" });
if (upErr) { console.error("❌ profiles upsert failed:", upErr.message); process.exit(1); }
log("✅ profiles row upserted (tenant_admin).");

// 3) Persist creds to .env.local for reuse if not already there.
if (!process.env.LMI_TEST_ADMIN_PASSWORD) {
  appendFileSync(".env.local", `\nLMI_TEST_ADMIN_EMAIL=${email}\nLMI_TEST_ADMIN_PASSWORD=${password}\n`);
  log("✅ appended LMI_TEST_ADMIN_EMAIL / LMI_TEST_ADMIN_PASSWORD to .env.local");
}

log(`\n✅ Done. QA admin ready:\n   email:    ${email}\n   password: ${password}`);
