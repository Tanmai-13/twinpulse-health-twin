import type { Metric, Observation, Patient } from "./types";

export const PATIENTS: Patient[] = [
  { id: "DEMO-001", age: 46, label: "Synthetic profile A" },
  { id: "DEMO-002", age: 63, label: "Synthetic profile B" },
  { id: "DEMO-003", age: 29, label: "Synthetic profile C" },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function anchorDate(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

interface Profile {
  seed: number;
  base: Record<Metric, number>;
  noise: Record<Metric, number>;
  missingRate: number;
  staleSteps?: number; // drop last N days of steps (outdated data)
  glucoseLastDaysAgo: number;
}

const PROFILES: Record<string, Profile> = {
  "DEMO-001": {
    seed: 101,
    base: { hr: 72, sbp: 128, dbp: 82, sleep: 6.6, steps: 6800, glucose: 104 },
    noise: { hr: 4, sbp: 6, dbp: 4, sleep: 0.7, steps: 1800, glucose: 6 },
    missingRate: 0.07,
    glucoseLastDaysAgo: 9,
  },
  "DEMO-002": {
    seed: 202,
    base: { hr: 81, sbp: 141, dbp: 88, sleep: 6.1, steps: 4200, glucose: 118 },
    noise: { hr: 5, sbp: 7, dbp: 5, sleep: 0.8, steps: 1300, glucose: 8 },
    missingRate: 0.12,
    staleSteps: 4,
    glucoseLastDaysAgo: 3,
  },
  "DEMO-003": {
    seed: 303,
    base: { hr: 63, sbp: 116, dbp: 74, sleep: 7.6, steps: 10400, glucose: 88 },
    noise: { hr: 3, sbp: 5, dbp: 3, sleep: 0.6, steps: 2200, glucose: 5 },
    missingRate: 0.04,
    glucoseLastDaysAgo: 20,
  },
};

const HOURS: Record<Metric, number> = { hr: 8, sbp: 9, dbp: 9, sleep: 7, steps: 22, glucose: 7 };
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

/** Deterministic ~30-day synthetic dataset. Missing readings are explicit null markers. */
export function generateDataset(patientId: string, anchor = anchorDate(), days = 30): Observation[] {
  const p = PROFILES[patientId] ?? PROFILES["DEMO-001"];
  const rand = mulberry32(p.seed);
  const out: Observation[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const dayStart = anchor - d * 86400000;
    const trend = (days - d) / days; // slow drift
    for (const m of ["hr", "sbp", "dbp", "sleep", "steps"] as Metric[]) {
      const r1 = rand();
      const r2 = rand();
      if (m === "steps" && p.staleSteps && d < p.staleSteps) continue;
      // steps for "today" aren't complete yet
      if (m === "steps" && d === 0) continue;
      const ts = new Date(dayStart + HOURS[m] * 3600000).toISOString();
      const missing = r1 < p.missingRate;
      const drift = m === "sbp" ? trend * 3 : m === "sleep" ? -trend * 0.3 : 0;
      const val = p.base[m] + drift + (r2 - 0.5) * 2 * p.noise[m];
      out.push({
        id: `${patientId}-${m}-${d}`,
        patientId,
        metric: m,
        value: missing ? null : round(val, m === "sleep" ? 1 : 0),
        timestamp: ts,
        source: "measured",
        note: missing ? "Synthetic missing reading (device not worn)" : undefined,
      });
    }
  }
  for (let d = p.glucoseLastDaysAgo; d < days; d += 5) {
    const r = rand();
    out.push({
      id: `${patientId}-glucose-${d}`,
      patientId,
      metric: "glucose",
      value: round(p.base.glucose + (r - 0.5) * 2 * p.noise.glucose),
      timestamp: new Date(anchor - d * 86400000 + HOURS.glucose * 3600000).toISOString(),
      source: "measured",
    });
  }
  return out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function generateAll(anchor = anchorDate()): Record<string, Observation[]> {
  return Object.fromEntries(PATIENTS.map((p) => [p.id, generateDataset(p.id, anchor)]));
}
