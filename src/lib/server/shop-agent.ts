import { ChatOpenAI } from "@langchain/openai";
import { loadMcpTools } from "@langchain/mcp-adapters";
import {
  createAgent,
  modelCallLimitMiddleware,
  modelFallbackMiddleware,
  modelRetryMiddleware,
  toolCallLimitMiddleware,
  toolRetryMiddleware,
  type DynamicStructuredTool,
} from "langchain";
import { shoppingClient } from "./shopping-mcp";

export const DEFAULT_MODELS = ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-super-120b-a12b:free", "thinkingmachines/inkling:free"];

const AGENT_TOOLS = new Set([
  "compare_marketplaces",
  "search_products",
  "amazon_search",
  "get_product",
  "amazon_get_product",
  "autosuggest",
  "amazon_autosuggest",
]);

const SYSTEM_PROMPT = `You are a shopping assistant for India. You find products on Flipkart and Amazon.in with the shopping tools.

Rules:
- Never guess a price, rating, stock status or spec. Every number you give must come from a tool result in this conversation.
- Start with compare_marketplaces for most requests. Use get_product or amazon_get_product only when you need details for a shortlist.
- Prices are in rupees. Write them as ₹ followed by the exact number from the tool, for example ₹54,999.
- Recommend at most three products. For each give the name, the price, the store and the product URL from the tool result.
- If a product is out of stock, say so. If the tools fail or return nothing useful, say that plainly instead of answering from memory.
- Write plain text with short lines. No tables.`;

type Card = Record<string, unknown> & { price?: Record<string, unknown> | null };

function slimCard(card: Card) {
  return {
    id: card.pid ?? card.asin,
    title: card.title,
    price: card.price?.selling_price ?? null,
    mrp: card.price?.mrp ?? null,
    rating: card.rating ?? null,
    in_stock: card.in_stock ?? null,
    url: card.url,
  };
}

function slimList(list: unknown, limit = 8) {
  return Array.isArray(list) ? list.slice(0, limit).map((card) => slimCard(card as Card)) : [];
}

export function slimResult(name: string, data: Record<string, unknown>): unknown {
  if (name === "compare_marketplaces") {
    const side = (key: string) => (data[key] as { products?: unknown } | undefined)?.products;
    return {
      query: data.query,
      flipkart: slimList(side("flipkart"), 5),
      amazon: slimList(side("amazon"), 5),
      errors: [data.flipkart_error, data.amazon_error].filter(Boolean),
    };
  }
  if (Array.isArray(data.products)) return { query: data.search_query ?? data.query, products: slimList(data.products) };
  if (name === "get_product" || name === "amazon_get_product") {
    return {
      ...slimCard(data as Card),
      availability: data.availability ?? null,
      key_specs: Array.isArray(data.key_specs) ? data.key_specs.slice(0, 8) : [],
      highlights: Array.isArray(data.highlights) ? data.highlights.slice(0, 6) : [],
    };
  }
  return data;
}

function resultText(result: unknown) {
  const [content] = result as [string | { type: string; text?: unknown }[]];
  if (typeof content === "string") return content;
  return content.map((block) => (block.type === "text" && typeof block.text === "string" ? block.text : "")).join("");
}

const holder = globalThis as typeof globalThis & { shopTools?: Promise<DynamicStructuredTool[]> };

function shopTools() {
  holder.shopTools ??= shoppingClient()
    .then((client) =>
      loadMcpTools("shopping", client, {
        defaultToolTimeout: 30_000,
        afterToolCall: ({ name, result }) => {
          try {
            return { result: JSON.stringify(slimResult(name, JSON.parse(resultText(result)))) };
          } catch {
            return undefined;
          }
        },
      }),
    )
    .then((tools) => tools.filter((tool) => AGENT_TOOLS.has(tool.name)))
    .catch((error) => {
      holder.shopTools = undefined;
      throw error;
    });
  return holder.shopTools;
}

export class AgentUnavailable extends Error {}

function openRouterModel(model: string, apiKey: string) {
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxRetries: 0,
    timeout: 60_000,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: { "HTTP-Referer": "http://localhost", "X-Title": "SubQ Lab" },
    },
  });
}

export function configuredModels() {
  const fromEnv = process.env.OPENROUTER_MODELS?.split(",").map((model) => model.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_MODELS;
}

export async function createShopAgent() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new AgentUnavailable("Add OPENROUTER_API_KEY to .env, then restart the server.");

  const [primary, ...fallbacks] = configuredModels().map((model) => openRouterModel(model, apiKey));
  return createAgent({
    model: primary,
    tools: await shopTools(),
    systemPrompt: SYSTEM_PROMPT,
    middleware: [
      modelFallbackMiddleware(...fallbacks),
      modelRetryMiddleware({ maxRetries: 1, initialDelayMs: 800, onFailure: "error" }),
      modelCallLimitMiddleware({ runLimit: 8, exitBehavior: "end" }),
      toolCallLimitMiddleware({ runLimit: 10, exitBehavior: "continue" }),
      toolRetryMiddleware({ maxRetries: 1, initialDelayMs: 600, onFailure: "continue" }),
    ],
  });
}
