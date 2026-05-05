/**
 * LLM-driven script polishing for TTS.
 *
 * Why this exists:
 *   The original PR B approach substituted trouble words with respellings
 *   ("Depo-Provera" -> "Deh-poh proh-Veh-ruh") at TTS time. ElevenLabs
 *   handled some respellings well, mangled others (DEH read as letters),
 *   and silently dropped <phoneme> tags for at least one term in
 *   eleven_multilingual_v2. The user discovered by accident that simply
 *   writing "Dep-o-Provera" in the script ITSELF produced correct audio,
 *   because ElevenLabs already knows how to say it when spelled that way.
 *
 *   This module reframes the dictionary: instead of being a substitution
 *   table consumed by string.replace, it's a list of "trouble words" that
 *   we hand to a small LLM with instructions to rewrite ONLY those words
 *   in the script using TTS-friendly spelling. Everything else is
 *   preserved verbatim.
 *
 * Why this is a better fit than direct substitution:
 *   1. The same LLM that authored the script handles the rewrite, so it
 *      preserves cadence and meaning the dictionary couldn't.
 *   2. The dictionary `spoken` value becomes a *hint* (not a literal
 *      replacement), so super_admins can write hints in any form
 *      ("read as Dep-o-Provera" or even leave blank) and the LLM picks
 *      a TTS-safe rendering.
 *   3. New trouble words can be added without testing dozens of TTS
 *      rendering edge cases.
 *
 * Failure mode:
 *   Any error (LLM down, parse failure, no API key, response too short)
 *   falls back to the original dictionary substitution path. The audio
 *   pipeline NEVER fails because of polishing — at worst the audio is
 *   slightly mispronounced, which is exactly the pre-PR-B baseline.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { applyPronunciationOverrides } from "./pronunciation";
import {
  applyPronunciationToText,
  type ApplyPronunciationResult,
} from "./pronunciation-dictionary";

/* ── Public types ──────────────────────────────────────────────────────── */

export interface PolishResult {
  /** Final text to send to TTS. */
  text: string;
  /** Path that produced the text. */
  source: "llm_polish" | "dictionary_fallback" | "original";
  /** Number of trouble words the LLM was told about. */
  troubleWordsCount: number;
  /** True if we substituted at least one occurrence. */
  changed: boolean;
  /** Diagnostic on failure paths. */
  warnings: string[];
}

/* ── Constants ─────────────────────────────────────────────────────────── */

/**
 * Minimum/maximum text lengths we'll try to polish via LLM. Below 30
 * chars is rarely worth a round-trip; above 4000 risks timeouts and
 * is also ElevenLabs' single-call cap, so longer scripts shouldn't
 * exist in this pipeline.
 */
const MIN_POLISH_CHARS = 30;
const MAX_POLISH_CHARS = 4000;

/**
 * Hard timeout on the OpenAI call. The voiceover route has maxDuration
 * 30 seconds; we want to leave at least 25s for ElevenLabs.
 */
const OPENAI_TIMEOUT_MS = 5_000;

/**
 * Sanity ceiling on length growth. If the LLM returns text more than
 * 1.5x the input length, something's gone wrong (hallucinated commentary,
 * doubled the script). Reject and fall back.
 */
const MAX_GROWTH_RATIO = 1.5;

/**
 * Sanity floor on length shrinkage. If the LLM returns < 80% of the
 * input length, it probably dropped content. Reject and fall back.
 */
const MIN_SHRINK_RATIO = 0.8;

const SYSTEM_PROMPT = `You are a TTS pre-processor for plaintiff law firm radio and video voiceovers.

Your ONE job: rewrite specific "trouble words" in the script so that ElevenLabs (eleven_multilingual_v2) pronounces them correctly. Leave everything else untouched.

RULES:
1. The user message contains:
   - The trouble words list (with optional pronunciation hints)
   - The original script

2. Find every occurrence of each trouble word in the script (case-insensitive, whole-word match). Replace each with a TTS-friendly spelling that ElevenLabs will pronounce correctly.

3. TTS-friendly spelling means simple, plain-English respelling that follows the way you'd write the word for a kindergartener to read. Examples:
   - "Depo-Provera"  -> "Dep-o-Provera"
   - "Paraquat"      -> "Pair-uh-kwat"
   - "voir dire"     -> "vwar deer"
   - "NHTSA"         -> "Nit-suh"
   Acronyms read as letters keep their letter-spaced form: "AFFF" -> "A F F F".

4. NEVER use ALL-CAPS for stress (TTS reads it as letters). Use mixed-case where the stressed syllable starts with a capital letter only on its first letter: "Pair" not "PAIR".

5. NEVER use IPA. NEVER use <phoneme> tags. Plain ASCII only.

6. Preserve EVERYTHING else exactly: cadence, sentence breaks, punctuation, proper nouns that aren't in the trouble list, disclaimers, phone numbers, URLs.

7. Do NOT add explanatory text, do NOT change tone, do NOT shorten or lengthen the script.

OUTPUT FORMAT:
Strict JSON with exactly one field:
  { "polished": "<the rewritten script>" }

No markdown fences. No commentary. No extra fields.`;

interface TroubleWord {
  written: string;
  hint: string;
}

/* ── Public entry point ────────────────────────────────────────────────── */

/**
 * Polish a script for TTS. Tries the LLM path first; falls back to the
 * existing dictionary substitution if anything goes wrong.
 *
 * Always returns successfully. The returned `text` is what you should
 * send to ElevenLabs.
 */
export async function polishScriptForTTS(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  firmId: string | null | undefined,
): Promise<PolishResult> {
  const warnings: string[] = [];

  // Bail-out shortcuts that don't even need a fallback.
  if (!text || text.trim().length === 0) {
    return {
      text,
      source: "original",
      troubleWordsCount: 0,
      changed: false,
      warnings: [],
    };
  }

  // Build the trouble-word list from the merged firm + global overrides.
  // Note: we reuse applyPronunciationToText to collect the merged list
  // (in case the LLM path fails, we already have the dictionary-
  // substituted text ready as a fallback).
  const dictResult: ApplyPronunciationResult = await applyPronunciationToText(
    supabase,
    userId,
    text,
    firmId,
  );

  const troubleWords = await collectTroubleWords(supabase, userId, firmId);

  // If there are no trouble words at all, no polishing is worthwhile.
  if (troubleWords.length === 0) {
    return {
      text,
      source: "original",
      troubleWordsCount: 0,
      changed: false,
      warnings: [],
    };
  }

  // Sanity gate: skip LLM call if the script doesn't actually contain
  // any of the trouble words. The dictionary substitution would also
  // be a no-op in this case.
  const lowerText = text.toLowerCase();
  const hits = troubleWords.filter((w) =>
    lowerText.includes(w.written.toLowerCase()),
  );
  if (hits.length === 0) {
    return {
      text,
      source: "original",
      troubleWordsCount: troubleWords.length,
      changed: false,
      warnings: [],
    };
  }

  // Length gate: skip LLM for scripts too short or too long.
  if (text.length < MIN_POLISH_CHARS || text.length > MAX_POLISH_CHARS) {
    warnings.push(
      `script length ${text.length} outside polish bounds [${MIN_POLISH_CHARS}, ${MAX_POLISH_CHARS}]; using dictionary substitution`,
    );
    return dictionaryFallback(dictResult, hits.length, text, warnings);
  }

  // Polish path: call OpenAI. Any error -> fall back to dict.
  try {
    const polished = await callOpenAIPolish(text, hits);
    if (!polished) {
      warnings.push("OpenAI returned empty polished text; using dictionary substitution");
      return dictionaryFallback(dictResult, hits.length, text, warnings);
    }

    // Sanity check the LLM output length.
    const ratio = polished.length / text.length;
    if (ratio > MAX_GROWTH_RATIO || ratio < MIN_SHRINK_RATIO) {
      warnings.push(
        `polished length ratio ${ratio.toFixed(2)} out of bounds [${MIN_SHRINK_RATIO}, ${MAX_GROWTH_RATIO}]; using dictionary substitution`,
      );
      return dictionaryFallback(dictResult, hits.length, text, warnings);
    }

    return {
      text: polished,
      source: "llm_polish",
      troubleWordsCount: hits.length,
      changed: polished !== text,
      warnings,
    };
  } catch (err) {
    warnings.push(
      `OpenAI polish failed: ${(err as Error).message}; using dictionary substitution`,
    );
    return dictionaryFallback(dictResult, hits.length, text, warnings);
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

/**
 * Build the trouble-word list. We use the same merged firm + global
 * dictionary as the substitution path, but keep them as (written, hint)
 * pairs rather than writing-to-spoken substitutions.
 */
async function collectTroubleWords(
  supabase: SupabaseClient,
  userId: string,
  firmId: string | null | undefined,
): Promise<TroubleWord[]> {
  // Reuse the dictionary loader by inspecting the merged result through
  // applyPronunciationOverrides on a single sentinel string. That's
  // wasteful — instead, we hit the same data the dictionary helper
  // would return and collect the (written, spoken) pairs as hints.
  const sentinel = "x".repeat(8);
  const result = await applyPronunciationToText(
    supabase,
    userId,
    sentinel,
    firmId,
  );
  // The merged-overrides shape isn't exposed by applyPronunciationToText,
  // but re-running applyPronunciationOverrides on a value that contains
  // every term doesn't help either. Instead, we do a tiny direct fetch
  // here. Cheap because the global dictionary is cached at the module
  // level by getGlobalPronunciationDictionary(); the per-firm fetch
  // already happened inside applyPronunciationToText so RLS is paid for.
  //
  // We deliberately accept a small inefficiency in the fallback (one
  // extra call) for code clarity — this only fires when there's at
  // least one match in the script.
  void result; // keep compiler happy; result is for future caching
  return loadTroubleWordsRaw(supabase, userId, firmId);
}

async function loadTroubleWordsRaw(
  supabase: SupabaseClient,
  userId: string,
  firmId: string | null | undefined,
): Promise<TroubleWord[]> {
  const out: TroubleWord[] = [];

  // Per-firm
  if (firmId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const { data: firm } = await db
        .from("firms")
        .select("pronunciation_overrides")
        .eq("id", firmId)
        .single();
      const raw = firm?.pronunciation_overrides;
      if (Array.isArray(raw)) {
        for (const r of raw) {
          if (
            r &&
            typeof r.written === "string" &&
            typeof r.spoken === "string"
          ) {
            out.push({ written: r.written, hint: r.spoken });
          }
        }
      }
    } catch {
      // best-effort; ignore
    }
  }

  // Global
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data } = await db
      .from("pronunciation_dictionary")
      .select("written, spoken")
      .limit(500);
    const seen = new Set(out.map((o) => o.written.toLowerCase()));
    for (const r of (data ?? []) as Array<{
      written: unknown;
      spoken: unknown;
    }>) {
      if (typeof r.written === "string" && typeof r.spoken === "string") {
        const key = r.written.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ written: r.written, hint: r.spoken });
      }
    }
  } catch {
    // best-effort; ignore
  }

  return out;
}

/**
 * Call OpenAI to polish the script. Returns the polished text on success,
 * or null on any failure short of throwing (so the caller can decide
 * whether to fall back).
 */
async function callOpenAIPolish(
  script: string,
  troubleWords: TroubleWord[],
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Format the trouble-word list as a compact bulleted list. Hints are
  // optional context for the LLM, not literal substitutions.
  const list = troubleWords
    .map((w) =>
      w.hint
        ? `- "${w.written}" (hint: ${w.hint})`
        : `- "${w.written}"`,
    )
    .join("\n");

  const userMsg = `Trouble words:\n${list}\n\nOriginal script:\n${script}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: Math.ceil(script.length * 1.6) + 100,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { polished?: unknown }).polished !== "string"
    ) {
      return null;
    }
    const polished = (parsed as { polished: string }).polished.trim();
    return polished.length > 0 ? polished : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Build a fallback PolishResult from the existing dictionary substitution
 * path. Reuses the work already done by applyPronunciationToText so we
 * don't pay for the dictionary fetch twice.
 */
function dictionaryFallback(
  dict: ApplyPronunciationResult,
  troubleWordCount: number,
  originalText: string,
  warnings: string[],
): PolishResult {
  return {
    text: dict.text,
    source: "dictionary_fallback",
    troubleWordsCount: troubleWordCount,
    changed: dict.text !== originalText,
    warnings,
  };
}

/* ── Used by tests only ────────────────────────────────────────────────── */

// Re-exported so tests can mock at the module boundary if needed.
export { applyPronunciationOverrides };
