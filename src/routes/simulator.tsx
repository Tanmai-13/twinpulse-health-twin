import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Panel, Notice, RiskDisclaimer, Tag } from "@/components/twin/ui";
import { useTwin } from "@/lib/twin/store";
import { computeRisk } from "@/lib/twin/calc";
import { METRICS, METRIC_KEYS, type Metric } from "@/lib/twin/types";
import { fmtValue } from "@/lib/twin/format";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "What-If Simulator — TwinPulse" },
      { name: "description", content: "Adjust synthetic indicators and compare baseline vs. hypothetical illustrative scores in real time." },
      { property: "og:title", content: "What-If Simulator — TwinPulse" },
      { property: "og:description", content: "Interactive what-if exploration of an illustrative digital-twin score." },
    ],
  }),
  component: SimulatorPage,
});

const RANGES: Record<Metric, [number, number]> = { hr: [40, 130], sbp: [90, 190], dbp: [50, 120], sleep: [3, 11], steps: [0, 20000], glucose: [60, 220] };
const DEFAULTS: Record<Metric, number> = { hr: 70, sbp: 120, dbp: 80, sleep: 7.5, steps: 8000, glucose: 95 };

function SimulatorPage() {
  const { current, patient, addEvent } = useTwin();
  const baseline = current;
  const [sim, setSim] = useState<Partial<Record<Metric, number | null>>>(baseline);
  useEffect(() => setSim(baseline), [baseline]);

  const base = useMemo(() => computeRisk(baseline, patient.age), [baseline, patient.age]);
  const next = useMemo(() => computeRisk(sim, patient.age), [sim, patient.age]);
  const changed = METRIC_KEYS.filter((m) => sim[m] !== baseline[m]);

  const chart = METRIC_KEYS.map((m) => ({
    name: METRICS[m].short,
    Baseline: Number((base.used.find((u) => u.metric === m)?.points ?? 0).toFixed(1)),
    Simulated: Number((next.used.find((u) => u.metric === m)?.points ?? 0).toFixed(1)),
  }));

  function save() {
    if (!changed.length) return toast.error("Adjust at least one indicator before saving.");
    addEvent({
      kind: "hypothetical",
      title: `Hypothetical simulation: score ${base.score ?? "n/a"} → ${next.score ?? "n/a"}`,
      detail: changed.map((m) => `${METRICS[m].short} ${fmtValue(m, baseline[m])} → ${fmtValue(m, sim[m])}`).join("; ") + " (not a measurement)",
    });
    toast.success("Saved as a hypothetical timeline event");
  }

  const ScoreCard = ({ title, r, tone }: { title: string; r: typeof base; tone: "muted" | "primary" }) => (
    <div className={tone === "primary" ? "rounded-xl bg-accent p-4" : "rounded-xl bg-muted p-4"}>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 text-4xl font-semibold">{r.status === "ok" ? r.score : <span className="text-xl text-warning-foreground">Insufficient data</span>}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="What-If Simulator" subtitle="Change indicator values to see how the prototype's scoring rules respond. Simulated values are never stored as measurements."
        actions={<>
          <Button variant="outline" onClick={() => { setSim(baseline); toast("Reset to baseline values"); }}><RotateCcw className="h-4 w-4" /> Reset</Button>
          <Button onClick={save}><Save className="h-4 w-4" /> Save as hypothetical event</Button>
        </>} />
      <Notice>This simulation illustrates how the prototype behaves. It does not predict the effect of any medical treatment or lifestyle change, and it provides no recommendations.</Notice>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Adjust indicators" className="lg:col-span-3">
          <div className="space-y-5">
            {METRIC_KEYS.map((m) => {
              const [lo, hi] = RANGES[m];
              const v = sim[m];
              const missingBase = baseline[m] === null || baseline[m] === undefined;
              return (
                <div key={m}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label htmlFor={`s-${m}`} className="text-sm font-medium">{METRICS[m].label}</label>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Baseline {fmtValue(m, baseline[m])}</span>
                      {v !== baseline[m] && <Tag tone="primary">Simulated {fmtValue(m, v)}</Tag>}
                    </div>
                  </div>
                  {v === null || v === undefined ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch id={`s-${m}`} checked={false} onCheckedChange={() => setSim((s) => ({ ...s, [m]: DEFAULTS[m] }))} aria-label={`Add hypothetical ${METRICS[m].short}`} />
                      No baseline value (missing). Toggle to add a hypothetical value.
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Slider id={`s-${m}`} aria-label={METRICS[m].label} min={lo} max={hi} step={METRICS[m].step} value={[v]} onValueChange={([x]) => setSim((s) => ({ ...s, [m]: x }))} className="flex-1" />
                      {missingBase && <Button size="sm" variant="ghost" onClick={() => setSim((s) => ({ ...s, [m]: null }))}>Remove</Button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Before / after">
            <RiskDisclaimer className="mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <ScoreCard title="Baseline" r={base} tone="muted" />
              <ScoreCard title="Simulated" r={next} tone="primary" />
            </div>
            {base.score !== null && next.score !== null && (
              <p className="mt-3 text-sm text-muted-foreground">Difference: <span className="font-semibold text-foreground">{next.score - base.score > 0 ? "+" : ""}{next.score - base.score}</span> points on the illustrative scale.</p>
            )}
          </Panel>
          <Panel title="Points per input">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ left: -20, right: 4 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Baseline" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Simulated" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
