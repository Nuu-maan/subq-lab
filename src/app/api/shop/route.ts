import { AIMessage, ToolMessage, type BaseMessage } from "langchain";
import { checkAnswer, collectFacts } from "@/lib/grounding";
import { AgentUnavailable, createShopAgent } from "@/lib/server/shop-agent";
import { ShoppingUnavailable } from "@/lib/server/shopping-mcp";

type Turn = { role: "user" | "assistant"; content: string };

const MAX_TURNS = 8;
const MESSAGE_NODES = new Set(["model_request", "tools"]);
const MAX_CHARS = 2000;

function isTurns(value: unknown): value is Turn[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_TURNS &&
    value.every(
      (turn) =>
        turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0 &&
        turn.content.length <= MAX_CHARS,
    )
  );
}

function textOf(message: BaseMessage) {
  if (typeof message.content === "string") return message.content;
  return message.content.map((block) => (block.type === "text" && "text" in block ? String(block.text) : "")).join("");
}

function summarize(content: string) {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data.flipkart) || Array.isArray(data.amazon)) {
      return `${data.flipkart?.length ?? 0} on Flipkart, ${data.amazon?.length ?? 0} on Amazon.in`;
    }
    if (Array.isArray(data.products)) return `${data.products.length} products`;
    if (data.title) return data.price ? `${data.title} · ₹${Number(data.price).toLocaleString("en-IN")}` : data.title;
    return "Done";
  } catch {
    return content.slice(0, 120);
  }
}

function friendly(error: unknown) {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message : "";
  if (status === 429 || /\b429\b/.test(message)) {
    return /provider returned error|temporarily rate-limited/i.test(message)
      ? "Every configured free model is rate limited by its provider right now. Wait a minute and try again, or set OPENROUTER_MODELS to other free models."
      : "You've hit OpenRouter's free limit (20 requests a minute, 50 a day). Wait a minute, or try again tomorrow.";
  }
  if (status === 401 || status === 403) return "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env.";
  if (error instanceof Error && /recursion limit/i.test(error.message)) return "The agent ran out of steps. Try a narrower question.";
  return error instanceof Error ? `The agent failed: ${error.message}` : "The agent failed. Try again.";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  if (!isTurns(body?.messages)) {
    return Response.json({ error: `Send 1 to ${MAX_TURNS} messages of up to ${MAX_CHARS} characters.` }, { status: 400 });
  }
  const messages = body.messages;

  let agent: Awaited<ReturnType<typeof createShopAgent>>;
  try {
    agent = await createShopAgent();
  } catch (error) {
    const known = error instanceof AgentUnavailable || error instanceof ShoppingUnavailable;
    return Response.json({ error: known ? error.message : "Unable to start the shopping agent." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const toolOutputs: string[] = [];
      let answer = "";
      let model = "";

      try {
        const updates = await agent.stream({ messages }, { streamMode: "updates", signal: request.signal, recursionLimit: 40 });
        for await (const update of updates) {
          for (const [node, value] of Object.entries(update as Record<string, { messages?: BaseMessage[] } | undefined>)) {
            if (!MESSAGE_NODES.has(node)) continue;
            for (const message of value?.messages ?? []) {
              if (AIMessage.isInstance(message)) {
                model = String(message.response_metadata?.model_name ?? model);
                for (const call of message.tool_calls ?? []) send({ type: "tool_call", id: call.id, name: call.name, args: call.args });
                if (!message.tool_calls?.length && textOf(message).trim()) answer = textOf(message).trim();
              } else if (ToolMessage.isInstance(message)) {
                const content = textOf(message);
                toolOutputs.push(content);
                send({ type: "tool_result", id: message.tool_call_id, name: message.name, ok: message.status !== "error", summary: summarize(content) });
              }
            }
          }
        }

        if (!answer) send({ type: "error", message: "The model stopped without an answer. Try again or rephrase the question." });
        else {
          send({ type: "answer", text: answer, model });
          send({ type: "check", ...checkAnswer(answer, collectFacts(toolOutputs)) });
        }
      } catch (error) {
        if (!request.signal.aborted) send({ type: "error", message: friendly(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
