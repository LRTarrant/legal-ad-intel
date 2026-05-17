import type { Metadata } from "next";
import { ProposalListClient } from "./proposal-list-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposal Builder | Legal Marketing Intelligence",
};

export default function ProposalBuilderPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-midnight-navy">
        Proposal Builder
      </h1>
      <p className="mt-2 text-sm text-slate-gray">
        Assemble presentation decks from LMI surfaces — tort pages, state
        intelligence, ad intelligence, campaigns, and your own copy. Save
        drafts and export to PowerPoint.
      </p>
      <ProposalListClient />
    </>
  );
}
