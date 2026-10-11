import assert from "node:assert/strict";
import test from "node:test";
import { requiredPsu, solve, type Needs } from "./pc.ts";

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
  assert.ok(cheapest > 30000);
});
