import { MODEL, type DecideRequest, type DecideResponse } from "@/lib/subq";

export class SubqUnavailable extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function postSubq(body: object) {
  const key = process.env.API;
  if (!key) throw new SubqUnavailable("Set API in .env to your SubQ key, then restart the dev server.", 500);

  const started = performance.now();
  const upstream = await fetch("https://api.subq.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  }).catch(() => {
    throw new SubqUnavailable("Unable to reach api.subq.ai. Check your connection and try again.", 502);
  });

  return {
    status: upstream.status,
    contentType: upstream.headers.get("content-type") ?? "application/json",
    text: await upstream.text(),
    ms: Math.round(performance.now() - started),
  };
}

export async function decideOnServer(body: DecideRequest): Promise<DecideResponse> {
  const { status, text } = await postSubq(body);
  if (status !== 200) throw new Error(`SubQ returned ${status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as DecideResponse;
}
