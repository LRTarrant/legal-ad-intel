# GA4 Admin Dashboard — Setup (OAuth2 refresh token)

Setup runbook for the `/admin/analytics` Site Analytics dashboard (PR #271, `web/lib/ga4.ts`).

**Auth method: OAuth2 user refresh token — NOT a service-account key.** The code uses
`UserRefreshClient` because some Google Cloud orgs block service-account key creation. Ignore any
older note that mentions `GA_CLIENT_EMAIL` / `GA_PRIVATE_KEY` — those are not read by the code.

The four env vars the code actually reads (`web/lib/ga4.ts` → `getGa4Config()`):

| Env var            | What it is                                              |
|--------------------|--------------------------------------------------------|
| `GA4_PROPERTY_ID`  | Numeric GA4 property ID (not the `G-XXXX` measurement ID) |
| `GA_CLIENT_ID`     | OAuth2 client ID                                       |
| `GA_CLIENT_SECRET` | OAuth2 client secret                                   |
| `GA_REFRESH_TOKEN` | Long-lived refresh token minted once via the steps below |

---

## 1. Get the GA4 property ID

GA4 → **Admin** (gear, bottom-left) → **Property details** → copy **Property ID** (a number like
`123456789`). This is `GA4_PROPERTY_ID`. It is NOT the `G-` measurement ID used for client-side tags.

## 2. Enable the Data API

Google Cloud Console (https://console.cloud.google.com) → pick/create a project →
**APIs & Services → Library** → search **"Google Analytics Data API"** → **Enable**.

## 3. Configure the OAuth consent screen

**APIs & Services → OAuth consent screen**:
- User type: **External** (or Internal if this is a Workspace org and you'll auth with a Workspace account).
- App name, your email for support + developer contact. Save.
- **Scopes**: add `https://www.googleapis.com/auth/analytics.readonly`. Save.
- **Test users**: add the Google account that has access to the GA4 property (e.g. your own).
  Leaving the app in "Testing" is fine — refresh tokens for test users on a readonly internal tool
  don't expire on the 7-day testing clock the way some scopes do, but if the token ever stops
  working, re-run step 5 to mint a fresh one (or click **Publish app** to remove the testing limit).

## 4. Create the OAuth2 client credentials

**APIs & Services → Credentials → Create credentials → OAuth client ID**:
- Application type: **Web application**.
- Name: e.g. `LMI GA4 Dashboard`.
- **Authorized redirect URIs** → add exactly:
  `https://developers.google.com/oauthplayground`
- Create. Copy the **Client ID** (`GA_CLIENT_ID`) and **Client secret** (`GA_CLIENT_SECRET`).

## 5. Mint the refresh token (OAuth Playground)

1. Go to https://developers.google.com/oauthplayground
2. Click the **gear icon** (top-right) → check **"Use your own OAuth credentials"** → paste the
   Client ID + Client secret from step 4. Close the panel.
3. Left panel, **Step 1**: in the "Input your own scopes" box paste:
   `https://www.googleapis.com/auth/analytics.readonly`
   → click **Authorize APIs**.
4. Sign in with the Google account that can see the GA4 property → grant access.
   (If you see "Google hasn't verified this app", click **Advanced → Go to … (unsafe)** — it's your
   own app.)
5. **Step 2**: click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** value (starts with `1//`). That is `GA_REFRESH_TOKEN`.
   It's long-lived — you mint it once.

## 6. Grant the GA4 property access

The token inherits the permissions of the Google account you authorized in step 5. That account must
have at least **Viewer** on the GA4 property:
GA4 → **Admin → Property Access Management** → confirm the account is listed (add with **Viewer** if not).

## 7. Set the env vars in Vercel

Vercel → project → **Settings → Environment Variables** → add to **Production** and **Preview**:

```
GA4_PROPERTY_ID   = 123456789
GA_CLIENT_ID      = xxxx.apps.googleusercontent.com
GA_CLIENT_SECRET  = GOCSPX-xxxx
GA_REFRESH_TOKEN  = 1//xxxx
```

Redeploy (or it applies on the next deploy). No newline-escaping needed — none of these are multi-line.

## 8. Verify

- Sign in as a `tenant_admin` / `super_admin` → visit `/admin/analytics` → KPI cards + tables render.
- Sign in as a non-admin (`manager` / `user`) → redirected away; `/api/admin/analytics/summary` returns 403.
- Signed out → the API returns 401.
- If the env vars are missing, the API returns **503** with a config-missing message (graceful, not a crash).

## Troubleshooting

- **503 "Google Analytics is not configured"** — one of the four env vars is unset/empty in that environment.
- **502 / "PERMISSION_DENIED"** — the authorized account lacks Viewer on the property (step 6), or the
  Data API isn't enabled (step 2).
- **`invalid_grant` on refresh** — the refresh token was revoked or expired (e.g. app left in Testing and
  past the limit). Re-run step 5 and update `GA_REFRESH_TOKEN`.
