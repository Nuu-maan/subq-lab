# SubQ Lab

A Next.js playground for the [SubQ Decisions API](https://docs.subq.ai/endpoints/decisions-api/). Each tab is a real task answered with calibrated probabilities:

- **PC builder**: describe how you'll use a gaming PC and set a budget. SubQ reads your needs, a solver assembles compatible builds from live Amazon.in and Flipkart prices, then SubQ picks the best fit.
- **Triage**: routes a support ticket, rates its urgency and mood, and flags whether a person should step in.
- **Vision**: up to four images, checked for PC hardware, content safety or product photo quality, plus your own yes/no question.
- **Playground**: edit the raw `POST /v1/systemone` body and inspect the status code, latency, tokens and raw response.
- **Shop agent**: a LangChain agent on a free OpenRouter model answers shopping questions with the [shopping MCP](https://github.com/Nuu-maan/shopping-mcp) tools. Every price and link in its answer is checked against the tool output.

A WebGL water simulation runs behind the whole app: clicks, typing, running requests and arriving answers all ripple it. Switching tasks grows a water bubble over the page and bursts it to reveal the next one, and the PC budget slider is a WebGL liquid gauge.

## Run it

Create `.env`:

```bash
API=<your SubQ key>
SHOPPING_MCP_DIR=/absolute/path/to/shopping-mcp
OPENROUTER_API_KEY=<your OpenRouter key>
# Optional, comma-separated, tried in order:
# OPENROUTER_MODELS=nvidia/nemotron-3-super-120b-a12b:free,nvidia/nemotron-3.5-lightning:free
```

Then:

```bash
pnpm install
pnpm dev
```

Keys stay on the server. The browser calls `/api/decide`, `/api/prices` and `/api/shop`.

The shopping MCP runs as a local child process (`uv run --directory $SHOPPING_MCP_DIR shopping-mcp`), so `uv` must be installed. That also means the live price and agent features only work where the app can start that process, not on serverless hosting.

## Live prices

`/api/prices` refreshes every catalog part through the MCP, at most once an hour, and caches the result in `.cache/prices.json`:

- Amazon.in prices and stock come from `amazon_get_product` on each part's ASIN.
- Flipkart candidates come from `search_products`. SubQ choice questions pick the matching listing, and a match only counts at 80% confidence or more. Graphics cards may match any brand with the same GPU and memory size.
- Each part uses the cheaper in-stock store. Parts out of stock everywhere are left out. If a store lookup fails, the part falls back to its catalog snapshot price and is marked as such.

## Shop agent reliability

Free models are the least reliable part of the chain, so the agent is fenced in:

- Model fallback across the configured free models, plus one retry per model call and per tool call.
- At most 8 model calls and 10 tool calls per question.
- Tool results are trimmed to the fields that matter before the model sees them.
- The answer's prices and links are checked against the tool output, and anything not found is flagged in red.

Free OpenRouter accounts are limited to 20 requests a minute and 50 a day, so expect roughly 10 to 20 questions a day.

```bash
pnpm test   # solver and answer-check tests
pnpm lint
pnpm build
```

## Notes from testing the API

- `subq-snap-preview` only serves the Decisions API. `POST /v1/chat/completions` returns `400 Model 'subq-snap-preview' does not support completions requests`.
- Typical latency is 450–900 ms per call, with or without images.
- Validation errors come back as `422` with a JSON-schema style message, for example a score question with one level.

`/api/decide`, `/api/prices` and `/api/shop` have no authentication or rate limit, so don't deploy them publicly as is: anyone could spend your SubQ and OpenRouter credits.
