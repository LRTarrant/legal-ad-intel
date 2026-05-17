"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Trash2 } from "lucide-react";
import type {
  ProposalRow,
  ListProposalsResponse,
  CreateProposalResponse,
} from "@/lib/proposal-builder/types";

export function ProposalListClient() {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/proposal/list?limit=50", {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? `Failed to load (${res.status})`);
        }
        const data = (await res.json()) as ListProposalsResponse;
        if (cancelled) return;
        setProposals(data.proposals);
        setTotal(data.total);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Failed to load proposals",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createDeck() {
    const title = window.prompt("Name your new deck", "Untitled Proposal");
    if (title === null) return;
    const trimmed = title.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const res = await fetch("/api/proposal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Create failed (${res.status})`);
      }
      const data = (await res.json()) as CreateProposalResponse;
      router.push(`/proposal-builder/${data.id}/editor`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create deck");
      setCreating(false);
    }
  }

  async function deleteDeck(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const prev = proposals;
    setProposals((p) => p.filter((x) => x.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    const res = await fetch(`/api/proposal/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setProposals(prev);
      setTotal(prev.length);
      alert("Delete failed");
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-gray">
          {loading ? "Loading…" : `${total} deck${total === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={createDeck}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60"
          style={{ backgroundColor: "var(--color-accent, #1A8C96)" }}
        >
          <Plus className="h-4 w-4" />
          {creating ? "Creating…" : "New Deck"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert">
          {error}
        </div>
      )}

      {!loading && proposals.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-gray" />
          <p className="mt-3 text-sm text-slate-gray">
            No decks yet. Create your first proposal to get started.
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {proposals.map((p) => (
          <li
            key={p.id}
            className="group relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <Link
              href={`/proposal-builder/${p.id}/editor`}
              className="block"
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 rounded-md p-2"
                  style={{
                    backgroundColor: "var(--color-primary, #0B1D3A)",
                  }}
                >
                  <FileText className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-midnight-navy">
                    {p.title}
                  </h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-gray">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-gray">
                    Updated{" "}
                    {new Date(p.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </Link>
            <button
              onClick={() => deleteDeck(p.id, p.title)}
              aria-label={`Delete ${p.title}`}
              className="absolute right-2 top-2 rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-alert/10 hover:text-alert group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
