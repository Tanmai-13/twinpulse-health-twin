import { describe, expect, it } from "vitest";
import { completeness, computeRisk, indicatorStates, reliability } from "./calc";
import { DEFAULT_THRESHOLDS, type Observation } from "./types";
import { generateDataset } from "./data";

describe("illustrative risk score", () => {
  it("returns insufficient data with fewer than 3 core inputs", () => {
    const r = computeRisk({ hr: 90, sbp: 150 }, 50);
    expect(r.status).toBe("insufficient");
    expect(r.score).toBeNull();
  });
  it("is 0 for values at reference levels", () => {
    expect(computeRisk({ hr: 70, sbp: 120, dbp: 80, sleep: 7.5, steps: 8000 }, 30).score).toBe(0);
  });
  it("missing inputs do not raise the score", () => {
    const full = computeRisk({ hr: 70, sbp: 120, dbp: 80, sleep: 7.5, steps: 8000, glucose: 90 }, 30);
    const partial = computeRisk({ hr: 70, sbp: 120, dbp: 80 }, 30);
    expect(partial.score).toBe(full.score);
  });
});

describe("data reliability", () => {
  it("missing indicators lower reliability", () => {
    const now = Date.UTC(2026, 0, 31);
    const obs = generateDataset("DEMO-001", now);
    const full = reliability(indicatorStates(obs, DEFAULT_THRESHOLDS, now), DEFAULT_THRESHOLDS);
    const fewer = reliability(
      indicatorStates(obs.filter((o) => o.metric !== "hr"), DEFAULT_THRESHOLDS, now),
      DEFAULT_THRESHOLDS,
    );
    expect(fewer.score).toBeLessThan(full.score);
  });
  it("null markers count as missing in completeness", () => {
    const now = Date.UTC(2026, 0, 2);
    const o: Observation = { id: "1", patientId: "p", metric: "hr", value: null, timestamp: new Date(now - 3600000).toISOString(), source: "measured" };
    expect(completeness([o], now, 1).filled).toBe(0);
  });
});
