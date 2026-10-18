export type Metric = "hr" | "sbp" | "dbp" | "sleep" | "steps" | "glucose";

export type Source = "measured" | "simulated" | "imported";

export interface Observation {
  id: string;
  patientId: string;
  metric: Metric;
  /** null = explicit missing-value marker (never silently filled) */
  value: number | null;
  timestamp: string; // ISO UTC
  source: Source;
  note?: string | undefined;
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  timestamp: string;
  kind: "measurement" | "edit" | "removal" | "hypothetical" | "import" | "reset";
  title: string;
  detail?: string;
}

export interface Patient {
  id: string;
  age: number;
  label: string;
}

export interface MetricInfo {
  label: string;
  short: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  core: boolean;
}

export const METRICS: Record<Metric, MetricInfo> = {
  hr: { label: "Resting heart rate", short: "Heart rate", unit: "bpm", min: 30, max: 200, step: 1, core: true },
  sbp: { label: "Systolic blood pressure", short: "Systolic BP", unit: "mmHg", min: 70, max: 250, step: 1, core: true },
  dbp: { label: "Diastolic blood pressure", short: "Diastolic BP", unit: "mmHg", min: 40, max: 150, step: 1, core: true },
  sleep: { label: "Sleep duration", short: "Sleep", unit: "h", min: 0, max: 16, step: 0.1, core: true },
  steps: { label: "Daily step count", short: "Steps", unit: "steps", min: 0, max: 60000, step: 100, core: true },
  glucose: { label: "Fasting blood glucose (optional)", short: "Glucose", unit: "mg/dL", min: 40, max: 400, step: 1, core: false },
};

export const METRIC_KEYS = Object.keys(METRICS) as Metric[];
export const CORE_METRICS = METRIC_KEYS.filter((m) => METRICS[m].core);

export type Thresholds = Record<Metric, number>; // hours until stale

export const DEFAULT_THRESHOLDS: Thresholds = {
  hr: 48,
  sbp: 72,
  dbp: 72,
  sleep: 48,
  steps: 48,
  glucose: 168,
};

export interface SimulationSettings {
  masked: Metric[]; // treat as unavailable
  delayHours: number; // readings newer than this have "not arrived yet"
}
