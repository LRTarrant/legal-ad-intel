/**
 * Pronunciation override utilities — Phase B.
 *
 * Per-firm pronunciation map: each firm can register a small dictionary
 * of (written → spoken) overrides. Before any text is sent to ElevenLabs,
 * we walk the script and replace each registered phrase with either:
 *
 *   1. An IPA <phoneme> tag, when the spoken value looks like IPA
 *      (e.g. "ˈbɝː.mɪŋ.hæm")
 *   2. The plain spoken respelling, when it doesn't
 *      (e.g. "Birmingham" → "BURR ming ham")
 *
 * Why both? Plain respelling is approachable for non-technical users
 * ("Birmingham" → "BURR-ming-ham"). IPA is precise for power users.
 * We auto-detect which one was given.
 *
 * IMPORTANT: ElevenLabs <phoneme> tags are only honored on certain models
 * (eleven_v3, eleven_multilingual_v2, eleven_turbo_v2_5). The current
 * /generate-voiceover route uses eleven_multilingual_v2, so IPA injection
 * works. If the model is ever swapped to a non-supporting variant, IPA
 * tags will be spoken literally — keep an eye on this.
 *
 * Reference:
 *   https://elevenlabs.io/docs/speech-synthesis/prompting#phoneme-tags
 */

/* ── Types ─────────────────────────────────────────────────────────────── */

/**
 * A single override row stored on the firm. Keys are kept short to keep
 * the JSONB column compact; we have ~50 rows max per firm so the on-disk
 * size is fine either way.
 */
export interface PronunciationOverride {
  /** The word/phrase as it appears in scripts (case-insensitive on match). */
  written: string;
  /**
   * The pronunciation. Either:
   *   - IPA (e.g. "ˈbɝː.mɪŋ.hæm") — auto-detected via IPA-only chars
   *   - Plain respelling (e.g. "BURR ming ham")
   */
  spoken: string;
}

/* ── IPA detection ─────────────────────────────────────────────────────── */

/**
 * Detect whether a spoken value is meant to be IPA. Heuristic: a non-zero
 * fraction of the string consists of characters that ONLY appear in IPA
 * (or pronunciation-tooling) — symbols you'd basically never type when
 * writing English respelling.
 *
 * Examples of IPA-only chars we look for:
 *   ˈ ˌ — primary/secondary stress marks
 *   ː   — long vowel marker
 *   ɝ ɚ ə ʌ ɪ ʊ ɛ ɔ æ ɑ ɒ — IPA vowels
 *   θ ð ʃ ʒ ŋ ɹ ɾ ɫ — IPA consonants
 *
 * If a string contains any of these, treat it as IPA. Otherwise, plain
 * respelling. We don't try to fully validate IPA — if a power user pastes
 * something weird, they get what they asked for and ElevenLabs handles it.
 */
const IPA_ONLY_CHARS_RE =
  /[ˈˌːˑəɚɝɛɔæɑɒʌʊɪɨʉʏʎʝɣɸβθðʃʒŋɲɳɽɹɾɻɫɬɮɭʈɖɟɢʔʕʢħɦɥɰɓɗʄɠʛʘǀǂǃ]/u;

export function looksLikeIpa(spoken: string): boolean {
  return IPA_ONLY_CHARS_RE.test(spoken);
}

/* ── Validation ────────────────────────────────────────────────────────── */

/**
 * Caps:
 *   - 50 rows per firm (we store inline JSONB, runaway maps inflate every
 *     subsequent script generation since the regex scan grows linearly)
 *   - 60 chars per `written` — anything longer is almost certainly a
 *     paste mistake (the firm meant to type a phrase, not a paragraph)
 *   - 100 chars per `spoken` — IPA can get long but 100 is plenty
 *
 * These match the existing array caps in lib/firms/types.ts (e.g. 30
 * signature_phrases, 50 partner_names) so a malicious / runaway client
 * can't blow up the row.
 */
export const PRONUNCIATION_LIMITS = {
  maxOverrides: 50,
  maxWrittenChars: 60,
  maxSpokenChars: 100,
} as const;

export interface PronunciationValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Validate a candidate pronunciation array. Returns the cleaned array
 * (trimmed, deduped on `written` lowercase) plus an errors list. Caller
 * should reject if errors.length > 0; we don't auto-prune.
 */
export function validatePronunciationOverrides(
  raw: unknown,
):
  | { ok: true; value: PronunciationOverride[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(raw)) {
    return {
      ok: false,
      errors: ["pronunciation_overrides must be an array"],
    };
  }

  if (raw.length > PRONUNCIATION_LIMITS.maxOverrides) {
    errors.push(
      `pronunciation_overrides cannot have more than ${PRONUNCIATION_LIMITS.maxOverrides} entries`,
    );
  }

  const seenWritten = new Set<string>();
  const out: PronunciationOverride[] = [];

  for (const [i, item] of raw.entries()) {
    if (!item || typeof item !== "object") {
      errors.push(`row ${i}: must be an object with written + spoken`);
      continue;
    }
    const obj = item as Record<string, unknown>;
    const written =
      typeof obj.written === "string" ? obj.written.trim() : "";
    const spoken = typeof obj.spoken === "string" ? obj.spoken.trim() : "";

    if (!written) {
      errors.push(`row ${i}: 'written' is required`);
      continue;
    }
    if (!spoken) {
      errors.push(`row ${i}: 'spoken' is required`);
      continue;
    }
    if (written.length > PRONUNCIATION_LIMITS.maxWrittenChars) {
      errors.push(
        `row ${i}: 'written' must be ≤ ${PRONUNCIATION_LIMITS.maxWrittenChars} characters`,
      );
      continue;
    }
    if (spoken.length > PRONUNCIATION_LIMITS.maxSpokenChars) {
      errors.push(
        `row ${i}: 'spoken' must be ≤ ${PRONUNCIATION_LIMITS.maxSpokenChars} characters`,
      );
      continue;
    }

    const key = written.toLowerCase();
    if (seenWritten.has(key)) {
      errors.push(`row ${i}: duplicate 'written' value (case-insensitive)`);
      continue;
    }
    seenWritten.add(key);
    out.push({ written, spoken });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: out };
}

/* ── Application: rewrite TTS text ─────────────────────────────────────── */

/**
 * Escape a string for safe inclusion in a regex.
 * (No `RegExp.escape` in current Node LTS — copy of the standard recipe.)
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply pronunciation overrides to a script before TTS.
 *
 * Behavior:
 *   - Whole-word match, case-insensitive: replacing "Birmingham" won't
 *     touch "Mockingbirminghams" or partial substrings.
 *   - Original casing of the script is preserved INSIDE the <phoneme>
 *     fallback text (so screen readers and IPA-disabled models still
 *     read something sensible).
 *   - IPA values become <phoneme alphabet="ipa" ph="…">word</phoneme>.
 *   - Plain respellings are substituted as plain text — simplest and
 *     most reliable across TTS models.
 *   - Longer phrases applied first so "New York City" beats "New York"
 *     when both are registered.
 *   - Single pass per phrase (no recursive substitution into the
 *     replacement string), so an override whose `spoken` happens to
 *     contain another override's `written` won't loop.
 *
 * Returns the rewritten script. Empty / no-overrides cases return the
 * original string unchanged.
 */
export function applyPronunciationOverrides(
  text: string,
  overrides: PronunciationOverride[] | null | undefined,
): string {
  if (!text || !overrides || overrides.length === 0) return text;

  // Sort by descending written length so longer phrases take precedence.
  const sorted = [...overrides].sort(
    (a, b) => b.written.length - a.written.length,
  );

  let out = text;
  for (const ov of sorted) {
    const safe = escapeRegex(ov.written);
    // Word-boundary match (Unicode-aware via /u flag and \b — \b doesn't
    // know about non-ASCII word chars in JS, but for English plaintiff-
    // firm scripts this is fine).
    const re = new RegExp(`\\b${safe}\\b`, "giu");

    if (looksLikeIpa(ov.spoken)) {
      // IPA path: wrap each match in a <phoneme> tag. Use the matched
      // text as the fallback content (preserves capitalization).
      out = out.replace(re, (matched) => {
        // Escape any HTML-like chars in the IPA value to prevent the
        // string from ever being interpreted as markup. ElevenLabs reads
        // the `ph` attribute value, not the inner text, but we still
        // want the outer string to be well-formed.
        const ph = ov.spoken
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;");
        const inner = matched
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;");
        return `<phoneme alphabet="ipa" ph="${ph}">${inner}</phoneme>`;
      });
    } else {
      // Plain respelling: case-preserving simple substitution.
      // We pass `() => spoken` so dollar-sign sequences in the spoken
      // value (e.g. "$5") don't get interpreted as backreferences.
      out = out.replace(re, () => ov.spoken);
    }
  }

  return out;
}
