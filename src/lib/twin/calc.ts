import {
  CORE_METRICS,
  METRIC_KEYS,
  type Metric,
  type Observation,
  type SimulationSettings,
  type Thresholds,
} from "./types";

export type Freshness = "fresh" | "stale" | "missing";

export interface IndicatorState {
  metric: Metric;
  latest: Observation | null;
  previous: Observation | null;
  ageHours: number | null;
  freshness: Freshness;
}

/** Apply "simulate missing / delayed" settings without altering stored data. */
export function effectiveObservations(obs: Observation[], sim: SimulationSettings, now: number) {
  const cutoff = now - sim.delayHours * 3600000;
  return obs.filter((o) => !sim.masked.includes(o.metric) && Date.parse(o.timestamp) <= cutoff);
}

export function indicatorStates(obs: Observation[], thresholds: Thresholds, now: number): Record<Metric, IndicatorState> {
  const res = {} as Record<Metric, IndicatorState>;
  for (const m of METRIC_KEYS) {
    const vals = obs
      .filter((o) => o.metric === m && o.value !== null && Date.parse(o.timestamp) <= now)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const latest = vals[0] ?? null;
    const ageHours = latest ? (now - Date.parse(latest.timestamp)) / 3600000 : null;
    res[m] = {
      metric: m,
      latest,
      previous: vals[1] ?? null,
      ageHours,
      freshness: ageHours === null ? "missing" : ageHours > thresholds[m] ? "stale" : "fresh",
    };
  }
  return res;
}

/** Share of expected daily core-measurement slots (last N days) that contain a real value. */
export function completeness(obs: Observation[], now: number, days = 30) {
  const dayKey = (t: number) => Math.floor(t / 86400000);
  const today = dayKey(now);
  const filled = new Set<string>();
  for (const o of obs) {
    if (o.value === null || !CORE_METRICS.includes(o.metric)) continue;
    const k = dayKey(Date.parse(o.timestamp));
    if (k > today - days && k <= today) filled.add(`${o.metric}-${k}`);
  }
  const expected = CORE_METRICS.length * days;
  return { expected, filled: filled.size, missing: expected - filled.size, pct: Math.round((filled.size / expected) * 100) };
}

/* ------------------------------------------------------------------ */
/* Illustrative risk score — NOT clinically validated, NOT a diagnosis */
/* ------------------------------------------------------------------ */

export interface RiskRule {
  metric: Metric | "age";
  max: number;
  rule: string;
  points: (v: number) => number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const RISK_RULES: RiskRule[] = [
  { metric: "age", max: 10, rule: "0.25 pts per year above 30 (max 10)", points: (v) => clamp((v - 30) * 0.25, 0, 10) },
  { metric: "hr", max: 15, rule: "0.75 pts per bpm above 70 (max 15)", points: (v) => clamp((v - 70) * 0.75, 0, 15) },
  { metric: "sbp", max: 25, rule: "0.6 pts per mmHg above 120 (max 25)", points: (v) => clamp((v - 120) * 0.6, 0, 25) },
  { metric: "dbp", max: 15, rule: "0.75 pts per mmHg above 80 (max 15)", points: (v) => clamp((v - 80) * 0.75, 0, 15) },
  { metric: "sleep", max: 15, rule: "6 pts per hour away from 7.5 h (max 15)", points: (v) => clamp(Math.abs(v - 7.5) * 6, 0, 15) },
  { metric: "steps", max: 10, rule: "Up to 10 pts as steps fall below 8,000", points: (v) => clamp(((8000 - v) / 8000) * 10, 0, 10) },
  { metric: "glucose", max: 10, rule: "0.4 pts per mg/dL above 100 (max 10)", points: (v) => clamp((v - 100) * 0.4, 0, 10) },
];

export const MIN_CORE_INPUTS = 3;

export interface RiskResult {
  status: "ok" | "insufficient";
  score: number | null;
  used: { metric: Metric | "age"; value: number; points: number; max: number }[];
  unavailable: Metric[];
}

/**
 * Score = 100 × (points earned) / (max points of the inputs that are available).
 * Unavailable inputs are excluded from both numerator and denominator,
 * so missing data never pushes the score up or down.
 */
export function computeRisk(values: Partial<Record<Metric, number | null>>, age: number): RiskResult {
  const used: RiskResult["used"] = [];
  const unavailable: Metric[] = [];
  for (const r of RISK_RULES) {
    const v = r.metric === "age" ? age : values[r.metric];
    if (v === null || v === undefined || Number.isNaN(v)) {
      if (r.metric !== "age") unavailable.push(r.metric);
      continue;
    }
    used.push({ metric: r.metric, value: v, points: r.points(v), max: r.max });
  }
  const coreCount = used.filter((u) => u.metric !== "age" && CORE_METRICS.includes(u.metric as Metric)).length;
  if (coreCount < MIN_CORE_INPUTS) return { status: "insufficient", score: null, used, unavailable };
  const pts = used.reduce((s, u) => s + u.points, 0);
  const max = used.reduce((s, u) => s + u.max, 0);
  return { status: "ok", score: Math.round((pts / max) * 100), used, unavailable };
}

export function riskBand(score: number) {
  return score < 25 ? "Lower" : score < 50 ? "Moderate" : "Elevated";
}

/* ------------------------------------------------------------------ */
/* Data Reliability Indicator — heuristic, not calibrated confidence   */
/* ------------------------------------------------------------------ */

export const RELIABILITY_WEIGHTS: Record<Metric, number> = { hr: 2, sbp: 2, dbp: 2, sleep: 1.5, steps: 1.5, glucose: 1 };

/** fresh = 1, stale decays linearly from 0.6 to 0.2 over 3× threshold, missing = 0; weighted average. */
export function reliability(states: Record<Metric, IndicatorState>, thresholds: Thresholds) {
  let total = 0;
  let got = 0;
  for (const m of METRIC_KEYS) {
    const s = states[m];
    const w = RELIABILITY_WEIGHTS[m];
    total += w;
    if (s.freshness === "fresh") got += w;
    else if (s.freshness === "stale" && s.ageHours !== null) {
      const over = (s.ageHours - thresholds[m]) / (thresholds[m] * 3);
      got += w * clamp(0.6 - over * 0.4, 0.2, 0.6);
    }
  }
  const score = Math.round((got / total) * 100);
  const label = score >= 80 ? "High" : score >= 55 ? "Moderate" : "Low";
  const missing = METRIC_KEYS.filter((m) => states[m].freshness === "missing");
  const stale = METRIC_KEYS.filter((m) => states[m].freshness === "stale");
  let message = "Recent measurements are available for all indicators.";
  if (missing.length && stale.length)
    message = "Confidence in this estimate is limited because some measurements are missing and others are outdated.";
  else if (missing.length) message = "Confidence in this estimate is limited because recent measurements are missing.";
  else if (stale.length) message = "Confidence in this estimate is reduced because some measurements are outdated.";
  return { score, label, missing, stale, message };
}

export function latestValues(states: Record<Metric, IndicatorState>, which: "latest" | "previous" = "latest") {
  const v: Partial<Record<Metric, number | null>> = {};
  for (const m of METRIC_KEYS) v[m] = states[m][which]?.value ?? null;
  return v;
}
