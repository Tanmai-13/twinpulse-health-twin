import { METRICS, type Metric } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function fmtDate(iso: string | number) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtDateTime(iso: string | number) {
  const d = new Date(iso);
  return `${fmtDate(iso)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
export function fmtShort(iso: string | number) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export function fmtAge(hours: number | null) {
  if (hours === null) return "never";
  if (hours < 1) return "just now";
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
export function fmtValue(metric: Metric, v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const s = metric === "steps" ? Math.round(v).toLocaleString("en-US") : metric === "sleep" ? v.toFixed(1) : String(Math.round(v));
  return `${s} ${METRICS[metric].unit}`;
}
export function toLocalInput(iso: string) {
  return iso.slice(0, 16);
}
