"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import type {
  BlockType,
  ProposalBlockRow,
  GetProposalResponse,
} from "@/lib/proposal-builder/types";
import { BLOCK_TYPES } from "@/lib/proposal-builder/types";
import {
  TORT_OPTIONS,
  STATE_OPTIONS,
  AD_INTEL_OPTIONS,
  BLOCK_TYPE_META,
} from "../../_components/catalog";

interface CampaignLite {
  id: string;
  name: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Build the block_data payload + a display label for a picked target. */
function buildBlockData(
  type: BlockType,
  value: string,
  label: string,
  custom?: { title: string; content: string },
): Record<string, unknown> {
  switch (type) {
    case "tort_page":
      return { tort_slug: value, label };
    case "state_intel":
      return { state_abbr: value, label };
    case "ad_intel":
      return { surface: value, label };
    case "campaign":
      return { campaign_id: value, label };
    case "custom_text":
      return {
        title: custom?.title ?? "Untitled",
        content: custom?.content ?? "",
      };
  }
}

function blockHeadline(block: ProposalBlockRow): string {
  const d = block.block_data ?? {};
  if (block.block_type === "custom_text") {
    return typeof d.title === "string" && d.title ? d.title : "Custom text";
  }
  if (typeof d.label === "string" && d.label) return d.label;
  return (
    String(d.tort_slug ?? d.state_abbr ?? d.surface ?? d.campaign_id ?? "—")
  );
}

export function ProposalEditorClient({ deckId }: { deckId: string }) {
  const router = useRouter();
  const branding = useTenant();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<ProposalBlockRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignLite[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [exporting, setExporting] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // ── Load proposal + blocks ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/proposal/${deckId}?include=blocks`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? `Failed to load (${res.status})`);
        }
        const data = (await res.json()) as GetProposalResponse;
        if (cancelled) return;
        setTitle(data.title);
        setDescription(data.description ?? "");
        setBlocks(
          [...(data.blocks ?? [])].sort((a, b) => a.order - b.order),
        );
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Failed to load proposal",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  // Lazy-load campaigns the first time the campaign picker is needed.
  const loadCampaigns = useCallback(async () => {
    if (campaigns.length > 0) return;
    try {
      const res = await fetch("/api/campaigns/list?limit=100", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        campaigns?: { id: string; name: string | null }[];
      };
      setCampaigns(
        (data.campaigns ?? []).map((c) => ({ id: c.id, name: c.name })),
      );
    } catch {
      /* non-fatal — picker just shows no options */
    }
  }, [campaigns.length]);

  // ── Persistence helpers ──────────────────────────────────────────────
  async function saveMeta(next: { title?: string; description?: string }) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/proposal/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  async function addBlock(
    type: BlockType,
    data: Record<string, unknown>,
  ) {
    const order = blocks.length;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/proposal/${deckId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block_type: type, block_data: data, order }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Add failed");
      }
      const { block_id } = (await res.json()) as { block_id: string };
      const now = new Date().toISOString();
      setBlocks((b) => [
        ...b,
        {
          id: block_id,
          proposal_id: deckId,
          block_type: type,
          block_data: data,
          order,
          created_at: now,
          updated_at: now,
        },
      ]);
      setSaveState("saved");
    } catch (e) {
      setSaveState("error");
      alert(e instanceof Error ? e.message : "Could not add block");
    }
  }

  async function deleteBlock(id: string) {
    const prev = blocks;
    setBlocks((b) => b.filter((x) => x.id !== id));
    const res = await fetch(`/api/proposal/${deckId}/blocks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setBlocks(prev);
      alert("Delete failed");
    }
  }

  async function updateCustomText(
    id: string,
    patch: { title?: string; content?: string },
  ) {
    setBlocks((b) =>
      b.map((x) =>
        x.id === id
          ? { ...x, block_data: { ...x.block_data, ...patch } }
          : x,
      ),
    );
  }

  async function persistBlockData(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    setSaveState("saving");
    const res = await fetch(`/api/proposal/${deckId}/blocks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_data: block.block_data }),
    });
    setSaveState(res.ok ? "saved" : "error");
  }

  async function persistReorder(next: ProposalBlockRow[]) {
    setSaveState("saving");
    const res = await fetch(`/api/proposal/${deckId}/blocks/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: next.map((b, i) => ({ id: b.id, order: i })),
      }),
    });
    setSaveState(res.ok ? "saved" : "error");
  }

  // ── Drag & drop reordering (native HTML5) ────────────────────────────
  function onDragStart(e: DragEvent<HTMLLIElement>, index: number) {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function onDragOver(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== index) setDragOver(index);
  }

  function onDrop(e: DragEvent<HTMLLIElement>, index: number) {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOver(null);
    if (from === null || from === index) return;
    setBlocks((b) => {
      const next = [...b];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      const reindexed = next.map((x, i) => ({ ...x, order: i }));
      void persistReorder(reindexed);
      return reindexed;
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((b) => {
      const next = [...b];
      [next[index], next[target]] = [next[target], next[index]];
      const reindexed = next.map((x, i) => ({ ...x, order: i }));
      void persistReorder(reindexed);
      return reindexed;
    });
  }

  // ── Export ───────────────────────────────────────────────────────────
  async function exportPptx() {
    setExporting(true);
    try {
      const res = await fetch(`/api/proposal/${deckId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pptx" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "proposal"}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-gray">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading proposal…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-alert/30 bg-alert/5 p-6 text-sm text-alert">
        {loadError}
        <button
          onClick={() => router.push("/proposal-builder")}
          className="ml-3 underline"
        >
          Back to decks
        </button>
      </div>
    );
  }

  const saveLabel: Record<SaveState, string> = {
    idle: "",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Save failed — retry an action",
  };

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/proposal-builder")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-gray hover:text-midnight-navy"
        >
          <ArrowLeft className="h-4 w-4" /> All decks
        </button>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              saveState === "error" ? "text-alert" : "text-slate-gray"
            }`}
          >
            {saveLabel[saveState]}
          </span>
          <button
            onClick={exportPptx}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--color-accent, #1A8C96)" }}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PPTX
          </button>
          <button
            disabled
            title="PDF export coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400"
          >
            <Download className="h-4 w-4" /> PDF (soon)
          </button>
        </div>
      </div>

      {/* Branded deck header preview */}
      <div
        className="mb-6 rounded-lg p-5 text-white"
        style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-accent, #1A8C96)" }}
        >
          {branding.companyName}
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveMeta({ title: title.trim() || "Untitled" })}
          className="mt-2 w-full bg-transparent text-2xl font-bold text-white outline-none placeholder:text-white/40"
          placeholder="Deck title"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => saveMeta({ description })}
          className="mt-1 w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/30"
          placeholder="Add a one-line description (optional)"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: block library */}
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-midnight-navy">
            Block Library
          </h2>
          {BLOCK_TYPES.map((type) => (
            <LibrarySection
              key={type}
              type={type}
              campaigns={campaigns}
              onOpenCampaigns={loadCampaigns}
              onAdd={(data) => addBlock(type, data)}
            />
          ))}
        </aside>

        {/* Right: canvas */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-midnight-navy">
            Deck Canvas{" "}
            <span className="font-normal text-slate-gray">
              ({blocks.length} block{blocks.length === 1 ? "" : "s"})
            </span>
          </h2>

          {blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-gray">
              Add blocks from the library on the left. Drag to reorder.
            </div>
          ) : (
            <ul className="space-y-2">
              {blocks.map((block, index) => (
                <li
                  key={block.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDrop={(e) => onDrop(e, index)}
                  onDragEnd={() => {
                    dragIndex.current = null;
                    setDragOver(null);
                  }}
                  className={`rounded-lg border bg-white p-3 shadow-sm transition ${
                    dragOver === index
                      ? "border-intelligence-teal ring-2 ring-intelligence-teal/30"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 cursor-grab text-slate-300 active:cursor-grabbing">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-intelligence-teal">
                        {BLOCK_TYPE_META[block.block_type].label}
                      </p>
                      {block.block_type === "custom_text" ? (
                        <div className="mt-1 space-y-1">
                          <input
                            value={String(block.block_data.title ?? "")}
                            onChange={(e) =>
                              updateCustomText(block.id, {
                                title: e.target.value,
                              })
                            }
                            onBlur={() => persistBlockData(block.id)}
                            placeholder="Slide title"
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium text-midnight-navy outline-none focus:border-intelligence-teal"
                          />
                          <textarea
                            value={String(block.block_data.content ?? "")}
                            onChange={(e) =>
                              updateCustomText(block.id, {
                                content: e.target.value,
                              })
                            }
                            onBlur={() => persistBlockData(block.id)}
                            rows={3}
                            placeholder="Slide content"
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-charcoal outline-none focus:border-intelligence-teal"
                          />
                        </div>
                      ) : (
                        <p className="mt-0.5 truncate text-sm font-medium text-midnight-navy">
                          {blockHeadline(block)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                        className="text-slate-400 hover:text-midnight-navy disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === blocks.length - 1}
                        aria-label="Move down"
                        className="text-slate-400 hover:text-midnight-navy disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      aria-label="Remove block"
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-alert/10 hover:text-alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p
            className="mt-6 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-gray"
          >
            {branding.footerText || `${branding.companyName} — Confidential`}
          </p>
        </section>
      </div>
    </div>
  );
}

/* ── Library section (one collapsible picker per block type) ──────────── */

function LibrarySection({
  type,
  campaigns,
  onOpenCampaigns,
  onAdd,
}: {
  type: BlockType;
  campaigns: CampaignLite[];
  onOpenCampaigns: () => void;
  onAdd: (data: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(type === "tort_page");
  const [value, setValue] = useState("");
  const [ctTitle, setCtTitle] = useState("");
  const [ctContent, setCtContent] = useState("");

  const meta = BLOCK_TYPE_META[type];

  const options =
    type === "tort_page"
      ? TORT_OPTIONS
      : type === "state_intel"
        ? STATE_OPTIONS
        : type === "ad_intel"
          ? AD_INTEL_OPTIONS
          : type === "campaign"
            ? campaigns.map((c) => ({
                value: c.id,
                label: c.name || `Untitled (${c.id.slice(0, 8)})`,
              }))
            : [];

  function handleAdd() {
    if (type === "custom_text") {
      if (!ctTitle.trim()) return;
      onAdd({ title: ctTitle.trim(), content: ctContent });
      setCtTitle("");
      setCtContent("");
      return;
    }
    if (!value) return;
    const label = options.find((o) => o.value === value)?.label ?? value;
    onAdd(buildBlockData(type, value, label));
    setValue("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && type === "campaign") onOpenCampaigns();
        }}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-sm font-medium text-midnight-navy">
          {meta.label}
        </span>
        <span className="text-xs text-slate-gray">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 p-3">
          <p className="text-xs text-slate-gray">{meta.hint}</p>
          {type === "custom_text" ? (
            <>
              <input
                value={ctTitle}
                onChange={(e) => setCtTitle(e.target.value)}
                placeholder="Slide title"
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-intelligence-teal"
              />
              <textarea
                value={ctContent}
                onChange={(e) => setCtContent(e.target.value)}
                rows={3}
                placeholder="Slide content"
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-intelligence-teal"
              />
            </>
          ) : (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-intelligence-teal"
            >
              <option value="">
                {type === "campaign" && options.length === 0
                  ? "No saved campaigns"
                  : "Select…"}
              </option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleAdd}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--color-primary, #0B1D3A)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add to deck
          </button>
        </div>
      )}
    </div>
  );
}
