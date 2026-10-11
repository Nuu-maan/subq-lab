import { SubqUnavailable, postSubq } from "@/lib/server/subq";

const MAX_BODY_BYTES = 13 * 1024 * 1024;

function fail(status: number, message: string) {
  return Response.json({ detail: { error_type: "validation_error", message } }, { status });
}

export async function POST(request: Request) {
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

  try {
    const upstream = await postSubq(body);
    return new Response(upstream.text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.contentType, "X-Upstream-Ms": String(upstream.ms) },
    });
  } catch (error) {
    if (error instanceof SubqUnavailable) return fail(error.status, error.message);
    throw error;
  }
}
