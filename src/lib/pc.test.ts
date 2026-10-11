import assert from "node:assert/strict";
import test from "node:test";
import { catalog, requiredPsu, solve, type Needs, type PriceBook } from "./pc.ts";

const needs: Needs = {
  resolution: "1440p",
  workload: "aaa",
  streaming: true,
  wifi: true,
  showcase: false,
  storageTb: 1,
  upgradePath: true,
};

test("every build is compatible and within budget", () => {
  for (const budget of [130000, 200000, 300000]) {
    const { builds } = solve(needs, budget);
    assert.ok(builds.length > 0, `no build for ${budget}`);
    for (const build of builds) {
      const kinds = build.parts.map((part) => part.kind);
      assert.equal(new Set(kinds).size, kinds.length);
      for (const part of build.parts) assert.match(part.asin, /^B0[0-9A-Z]{8}$/);
      assert.ok(build.total <= budget);
      assert.equal(build.total, build.parts.reduce((sum, part) => sum + part.price, 0));
      assert.equal(kinds.includes("CPU cooler"), !build.cpu.coolerIncluded);
      const psu = build.parts.find((part) => part.kind === "Power supply")!;
      assert.ok(psu.name.startsWith(`${requiredPsu(build.cpu, build.gpu)}W`));
      const board = build.parts.find((part) => part.kind === "Motherboard")!;
      assert.match(board.name, /WiFi|AX/);
    }
    assert.equal(new Set(builds.map((build) => build.gpu.name)).size, builds.length);
  }
});

test("builds are ranked best first", () => {
  const { builds } = solve(needs, 200000);
  assert.ok(builds.length > 1);
  for (let i = 1; i < builds.length; i++) assert.ok(builds[i - 1].score >= builds[i].score);
});

test("an impossible budget returns no builds and the cheapest total", () => {
  const { builds, cheapest } = solve(needs, 30000);
  assert.equal(builds.length, 0);
  assert.ok(cheapest !== null && cheapest > 30000);
});

function bookFor(change: (asin: string, kind: string, price: number) => PriceBook["offers"][string]): PriceBook {
  return {
    checkedAt: new Date().toISOString(),
    offers: Object.fromEntries(catalog().map(({ kind, item }) => [item.asin, change(item.asin, kind, item.price)])),
  };
}

test("live prices pick the cheaper in-stock store", () => {
  const book = bookFor((asin, _kind, price) => [
    { store: "amazon", price, url: `https://www.amazon.in/dp/${asin}`, title: asin, inStock: true },
    { store: "flipkart", price: price - 1000, url: `https://www.flipkart.com/p/${asin}`, title: `Flipkart ${asin}`, inStock: true },
  ]);
  for (const part of solve(needs, 200000, book).builds[0].parts) {
    assert.equal(part.store, "flipkart");
    assert.ok(part.live);
    assert.deepEqual(part.alternative, { store: "amazon", price: part.price + 1000 });
  }
});

test("parts out of stock everywhere are never used", () => {
  const gone = new Set(catalog().filter(({ kind }) => kind === "Graphics card").slice(0, 3).map(({ item }) => item.asin));
  const book = bookFor((asin, _kind, price) => [
    { store: "amazon", price, url: `https://www.amazon.in/dp/${asin}`, title: asin, inStock: !gone.has(asin) },
  ]);
  for (const build of solve(needs, 300000, book).builds) assert.ok(!gone.has(build.gpu.asin));
});

test("a price book with no stock at all yields no builds", () => {
  const book = bookFor((asin, _kind, price) => [
    { store: "amazon", price, url: `https://www.amazon.in/dp/${asin}`, title: asin, inStock: false },
  ]);
  assert.deepEqual(solve(needs, 300000, book), { builds: [], cheapest: null });
});
