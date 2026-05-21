/**
 * Tests for the cost tracker.
 *
 * Focus areas:
 *   - Computed cost matches calculator output
 *   - Insert payload includes all attribution fields
 *   - DB error doesn't throw \u2014 returns ok:false with error message
 *   - trackedCall wraps the fn, times it, and skips tracking on throw
 */

import { trackCall, trackedCall } from "./tracker";

interface CapturedInsert {
  table: string;
  payload: Record<string, unknown>;
}

function makeFakeSupabase(opts?: {
  error?: { message: string };
  throwOnInsert?: boolean;
}): {
  client: any;
  inserts: CapturedInsert[];
} {
  const inserts: CapturedInsert[] = [];

  function fromTable(table: string) {
    let pendingInsert: Record<string, unknown> | null = null;
    return {
      insert(payload: Record<string, unknown>) {
        pendingInsert = payload;
        if (opts?.throwOnInsert) {
          throw new Error("simulated insert failure");
        }
        inserts.push({ table, payload });
        return this;
      },
      select(_cols?: string) {
        return this;
      },
      single: async () => {
        if (opts?.error) return { data: null, error: opts.error };
        return {
          data: { id: "row-1", ...(pendingInsert ?? {}) },
          error: null,
        };
      },
    };
  }

  return {
    client: { from: fromTable },
    inserts,
  };
}

/* ── Basic insert ───────────────────────────────────────────────────────── */

test("trackCall computes cost and writes a generation_costs row", async () => {
  const { client, inserts } = makeFakeSupabase();
  const result = await trackCall(client, {
    user_id: "user-1",
    firm_id: "firm-1",
    campaign_id: "camp-1",
    purpose: "pi_script",
    provider: "openai",
    model: "gpt-4o-mini",
    called_from: "test",
    usage: { input_tokens: 10_000, output_tokens: 1_000 },
  });
  expect(result.ok).toBe(true);
  expect(result.cost_cents).toBeGreaterThan(0);
  expect(inserts.length).toBe(1);
  expect(inserts[0].table).toBe("generation_costs");
  expect(inserts[0].payload.user_id).toBe("user-1");
  expect(inserts[0].payload.firm_id).toBe("firm-1");
  expect(inserts[0].payload.campaign_id).toBe("camp-1");
  expect(inserts[0].payload.purpose).toBe("pi_script");
  expect(inserts[0].payload.provider).toBe("openai");
  expect(inserts[0].payload.model).toBe("gpt-4o-mini");
  expect(inserts[0].payload.input_tokens).toBe(10_000);
  expect(inserts[0].payload.output_tokens).toBe(1_000);
  expect(inserts[0].payload.cost_cents).toBe(result.cost_cents);
});

test("trackCall stores nulls (not undefined) for absent usage fields", async () => {
  const { client, inserts } = makeFakeSupabase();
  await trackCall(client, {
    user_id: "user-1",
    purpose: "pi_script",
    provider: "openai",
    model: "gpt-4o-mini",
    called_from: "test",
    usage: { input_tokens: 100, output_tokens: 50 },
  });
  // Non-LLM fields should be null
  expect(inserts[0].payload.characters_synth).toBe(null);
  expect(inserts[0].payload.seconds_audio).toBe(null);
  expect(inserts[0].payload.seconds_video).toBe(null);
  expect(inserts[0].payload.image_count).toBe(null);
  // firm_id / campaign_id are also null when omitted
  expect(inserts[0].payload.firm_id).toBe(null);
  expect(inserts[0].payload.campaign_id).toBe(null);
});

test("trackCall stores TTS attribution correctly", async () => {
  const { client, inserts } = makeFakeSupabase();
  const result = await trackCall(client, {
    user_id: "user-1",
    purpose: "voiceover",
    provider: "elevenlabs",
    model: "eleven_turbo_v2",
    called_from: "test",
    usage: { characters_synth: 1000 },
  });
  expect(result.ok).toBe(true);
  expect(result.cost_cents).toBe(30);
  expect(inserts[0].payload.characters_synth).toBe(1000);
  expect(inserts[0].payload.input_tokens).toBe(null);
});

test("trackCall preserves meta object", async () => {
  const { client, inserts } = makeFakeSupabase();
  await trackCall(client, {
    user_id: "user-1",
    purpose: "mt_radio_script",
    provider: "openai",
    model: "gpt-4o",
    called_from: "test",
    usage: { input_tokens: 100, output_tokens: 50 },
    meta: { tort_name: "AFFF", duration: "30s" },
  });
  expect(inserts[0].payload.meta).toEqual({
    tort_name: "AFFF",
    duration: "30s",
  });
});

/* ── Failure handling ───────────────────────────────────────────────────── */

test("trackCall returns ok:false on DB error but doesn't throw", async () => {
  const { client } = makeFakeSupabase({ error: { message: "permission denied" } });
  const result = await trackCall(client, {
    user_id: "user-1",
    purpose: "pi_script",
    provider: "openai",
    model: "gpt-4o-mini",
    called_from: "test",
    usage: { input_tokens: 100, output_tokens: 50 },
  });
  expect(result.ok).toBe(false);
  expect(result.error).toContain("permission denied");
  // Cost is still computed and returned (≥0, expressed as > -1)
  expect(result.cost_cents).toBeGreaterThan(-1);
});

test("trackCall catches insert-throws and returns ok:false", async () => {
  const { client } = makeFakeSupabase({ throwOnInsert: true });
  const result = await trackCall(client, {
    user_id: "user-1",
    purpose: "pi_script",
    provider: "openai",
    model: "gpt-4o-mini",
    called_from: "test",
    usage: { input_tokens: 100, output_tokens: 50 },
  });
  expect(result.ok).toBe(false);
  expect(result.error).toContain("simulated insert failure");
});

/* ── Unknown model ─────────────────────────────────────────────────────── */

test("trackCall records unknown models with cost_cents=0", async () => {
  const { client, inserts } = makeFakeSupabase();
  const result = await trackCall(client, {
    user_id: "user-1",
    purpose: "other",
    provider: "newprovider",
    model: "unrecognized",
    called_from: "test",
    usage: { input_tokens: 100, output_tokens: 50 },
  });
  // The insert succeeded; cost is just zero so we can find it later
  expect(result.ok).toBe(true);
  expect(result.cost_cents).toBe(0);
  expect(inserts[0].payload.cost_cents).toBe(0);
  expect(inserts[0].payload.model).toBe("unrecognized");
});

/* ── trackedCall wrapper ────────────────────────────────────────────────── */

test("trackedCall returns the fn result + tracked metadata", async () => {
  const { client, inserts } = makeFakeSupabase();
  const { result, tracked } = await trackedCall(
    client,
    {
      user_id: "user-1",
      purpose: "pi_script",
      provider: "openai",
      model: "gpt-4o-mini",
      called_from: "test",
    },
    async () => ({
      result: "the script",
      usage: { input_tokens: 100, output_tokens: 50 },
    }),
  );
  expect(result).toBe("the script");
  expect(tracked.ok).toBe(true);
  expect(inserts.length).toBe(1);
  // latency_ms is set by the wrapper
  expect(typeof inserts[0].payload.latency_ms).toBe("number");
});

test("trackedCall does NOT track when fn throws", async () => {
  const { client, inserts } = makeFakeSupabase();
  let caught: Error | null = null;
  try {
    await trackedCall(
      client,
      {
        user_id: "user-1",
        purpose: "pi_script",
        provider: "openai",
        model: "gpt-4o-mini",
        called_from: "test",
      },
      async () => {
        throw new Error("upstream failure");
      },
    );
  } catch (e) {
    caught = e as Error;
  }
  expect(caught?.message).toBe("upstream failure");
  // No row was inserted because the call failed
  expect(inserts.length).toBe(0);
});
