import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, FreshBadge, Tag, Notice } from "@/components/twin/ui";
import { MeasurementDialog } from "@/components/twin/MeasurementDialog";
import { useTwin } from "@/lib/twin/store";
import { METRICS, METRIC_KEYS, type Metric } from "@/lib/twin/types";
import { fmtAge, fmtDateTime, fmtValue } from "@/lib/twin/format";

export const Route = createFileRoute("/twin")({
  head: () => ({
    meta: [
      { title: "Patient Twin — TwinPulse" },
      { name: "description", content: "Current and previous virtual state of a synthetic patient, with measured, missing and outdated values clearly labeled." },
      { property: "og:title", content: "Patient Twin — TwinPulse" },
      { property: "og:description", content: "Virtual state of a synthetic patient with transparent data provenance." },
    ],
  }),
  component: TwinPage,
});

function TwinPage() {
  const { patient, states, obs, sim } = useTwin();
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>("hr");

  function summary(m: Metric) {
    const vals = obs.filter((o) => o.metric === m && o.value !== null).map((o) => o.value as number);
    if (!vals.length) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { n: vals.length, avg, min: Math.min(...vals), max: Math.max(...vals) };
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Patient Twin" subtitle={`Virtual state of synthetic patient ${patient.id} (age ${patient.age}). Every value below is DEMO DATA.`}
        actions={<Button onClick={() => { setMetric("hr"); setOpen(true); }}><Plus className="h-4 w-4" /> Add measurement</Button>} />

      <Panel title="How to read this twin">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><Tag tone="teal">Measured</Tag><p className="mt-1 text-muted-foreground">A synthetic reading recorded within its freshness window.</p></div>
          <div><Tag tone="warning">Outdated</Tag><p className="mt-1 text-muted-foreground">Last reading is older than the configured threshold. Still shown, but reduces reliability.</p></div>
          <div><Tag tone="danger">Missing</Tag><p className="mt-1 text-muted-foreground">No usable reading exists. Nothing is inferred to fill the gap.</p></div>
          <div><Tag tone="primary">Simulated</Tag><p className="mt-1 text-muted-foreground">Only appears in the What-If Simulator — never stored as a measurement.</p></div>
        </div>
        {(sim.masked.length > 0 || sim.delayHours > 0) && <div className="mt-4"><Notice>Missing/delayed-data simulation is active on the Data Quality page — some readings are hidden from the twin.</Notice></div>}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {METRIC_KEYS.map((m) => {
          const s = states[m];
          const sum = summary(m);
          return (
            <section key={m} className="card-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{METRICS[m].label}</h2>
                  <p className="text-xs text-muted-foreground">Unit: {METRICS[m].unit}</p>
                </div>
                <FreshBadge f={s.freshness} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-accent p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">Current state</div>
                  <div className="mt-1 text-xl font-semibold">{fmtValue(m, s.latest?.value)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{s.latest ? fmtDateTime(s.latest.timestamp) : "No reading"}</div>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Previous state</div>
                  <div className="mt-1 text-xl font-semibold">{fmtValue(m, s.previous?.value)}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{s.previous ? fmtDateTime(s.previous.timestamp) : "No reading"}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{sum ? `${sum.n} readings · avg ${fmtValue(m, sum.avg)} · range ${fmtValue(m, sum.min)}–${fmtValue(m, sum.max)}` : "No historical readings"}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Updated {fmtAge(s.ageHours)} · source: {s.latest?.source ?? "—"}</span>
                <Button size="sm" variant="outline" onClick={() => { setMetric(m); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /> New value</Button>
              </div>
            </section>
          );
        })}
      </div>
      <MeasurementDialog open={open} onOpenChange={setOpen} defaultMetric={metric} />
    </div>
  );
}
