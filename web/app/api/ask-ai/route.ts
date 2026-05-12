import OpenAI from "openai";
import { NextRequest } from "next/server";
import { logOpenAITokenCall } from "@/lib/api-usage";

export async function POST(req: NextRequest) {
  const { messages, tortContext, pageContext } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let systemMessage: string;

  if (tortContext) {
    systemMessage = `You are an AI analyst embedded in a legal advertising intelligence platform. You help plaintiff law firms and their marketing agencies make better case-acquisition and advertising decisions.

You are currently on the ${tortContext.tortName} tort intelligence page. Answer questions using ONLY the data provided below. If you don't have enough information to answer, say so clearly — do not make up data.

Be concise, data-driven, and actionable. Use specific numbers from the context when relevant. Format responses with markdown when helpful (bold key numbers, use bullet lists for comparisons).

--- PAGE DATA ---
Tort: ${tortContext.tortName}
Injury: ${tortContext.injury}
MDL: ${tortContext.mdlNumber}
Pending Cases: ${tortContext.pendingCases}
Settlement Range: ${tortContext.settlementRange}
Estimated CPA: ${tortContext.estimatedCPA}
Bellwether Date: ${tortContext.bellwetherDate}

Case Summary: ${tortContext.caseSummary}

Qualification Criteria: ${tortContext.qualification}

Advertising Landscape: ${tortContext.advertisingLandscape}

Targeting Insights: ${tortContext.targetingInsights}
--- END PAGE DATA ---`;
  } else if (pageContext) {
    systemMessage = `You are an AI analyst embedded in a legal advertising intelligence platform. You help plaintiff law firms and their marketing agencies make better case-acquisition and advertising decisions.

You are currently on the ${pageContext.pageName} page. Answer questions using ONLY the data provided below. If you don't have enough information to answer, say so clearly — do not make up data.

Be concise, data-driven, and actionable. Use specific numbers from the context when relevant. Format responses with markdown when helpful (bold key numbers, use bullet lists for comparisons).

--- PAGE DATA ---
Page: ${pageContext.pageName}
Description: ${pageContext.pageDescription}

Data Summary:
${pageContext.dataSummary}
--- END PAGE DATA ---`;
  } else {
    systemMessage = `You are an AI analyst embedded in a legal advertising intelligence platform. You help plaintiff law firms and their marketing agencies make better case-acquisition and advertising decisions. Be concise, data-driven, and actionable.`;
  }

  const MODEL = "gpt-4o-mini";
  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.3,
    max_tokens: 1000,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let inputTokens = 0;
      let outputTokens = 0;
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
        // Final chunk (stream_options.include_usage) carries usage totals.
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }
      }
      controller.close();
      void logOpenAITokenCall({
        operation: "ask_ai",
        model: MODEL,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        called_from: "api/ask-ai",
        metadata: {
          has_tort_context: Boolean(tortContext),
          has_page_context: Boolean(pageContext),
        },
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
