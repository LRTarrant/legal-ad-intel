"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export interface Entitlement {
  campaign_builder_pi: boolean;
  campaign_builder_mass_tort: boolean;
  geo_scope_unlimited: boolean;
  geo_scope_states: string[] | null;
  status: string;
  campaign_builder_monthly_cap: number | null;
}

const STATUS_OPTIONS = ["active", "trialing", "past_due", "cancelled"] as const;

/** A labelled checkbox row, styled to the admin page's slate palette. */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
      />
      <span>
        <span className="block text-sm font-medium text-charcoal">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * super_admin-only editor for a user's campaign-builder entitlements. Writes to
 * the per-user subscriptions row via PATCH /api/admin/users/[id]/subscription.
 */
export function EntitlementEditor({
  userId,
  userLabel,
  current,
  accentColor,
  onClose,
  onSaved,
}: {
  userId: string;
  userLabel: string;
  current: Entitlement | null;
  accentColor: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [pi, setPi] = useState(current?.campaign_builder_pi ?? false);
  const [mt, setMt] = useState(current?.campaign_builder_mass_tort ?? false);
  const [unlimited, setUnlimited] = useState(current?.geo_scope_unlimited ?? true);
  const [statesText, setStatesText] = useState((current?.geo_scope_states ?? []).join(", "));
  const [status, setStatus] = useState(current?.status ?? "active");
  const [capText, setCapText] = useState(
    current?.campaign_builder_monthly_cap != null ? String(current.campaign_builder_monthly_cap) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const cap = capText.trim() === "" ? null : Number(capText);
    if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
      setError("Monthly cap must be a non-negative number, or blank for unlimited.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_builder_pi: pi,
          campaign_builder_mass_tort: mt,
          geo_scope_unlimited: unlimited,
          geo_scope_states: unlimited
            ? []
            : statesText.split(",").map((s) => s.trim()).filter(Boolean),
          status,
          campaign_builder_monthly_cap: cap,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(j?.error ?? `Failed to save (${res.status})`);
      onSaved(`Access updated for ${userLabel}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manage access"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">Manage access</h3>
            <p className="mt-0.5 text-sm text-slate-500">{userLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <Toggle
            label="Personal Injury Campaign Builder"
            hint="Unlocks the PI builder and state Strategy Engine"
            checked={pi}
            onChange={setPi}
          />
          <Toggle
            label="Mass Tort Campaign Builder"
            checked={mt}
            onChange={setMt}
          />
        </div>

        <div className="mt-5">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Geographic scope
          </span>
          <div className="mt-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="geo"
                checked={unlimited}
                onChange={() => setUnlimited(true)}
                className="h-4 w-4 border-slate-300"
              />
              All states
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="geo"
                checked={!unlimited}
                onChange={() => setUnlimited(false)}
                className="h-4 w-4 border-slate-300"
              />
              Specific states
            </label>
            {!unlimited && (
              <input
                type="text"
                value={statesText}
                onChange={(e) => setStatesText(e.target.value)}
                placeholder="AL, GA, TN"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Monthly cap
            </span>
            <input
              type="number"
              min={0}
              value={capText}
              onChange={(e) => setCapText(e.target.value)}
              placeholder="Unlimited"
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: accentColor }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save access
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact summary chips for the Access column. */
export function entitlementSummary(e: Entitlement | null): string {
  if (!e) return "No subscription";
  const parts: string[] = [];
  if (e.campaign_builder_pi) parts.push("PI");
  if (e.campaign_builder_mass_tort) parts.push("Mass Tort");
  if (parts.length === 0) parts.push("No builder access");
  const geo = e.geo_scope_unlimited
    ? "all states"
    : `${(e.geo_scope_states ?? []).length} state${(e.geo_scope_states ?? []).length === 1 ? "" : "s"}`;
  return `${parts.join(" · ")} · ${geo}`;
}
