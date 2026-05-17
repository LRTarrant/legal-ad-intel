import type { Metadata } from "next";
import { ProposalEditorClient } from "./proposal-editor-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit Proposal | Legal Marketing Intelligence",
};

export default async function ProposalEditorPage({
  params,
}: {
  params: Promise<{ deck_id: string }>;
}) {
  const { deck_id } = await params;
  return <ProposalEditorClient deckId={deck_id} />;
}
