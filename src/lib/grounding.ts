export type Grounding = {
  prices: { text: string; amount: number; verified: boolean }[];
  links: { url: string; verified: boolean }[];
};

const PRICE_KEYS = new Set(["price", "mrp", "selling_price"]);
const PRICE_PATTERN = /(?:₹|Rs\.?\s?|INR\s?)\s?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?/g;
const URL_PATTERN = /https?:\/\/[^\s<>()\]"']+/g;

export function linkKey(url: string) {
  const trimmed = url.replace(/[.,;:!?]+$/, "");
  const amazon = trimmed.match(/amazon\.in\/(?:.*\/)?dp\/([A-Z0-9]{10})/i);
  if (amazon) return `amazon:${amazon[1].toUpperCase()}`;
  const flipkart = trimmed.match(/flipkart\.com\/.*\/p\/(itm[a-z0-9]+)/i);
  if (flipkart) return `flipkart:${flipkart[1].toLowerCase()}`;
  try {
    const parsed = new URL(trimmed);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return trimmed;
  }
}

export function collectFacts(toolOutputs: string[]) {
  const prices = new Set<number>();
  const links = new Set<string>();

  const walk = (value: unknown, key = "") => {
    if (Array.isArray(value)) value.forEach((item) => walk(item, key));
    else if (value && typeof value === "object") Object.entries(value).forEach(([childKey, child]) => walk(child, childKey));
    else if (typeof value === "number" && PRICE_KEYS.has(key)) prices.add(Math.round(value));
    else if (typeof value === "string" && /^https?:\/\//.test(value)) links.add(linkKey(value));
  };

  for (const output of toolOutputs) {
    try {
      walk(JSON.parse(output));
    } catch {
      for (const url of output.match(URL_PATTERN) ?? []) links.add(linkKey(url));
    }
  }
  return { prices, links };
}

export function checkAnswer(answer: string, facts: ReturnType<typeof collectFacts>): Grounding {
  const prices = [...answer.matchAll(PRICE_PATTERN)].map((match) => {
    const amount = Number(match[1].replace(/,/g, ""));
    return { text: match[0], amount, verified: facts.prices.has(amount) };
  });
  const links = (answer.match(URL_PATTERN) ?? []).map((url) => ({ url, verified: facts.links.has(linkKey(url)) }));
  return { prices, links };
}
