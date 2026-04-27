"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Search, Loader2, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ActionChip {
  label: string;
  href: string;
}

interface SearchResult {
  answer: string;
  actions: ActionChip[];
  intent: string;
  entities: Record<string, string>;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="my-1.5 ml-4 list-disc space-y-1"
        >
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  function formatInline(str: string): React.ReactNode {
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-midnight-navy">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
    } else {
      flushList();
      if (line.trim() === "") {
        if (elements.length > 0) {
          elements.push(<div key={`sp-${i}`} className="h-2" />);
        }
      } else {
        elements.push(
          <p key={`p-${i}`} className="my-0.5 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();

  return elements;
}

const SUGGESTED_QUERIES = [
  "What states should I target for Paraquat?",
  "Who's advertising for Roundup?",
  "What's the largest MDL right now?",
  "Tell me about Depo Provera litigation",
];

export function AiSearchBar() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed || isLoading) return;

      setQuery(trimmed);
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch("/api/campaign-builder/ai-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: trimmed }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Request failed (${res.status})`
          );
        }

        const data: SearchResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function handleClear() {
    setQuery("");
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  }

  return (
    <div className="w-full">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 rounded-xl border border-cloud bg-white px-4 py-3 shadow-sm transition-all focus-within:border-intelligence-teal focus-within:shadow-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-intelligence-teal/10">
            <Sparkles className="h-4 w-4 text-intelligence-teal" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything — e.g., 'what states should I target for Paraquat?'"
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-midnight-navy placeholder:text-slate-gray/60 focus:outline-none disabled:opacity-50"
          />
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 rounded-md p-1 text-slate-gray/60 transition-colors hover:text-slate-gray"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-intelligence-teal text-white transition-colors hover:bg-intelligence-teal/90 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Suggested Queries (shown when no result and no loading) */}
      {!result && !isLoading && !error && (
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuery(q);
                handleSearch(q);
              }}
              className="rounded-full border border-intelligence-teal/20 px-3 py-1 text-xs text-intelligence-teal transition-colors hover:bg-intelligence-teal/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="mt-3 rounded-xl border border-cloud bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-gray">
            <Loader2 className="h-4 w-4 animate-spin text-intelligence-teal" />
            <span>Analyzing your question...</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-cloud" />
            <div className="h-4 w-full animate-pulse rounded bg-cloud" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-cloud" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-3 rounded-xl border border-alert/20 bg-alert/5 p-4">
          <p className="text-sm text-alert">{error}</p>
          <button
            onClick={() => {
              setError(null);
              inputRef.current?.focus();
            }}
            className="mt-2 text-xs text-alert underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-3 rounded-xl border border-cloud bg-white p-5 shadow-sm">
          {/* Answer */}
          <div className="text-sm text-midnight-navy/90 leading-relaxed">
            {renderMarkdown(result.answer)}
          </div>

          {/* Action Chips */}
          {result.actions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-cloud pt-4">
              {result.actions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-intelligence-teal/30 bg-intelligence-teal/5 px-3 py-1.5 text-xs font-medium text-intelligence-teal transition-colors hover:bg-intelligence-teal/10"
                >
                  {action.label}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          {/* Clear / New Search */}
          <div className="mt-3 border-t border-cloud pt-3">
            <button
              onClick={handleClear}
              className="text-xs text-slate-gray hover:text-intelligence-teal transition-colors"
            >
              Ask another question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
