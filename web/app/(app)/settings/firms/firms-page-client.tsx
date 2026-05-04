"use client";

/**
 * Settings \u2192 Firms page. Renders one of two views based on buyer_type:
 *
 *   law_firm        \u2192 single edit form for the user's self-firm.
 *                     "My Firm" header, no list view, no add button.
 *   ad_agency       \u2192 list of managed firms with edit + add controls.
 *   media_company   \u2192 same as agency.
 *
 * Brand profile fields (voice descriptors, differentiators, etc.) are
 * the foundation Phase 1.5 will use to write brand-aware PI prompts.
 * Storing them now means the LLM has signal the moment we wire it up.
 */

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useFirms } from "@/lib/firms/use-firms";
import type { FirmWithRole, UpdateFirmInput } from "@/lib/firms/types";
import { AutoFillPanel } from "./auto-fill-panel";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

export function FirmsPageClient() {
  const firmsResult = useFirms();
  const [editingFirmId, setEditingFirmId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  if (firmsResult.loading) {
    return <div className="text-sm text-slate-gray">Loading\u2026</div>;
  }
  if (firmsResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Couldn&apos;t load firms: {firmsResult.error.message}
      </div>
    );
  }

  // Law firm view: edit the single self-firm in place.
  if (firmsResult.buyerType === "law_firm") {
    const firm = firmsResult.selfFirm ?? firmsResult.firms[0];
    if (!firm) {
      return (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          Setting up your firm profile\u2026 try refreshing in a moment.
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          My Firm
        </h2>
        <FirmEditCard
          firm={firm}
          onSaved={() => firmsResult.refresh()}
        />
      </div>
    );
  }

  // Agency / media view: list + add + edit.
  const editingFirm = firmsResult.firms.find((f) => f.id === editingFirmId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Client Firms
        </h2>
        <button
          onClick={() => {
            setCreatingNew(true);
            setEditingFirmId(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-intelligence-teal px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add client
        </button>
      </div>

      {creatingNew && (
        <FirmCreateCard
          onSaved={() => {
            setCreatingNew(false);
            firmsResult.refresh();
          }}
          onCancel={() => setCreatingNew(false)}
        />
      )}

      {firmsResult.firms.length === 0 && !creatingNew ? (
        <div className="rounded-md border border-cloud bg-white p-6 text-center text-sm text-slate-gray">
          You haven&apos;t added any client firms yet.
          <br />
          Click &quot;Add client&quot; to create your first one.
        </div>
      ) : (
        <ul className="divide-y divide-cloud rounded-lg border border-cloud bg-white">
          {firmsResult.firms.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setEditingFirmId(f.id === editingFirmId ? null : f.id)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-cloud/40"
              >
                <div>
                  <div className="font-semibold text-midnight-navy">{f.label}</div>
                  <div className="text-xs text-slate-gray">
                    {f.website_url ?? "No website set"}
                    {f.default_state ? ` \u00b7 ${f.default_state}` : ""}
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wider text-slate-gray">
                  {f.current_user_role}
                </span>
              </button>
              {editingFirm?.id === f.id && (
                <div className="border-t border-cloud bg-cloud/20 p-4">
                  <FirmEditCard
                    firm={f}
                    onSaved={() => {
                      setEditingFirmId(null);
                      firmsResult.refresh();
                    }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Edit + create cards                                                      */
/* ──────────────────────────────────────────────────────────────────────── */

interface FirmEditCardProps {
  firm: FirmWithRole;
  onSaved: () => void;
}

function FirmEditCard({ firm, onSaved }: FirmEditCardProps) {
  const [draft, setDraft] = useState<UpdateFirmInput>({
    label: firm.label,
    website_url: firm.website_url ?? "",
    tagline: firm.tagline ?? "",
    voice_descriptors: firm.voice_descriptors,
    differentiators: firm.differentiators,
    partner_names: firm.partner_names,
    signature_phrases: firm.signature_phrases,
    service_areas: firm.service_areas,
    default_state: firm.default_state ?? "",
    notes: firm.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isViewer = firm.current_user_role === "viewer";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithDemoMode(`/api/firms/${firm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          // Send empty string fields back as null so we don't store ""
          website_url: draft.website_url || undefined,
          tagline: draft.tagline || undefined,
          default_state: draft.default_state || undefined,
          notes: draft.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FirmFormFields
      draft={draft}
      onChange={setDraft}
      readOnly={isViewer}
      autoFill={
        !isViewer ? (
          <AutoFillPanel
            firm={firm}
            draftUrl={draft.website_url ?? ""}
            onApplied={onSaved}
          />
        ) : null
      }
      footer={
        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || isViewer}
            className="inline-flex items-center gap-2 rounded-lg bg-intelligence-teal px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
      }
    />
  );
}

interface FirmCreateCardProps {
  onSaved: () => void;
  onCancel: () => void;
}

function FirmCreateCard({ onSaved, onCancel }: FirmCreateCardProps) {
  const [draft, setDraft] = useState<UpdateFirmInput>({ label: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithDemoMode("/api/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Create failed (${res.status})`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-intelligence-teal bg-white p-4">
      <h3 className="mb-3 font-heading text-lg font-semibold text-midnight-navy">
        Add client firm
      </h3>
      <FirmFormFields
        draft={draft}
        onChange={setDraft}
        footer={
          <div className="flex items-center justify-end gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              onClick={onCancel}
              className="text-sm font-medium text-slate-gray hover:text-midnight-navy"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !draft.label?.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-intelligence-teal px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Creating\u2026" : "Create firm"}
            </button>
          </div>
        }
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Shared form fields                                                       */
/* ──────────────────────────────────────────────────────────────────────── */

interface FirmFormFieldsProps {
  draft: UpdateFirmInput;
  onChange: (next: UpdateFirmInput) => void;
  readOnly?: boolean;
  /** Optional auto-fill panel slot. Rendered below the website URL
   * field when present. Only the edit card passes this; the create
   * card omits it because there's no firm.id to call the route with. */
  autoFill?: React.ReactNode;
  footer: React.ReactNode;
}

function FirmFormFields({
  draft,
  onChange,
  readOnly,
  autoFill,
  footer,
}: FirmFormFieldsProps) {
  const update = (patch: Partial<UpdateFirmInput>) =>
    onChange({ ...draft, ...patch });

  return (
    <div className="space-y-5">
      <Field label="Firm name" required>
        <input
          type="text"
          value={draft.label ?? ""}
          onChange={(e) => update({ label: e.target.value })}
          disabled={readOnly}
          placeholder="Smith & Jones LLP"
          className={baseInputCls}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Website URL">
          <input
            type="url"
            value={draft.website_url ?? ""}
            onChange={(e) => update({ website_url: e.target.value })}
            disabled={readOnly}
            placeholder="https://example.com"
            className={baseInputCls}
          />
        </Field>
        <Field label="Default state" hint="Two-letter code (e.g. AL)">
          <input
            type="text"
            value={draft.default_state ?? ""}
            onChange={(e) => update({ default_state: e.target.value.toUpperCase().slice(0, 2) })}
            disabled={readOnly}
            placeholder="AL"
            className={baseInputCls}
          />
        </Field>
      </div>

      {autoFill && <div>{autoFill}</div>}

      <Field label="Tagline" hint="One line. The firm's brand-line.">
        <input
          type="text"
          value={draft.tagline ?? ""}
          onChange={(e) => update({ tagline: e.target.value })}
          disabled={readOnly}
          placeholder="We fight for what's right."
          className={baseInputCls}
        />
      </Field>

      <ChipsField
        label="Voice descriptors"
        hint="How the firm sounds. e.g. empathetic, no-nonsense, local."
        values={draft.voice_descriptors ?? []}
        onChange={(values) => update({ voice_descriptors: values })}
        readOnly={readOnly}
        placeholder="Add a descriptor and press Enter"
      />

      <ChipsField
        label="Differentiators"
        hint="What sets the firm apart. e.g. 20 years in Birmingham."
        values={draft.differentiators ?? []}
        onChange={(values) => update({ differentiators: values })}
        readOnly={readOnly}
        placeholder="Add a differentiator and press Enter"
      />

      <ChipsField
        label="Partner names"
        hint="Attorneys the firm wants referenced in scripts."
        values={draft.partner_names ?? []}
        onChange={(values) => update({ partner_names: values })}
        readOnly={readOnly}
        placeholder="Add an attorney name"
      />

      <ChipsField
        label="Signature phrases"
        hint="Phrases the firm consistently uses. The LLM will weave them in."
        values={draft.signature_phrases ?? []}
        onChange={(values) => update({ signature_phrases: values })}
        readOnly={readOnly}
        placeholder="Add a phrase"
      />

      <ChipsField
        label="Service areas"
        hint="Counties, cities, regions the firm serves."
        values={draft.service_areas ?? []}
        onChange={(values) => update({ service_areas: values })}
        readOnly={readOnly}
        placeholder="Add a region"
      />

      <Field label="Internal notes" hint="Free-form. Not used in scripts.">
        <textarea
          value={draft.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          disabled={readOnly}
          rows={3}
          className={baseInputCls}
        />
      </Field>

      {footer}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Field primitives                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

const baseInputCls =
  "w-full rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30 disabled:opacity-60";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-gray">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-gray">{hint}</span>}
    </label>
  );
}

interface ChipsFieldProps {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

function ChipsField({
  label,
  hint,
  values,
  onChange,
  readOnly,
  placeholder,
}: ChipsFieldProps) {
  const [draft, setDraft] = useState("");
  function add() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  }
  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full bg-cloud px-3 py-1 text-xs text-midnight-navy"
          >
            {v}
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(v)}
                className="text-slate-gray hover:text-red-600"
                aria-label={`Remove ${v}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={() => draft.trim() && add()}
          placeholder={placeholder}
          className={`${baseInputCls} mt-2`}
        />
      )}
    </Field>
  );
}
