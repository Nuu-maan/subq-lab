import { MODEL } from "@/lib/subq";

const MAX_BODY_BYTES = 13 * 1024 * 1024;

function fail(status: number, message: string) {
  return Response.json({ detail: { error_type: "validation_error", message } }, { status });
}

export async function POST(request: Request) {
  const key = process.env.API;
  if (!key) return fail(500, "Set API in .env to your SubQ key, then restart the dev server.");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return fail(413, "Request is over 13 MiB. Use fewer or smaller images.");
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Request body is not valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return fail(400, "Request body must be a JSON object.");
  }

  const started = performance.now();
  const upstream = await fetch("https://api.subq.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  }).catch(() => null);
  if (!upstream) return fail(502, "Unable to reach api.subq.ai. Check your connection and try again.");

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "X-Upstream-Ms": String(Math.round(performance.now() - started)),
    },
  });
}
