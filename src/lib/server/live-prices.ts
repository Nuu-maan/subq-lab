import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { amazonUrl, catalog, type Offer, type PriceBook } from "@/lib/pc";
import type { ChoiceAnswer, Question } from "@/lib/subq";
import { callShopping } from "./shopping-mcp";
import { decideOnServer } from "./subq";

const CACHE_FILE = path.join(process.cwd(), ".cache", "prices.json");
const MAX_AGE_MS = 60 * 60 * 1000;
const MATCH_THRESHOLD = 0.8;
const QUESTIONS_PER_REQUEST = 12;

type Price = { selling_price?: number | null };
type AmazonProduct = { title?: string | null; url?: string | null; in_stock?: boolean | null; price?: Price | null };
type FlipkartCard = { title?: string | null; url?: string | null; in_stock?: boolean | null; price?: Price | null };
type CatalogEntry = ReturnType<typeof catalog>[number];

export type PriceStatus = {
  book: PriceBook | null;
  refreshing: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
};

const shared = globalThis as typeof globalThis & {
  priceRefresh?: { running: Promise<void> | null; progress: PriceStatus["progress"]; error: string | null };
};
const run = (shared.priceRefresh ??= { running: null, progress: null, error: null });
let lastFailure: string | null = null;

function noteFailure(error: unknown) {
  lastFailure = error instanceof Error ? error.message : String(error);
  return null;
}

async function readBook(): Promise<PriceBook | null> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8")) as PriceBook;
  } catch {
    return null;
  }
}

function isStale(book: PriceBook | null) {
  return !book || Date.now() - new Date(book.checkedAt).getTime() > MAX_AGE_MS;
}

async function pool<T, R>(items: T[], size: number, work: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    }),
  );
  return results;
}

function flipkartQuery({ kind, item }: CatalogEntry) {
  if (kind === "CPU") return `${item.name} processor`;
  if (kind === "Graphics card") return `${item.name} graphics card`;
  return item.name;
}

function matchQuestion({ kind, item }: CatalogEntry, cards: FlipkartCard[]): Question {
  const instructions =
    kind === "Graphics card"
      ? `Which Flipkart listing is a new ${item.name} graphics card? Any brand is fine, but the GPU model and memory size must match exactly.`
      : `Which Flipkart listing is exactly the ${item.name}, sold new? A different model, capacity, kit size or bundle does not count.`;
  return {
    type: "choice",
    instructions,
    criteria: {
      ...Object.fromEntries(cards.map((card, i) => [`listing_${i}`, (card.title ?? "").slice(0, 200)])),
      none: "None of these listings is that product",
    },
  };
}

async function amazonOffer(entry: CatalogEntry): Promise<Offer | null> {
  try {
    const product = await callShopping<AmazonProduct>("amazon_get_product", { asin_or_url: entry.item.asin });
    const price = product.price?.selling_price;
    if (!price) return null;
    return {
      store: "amazon",
      price,
      url: amazonUrl(entry.item.asin),
      title: product.title ?? entry.item.name,
      inStock: product.in_stock !== false,
    };
  } catch (error) {
    return noteFailure(error);
  } finally {
    if (run.progress) run.progress.done++;
  }
}

async function flipkartCandidates(entry: CatalogEntry): Promise<FlipkartCard[]> {
  try {
    const result = await callShopping<{ products?: FlipkartCard[] }>("search_products", { query: flipkartQuery(entry) });
    return (result.products ?? []).filter((card) => card.title && card.url && card.price?.selling_price).slice(0, 6);
  } catch (error) {
    noteFailure(error);
    return [];
  } finally {
    if (run.progress) run.progress.done++;
  }
}

async function matchFlipkart(entries: CatalogEntry[], candidates: FlipkartCard[][]) {
  const matches = new Map<string, Offer>();
  const askable = entries.map((entry, i) => ({ entry, cards: candidates[i] })).filter(({ cards }) => cards.length > 0);

  for (let start = 0; start < askable.length; start += QUESTIONS_PER_REQUEST) {
    const batch = askable.slice(start, start + QUESTIONS_PER_REQUEST);
    const response = await decideOnServer({
      state: "Matching PC parts to Flipkart listings for a price comparison. Choose none unless a listing is clearly the same product.",
      questions: Object.fromEntries(batch.map(({ entry, cards }, i) => [`part_${i}`, matchQuestion(entry, cards)])),
    }).catch(noteFailure);
    if (!response) continue;

    batch.forEach(({ entry, cards }, i) => {
      const answer = response.answers[`part_${i}`] as ChoiceAnswer | undefined;
      if (!answer || answer.choice === "none" || (answer.probabilities[answer.choice] ?? 0) < MATCH_THRESHOLD) return;
      const card = cards[Number(answer.choice.replace("listing_", ""))];
      if (!card?.price?.selling_price || !card.url) return;
      matches.set(entry.item.asin, {
        store: "flipkart",
        price: card.price.selling_price,
        url: card.url,
        title: card.title ?? entry.item.name,
        inStock: card.in_stock !== false,
      });
    });
  }
  return matches;
}

async function refresh() {
  const entries = catalog();
  run.progress = { done: 0, total: entries.length * 2 };
  run.error = null;
  lastFailure = null;
  try {
    const [amazon, candidates] = await Promise.all([pool(entries, 2, amazonOffer), pool(entries, 4, flipkartCandidates)]);
    const flipkart = await matchFlipkart(entries, candidates);

    const offers: PriceBook["offers"] = {};
    entries.forEach((entry, i) => {
      const found = [amazon[i], flipkart.get(entry.item.asin)].filter((offer): offer is Offer => !!offer);
      if (found.length) offers[entry.item.asin] = found;
    });
    if (!Object.keys(offers).length) throw new Error(`No store returned a price.${lastFailure ? ` Last error: ${lastFailure}` : ""}`);

    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify({ checkedAt: new Date().toISOString(), offers } satisfies PriceBook));
  } catch (error) {
    run.error = error instanceof Error ? error.message : "Price refresh failed.";
  } finally {
    run.progress = null;
    run.running = null;
  }
}

export function refreshPrices() {
  run.running ??= refresh();
  return run.running;
}

export async function priceStatus(): Promise<PriceStatus & { stale: boolean }> {
  const book = await readBook();
  return { book, refreshing: run.running !== null, progress: run.progress, error: run.error, stale: isStale(book) };
}

