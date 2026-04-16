import OpenAI from "openai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, tortContext } = await req.json();

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

  const systemMessage = `You are an AI analyst embedded in a legal advertising intelligence platform. You help plaintiff law firms and their marketing agencies make better case-acquisition and advertising decisions.

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

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemMessage }, ...messages],
    stream: true,
    temperature: 0.3,
    max_tokens: 1000,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
