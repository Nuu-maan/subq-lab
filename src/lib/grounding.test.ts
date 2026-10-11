import assert from "node:assert/strict";
import test from "node:test";
import { checkAnswer, collectFacts, linkKey } from "./grounding.ts";

const toolOutputs = [
  JSON.stringify({
    flipkart: [{ title: "ASUS Dual RTX 5060", price: 54999, mrp: 61999, url: "https://www.flipkart.com/asus-dual-rtx-5060/p/itmabc123?pid=GRA1" }],
    amazon: [{ title: "ZOTAC RTX 5060", price: 57419, url: "https://www.amazon.in/ZOTAC-Gaming/dp/B0HD5MWBFS?th=1" }],
  }),
];

test("Indian-format prices and store links from tool output are verified", () => {
  const result = checkAnswer(
    "- ASUS Dual RTX 5060: ₹54,999 on Flipkart https://www.flipkart.com/asus-dual-rtx-5060/p/itmabc123\n- ZOTAC: Rs. 57,419 https://amazon.in/dp/B0HD5MWBFS.",
    collectFacts(toolOutputs),
  );
  assert.deepEqual(
    result.prices.map(({ amount, verified }) => [amount, verified]),
    [
      [54999, true],
      [57419, true],
    ],
  );
  assert.ok(result.links.every((link) => link.verified));
});

test("invented prices and links are flagged", () => {
  const result = checkAnswer("RTX 5070 for ₹52,000 at https://www.amazon.in/dp/B0AAAAAAAA", collectFacts(toolOutputs));
  assert.deepEqual(result.prices, [{ text: "₹52,000", amount: 52000, verified: false }]);
  assert.deepEqual(result.links, [{ url: "https://www.amazon.in/dp/B0AAAAAAAA", verified: false }]);
});

test("store links normalise to product ids", () => {
  assert.equal(linkKey("https://www.amazon.in/Some-Slug/dp/b0hd5mwbfs/ref=x"), "amazon:B0HD5MWBFS");
  assert.equal(linkKey("https://www.flipkart.com/x/p/itmABC?pid=1"), "flipkart:itmabc");
});
