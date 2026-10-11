# SubQ Lab

A Next.js playground for the [SubQ Decisions API](https://docs.subq.ai/endpoints/decisions-api/). Each tab is a real task answered with calibrated probabilities:

- **PC builder**: describe how you'll use a gaming PC and set a budget. SubQ reads your needs, a solver assembles compatible builds from an Indian-price parts catalog, then SubQ picks the best fit.
- **Triage**: routes a support ticket, rates its urgency and mood, and flags whether a person should step in.
- **Vision**: up to four images, checked for PC hardware, content safety or product photo quality, plus your own yes/no question.
- **Playground**: edit the raw `POST /v1/systemone` body and inspect the status code, latency, tokens and raw response.

The background is a WebGL shader that speeds up while a request is in flight and shifts color with the confidence of the last answer.

## Run it

```bash
echo "API=<your SubQ key>" > .env
pnpm install
pnpm dev
```

The key stays on the server. The browser calls `/api/decide`, which forwards to SubQ with the key attached.

```bash
pnpm test   # build solver checks
pnpm lint
pnpm build
```

## Notes from testing the API

- `subq-snap-preview` only serves the Decisions API. `POST /v1/chat/completions` returns `400 Model 'subq-snap-preview' does not support completions requests`.
- Typical latency is 450–900 ms per call, with or without images.
- Validation errors come back as `422` with a JSON-schema style message, for example a score question with one level.

PC part prices are mid-2026 estimates in `src/lib/pc.ts`. Check current listings before buying.

`/api/decide` has no authentication or rate limit, so don't deploy it publicly as is: anyone could spend your credits.
