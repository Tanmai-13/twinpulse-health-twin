import { METRICS, METRIC_KEYS, type Metric, type Observation } from "./types";

export const CSV_COLUMNS = ["patient_id", "timestamp", "metric", "value", "unit", "source"] as const;
export const MISSING_MARKER = "NA";

export function toCSV(obs: Observation[]): string {
  const rows = obs.map((o) =>
    [o.patientId, o.timestamp, o.metric, o.value === null ? MISSING_MARKER : String(o.value), METRICS[o.metric].unit, o.source].join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

export interface ParseResult {
  observations: Observation[];
  errors: string[];
}

export function parseCSV(text: string, patientId: string): ParseResult {
  const errors: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { observations: [], errors: ["File is empty or has no data rows."] };
  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const missingCols = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missingCols.length) return { observations: [], errors: [`Missing required column(s): ${missingCols.join(", ")}`] };
  const idx = Object.fromEntries(CSV_COLUMNS.map((c) => [c, header.indexOf(c)])) as Record<(typeof CSV_COLUMNS)[number], number>;
  const out: Observation[] = [];
  lines.slice(1).forEach((line, i): void => {
    const row = i + 2;
    const cells = line.split(",").map((c) => c.trim());
    const err = (m: string) => { errors.push(m); };
    const metric = cells[idx.metric] as Metric;
    if (!METRIC_KEYS.includes(metric)) return err(`Row ${row}: unknown metric "${cells[idx.metric]}".`);
    const info = METRICS[metric];
    if (cells[idx.unit] !== info.unit) return err(`Row ${row}: unit "${cells[idx.unit]}" should be "${info.unit}" for ${metric}.`);
    const t = Date.parse(cells[idx.timestamp] ?? "");
    if (!cells[idx.timestamp] || Number.isNaN(t)) return err(`Row ${row}: invalid timestamp "${cells[idx.timestamp]}".`);
    const raw = cells[idx.value] ?? "";
    let value: number | null = null;
    if (raw !== MISSING_MARKER && raw !== "") {
      value = Number(raw);
      if (!Number.isFinite(value)) return err(`Row ${row}: value "${raw}" is not numeric (use ${MISSING_MARKER} for missing).`);
      if (value < info.min || value > info.max)
        return err(`Row ${row}: ${metric} value ${value} outside plausible range ${info.min}–${info.max}.`);
    }
    out.push({
      id: `imp-${row}-${t}-${metric}`,
      patientId,
      metric,
      value,
      timestamp: new Date(t).toISOString(),
      source: "imported",
      note: value === null ? "Missing marker preserved from import" : undefined,
    });
  });
  return { observations: out, errors };
}
