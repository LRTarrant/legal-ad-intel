/**
 * Tests for polish-script.ts.
 *
 * Strategy:
 *   - We mock global.fetch to control the OpenAI response without
 *     hitting the network. Each test sets fetch to whatever shape it
 *     wants the LLM to return.
 *   - We mock the supabase client just enough to return the firms +
 *     pronunciation_dictionary rows the helper expects.
 *
 * Coverage:
 *   - Empty input
 *   - No trouble words at all
 *   - Trouble words exist but script doesn't contain any of them
 *   - Script too short → dictionary fallback
 *   - Script too long → dictionary fallback
 *   - LLM returns valid polished JSON → llm_polish source
 *   - LLM returns malformed JSON → dictionary fallback
 *   - LLM returns text outside length bounds → dictionary fallback
 *   - LLM throws / times out → dictionary fallback
 *   - No OPENAI_API_KEY → dictionary fallback
 */

import { polishScriptForTTS } from "./polish-script";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearPronunciationDictionaryCache } from "./pronunciation-dictionary";

/* ── Test plumbing ─────────────────────────────────────────────────────── */

// We mutate process.env in some tests; remember the original key.
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;

function mockSupabase(opts: {
  globalDictionary?: Array<{ written: string; spoken: string }>;
  firmOverrides?: Array<{ written: string; spoken: string }> | null;
}): SupabaseClient {
  const dict = opts.globalDictionary ?? [];
  const firmOver = opts.firmOverrides ?? null;
  // Build a tiny chainable fake matching the surface we use.
  const fake = {
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } } }),
    },
    from(table: string) {
      if (table === "firms") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: firmOver ? { pronunciation_overrides: firmOver } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "firm_managers") {
        // getFirmForUser checks firm_managers — return a row so RLS-equivalent
        // path treats the user as a manager.
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { firm_id: "firm-1", role: "manager" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "pronunciation_dictionary") {
        return {
          select: () => ({
            limit: async () => ({ data: dict, error: null }),
          }),
        };
      }
      return {
        select: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      };
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return fake as any as SupabaseClient;
}

function mockFetch(responder: (url: string) => Response | Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = async (url: string) => {
    return responder(url);
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function llmPolishResponse(polished: string): Response {
  return jsonResponse({
    choices: [
      {
        message: {
          content: JSON.stringify({ polished }),
        },
      },
    ],
  });
}

function resetEnv() {
  process.env.OPENAI_API_KEY = "test-key";
}

// Reset between tests.
function setup() {
  resetEnv();
  clearPronunciationDictionaryCache();
}

/* ── Tests ─────────────────────────────────────────────────────────────── */

test("polishScriptForTTS: empty text returns original", async () => {
  setup();
  const supabase = mockSupabase({ globalDictionary: [] });
  const result = await polishScriptForTTS(supabase, "u1", "", null);
  expect(result.text).toBe("");
  expect(result.source).toBe("original");
  expect(result.changed).toBe(false);
});

test("polishScriptForTTS: no trouble words at all returns original", async () => {
  setup();
  const supabase = mockSupabase({ globalDictionary: [] });
  const text = "Hurt in a car wreck? Call us today for a free consultation.";
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.text).toBe(text);
  expect(result.source).toBe("original");
  expect(result.troubleWordsCount).toBe(0);
});

test("polishScriptForTTS: trouble words defined but script doesn't contain any", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text = "Hurt in a car wreck? Call us today.";
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.text).toBe(text);
  expect(result.source).toBe("original");
  expect(result.troubleWordsCount).toBeGreaterThan(0);
  expect(result.changed).toBe(false);
});

test("polishScriptForTTS: very short script falls back to dictionary substitution", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  // 18 chars, below MIN_POLISH_CHARS=30
  const text = "Use Depo-Provera?";
  let fetchCalled = false;
  mockFetch(() => {
    fetchCalled = true;
    return llmPolishResponse("should not be used");
  });
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(fetchCalled).toBe(false);
  expect(result.source).toBe("dictionary_fallback");
  expect(result.text).toBe("Use Dep-o-Provera?");
});

test("polishScriptForTTS: LLM returns valid polish → llm_polish source", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you or a loved one developed a meningioma after using Depo-Provera in California? Call our firm today.";
  const polished =
    "Have you or a loved one developed a meningioma after using Dep-o-Provera in California? Call our firm today.";
  mockFetch(() => llmPolishResponse(polished));
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("llm_polish");
  expect(result.text).toBe(polished);
  expect(result.changed).toBe(true);
});

test("polishScriptForTTS: LLM returns malformed JSON → dictionary fallback", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you or a loved one developed a meningioma after using Depo-Provera in California? Call our firm today.";
  mockFetch(() =>
    jsonResponse({
      choices: [{ message: { content: "this is not json" } }],
    }),
  );
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("dictionary_fallback");
  // Dictionary substitution should still have replaced the trouble word.
  expect(result.text).toContain("Dep-o-Provera");
});

test("polishScriptForTTS: LLM returns text > 1.5x original → dictionary fallback", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you developed a meningioma after using Depo-Provera? Call us today for a free consultation.";
  // Way too long — LLM hallucinated extra commentary
  const tooLong =
    text + " " + text + " " + text + " " + "extra commentary blah blah";
  mockFetch(() => llmPolishResponse(tooLong));
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("dictionary_fallback");
  expect(result.warnings.length).toBeGreaterThan(0);
});

test("polishScriptForTTS: LLM returns text < 0.8x original → dictionary fallback", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you developed a meningioma after using Depo-Provera? Call us today for a free consultation.";
  // Way too short — LLM dropped half the script
  mockFetch(() => llmPolishResponse("Call us."));
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("dictionary_fallback");
});

test("polishScriptForTTS: LLM throws → dictionary fallback", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you developed a meningioma after using Depo-Provera? Call us today for a free consultation.";
  mockFetch(() => {
    throw new Error("network down");
  });
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("dictionary_fallback");
});

test("polishScriptForTTS: missing OPENAI_API_KEY → dictionary fallback", async () => {
  setup();
  delete process.env.OPENAI_API_KEY;
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you developed a meningioma after using Depo-Provera? Call us today for a free consultation.";
  let fetchCalled = false;
  mockFetch(() => {
    fetchCalled = true;
    return llmPolishResponse("ignored");
  });
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  // The OpenAI helper short-circuits when the key is missing — fetch
  // should not have been called.
  expect(fetchCalled).toBe(false);
  expect(result.source).toBe("dictionary_fallback");
  // Restore for downstream tests.
  process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY ?? "test-key";
});

test("polishScriptForTTS: OpenAI HTTP 500 → dictionary fallback", async () => {
  setup();
  const supabase = mockSupabase({
    globalDictionary: [{ written: "Depo-Provera", spoken: "Dep-o-Provera" }],
  });
  const text =
    "Have you developed a meningioma after using Depo-Provera? Call us today for a free consultation.";
  mockFetch(() => jsonResponse({ error: "server boom" }, 500));
  const result = await polishScriptForTTS(supabase, "u1", text, null);
  expect(result.source).toBe("dictionary_fallback");
});
