/**
 * OpenAI adapter producing a CallModel for the grounded strategist. The model
 * id is config (STRATEGIST_MODEL, default the verified-available gpt-5.5).
 * GPT-5 models use max_completion_tokens and reject a custom temperature, so we
 * omit temperature and use max_completion_tokens. Task 2 smoke-tests this exact
 * param set against the live API before the route depends on it.
 */
import type { CallModel } from "./strategist";

export function resolveStrategistModel(): string {
  return process.env.STRATEGIST_MODEL ?? "gpt-5.5";
}

export function createOpenAICallModel(opts: {
  apiKey: string;
  signal?: AbortSignal;
  maxOutputTokens?: number;
}): CallModel {
  return async (messages) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: resolveStrategistModel(),
        max_completion_tokens: opts.maxOutputTokens ?? 2000,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: unknown };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OpenAI returned empty content");
    return content;
  };
}
