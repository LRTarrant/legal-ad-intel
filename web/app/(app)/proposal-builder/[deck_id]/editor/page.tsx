import type { Metadata } from "next";
import { ProposalEditorClient } from "./proposal-editor-client";
import { getAllMassTorts } from "@/lib/queries";
import type { PickOption } from "../../_components/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Proposal | Legal Marketing Intelligence",
};

/**
 * Tort Page picker options are sourced from the live mass_torts catalog so
 * the picker only offers torts that the renderer can actually resolve
 * (Phase 2.1 issue #4 — the old hardcoded list drifted: it offered
 * "ai-suicide" / "olympus-scopes" which don't exist in mass_torts). Falls
 * back to the static catalog list in the client if the fetch fails.
 */
async function loadTortOptions(): Promise<PickOption[] | undefined> {
  try {
    const torts = await getAllMassTorts();
    if (!torts.length) return undefined;
    return torts
      .map((t) => ({ value: t.slug, label: t.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return undefined;
  }
}

export default async function ProposalEditorPage({
  params,
}: {
  params: Promise<{ deck_id: string }>;
}) {
  const { deck_id } = await params;
  const tortOptions = await loadTortOptions();
  return <ProposalEditorClient deckId={deck_id} tortOptions={tortOptions} />;
}
