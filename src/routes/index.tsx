import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Stat, RiskDisclaimer, FreshBadge, Notice, Tag, Meter, relTone } from "@/components/twin/ui";
import { TrendChart } from "@/components/twin/TrendChart";
import { useTwin } from "@/lib/twin/store";
import { METRICS, METRIC_KEYS, type Metric } from "@/lib/twin/types";
import { fmtAge, fmtDate, fmtDateTime, fmtValue } from "@/lib/twin/format";
import { riskBand } from "@/lib/twin/calc";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — TwinPulse Health Digital Twin" },
      { name: "description", content: "Overview of a synthetic personal health digital twin: illustrative risk, data completeness and quality alerts." },
      { property: "og:title", content: "Overview — TwinPulse Health Digital Twin" },
      { property: "og:description", content: "Overview of a synthetic personal health digital twin with uncertainty-aware indicators." },
    ],
  }),
  component: Overview,
});

const CHART_OPTS: { key: string; label: string; metrics: Metric[] }[] = [
  { key: "hr", label: "Heart rate", metrics: ["hr"] },
  { key: "bp", label: "Blood pressure", metrics: ["sbp", "dbp"] },
  { key: "sleep", label: "Sleep", metrics: ["sleep"] },
  { key: "steps", label: "Steps", metrics: ["steps"] },
];

function Overview() {
  const { patient, risk, rel, comp, obs, states, events, lastUpdate } = useTwin();
  const [chart, setChart] = useState("bp");
  const sel = CHART_OPTS.find((c) => c.key === chart)!;
  const alerts = METRIC_KEYS.filter((m) => states[m].freshness !== "fresh");
  const recentObs = [...obs].reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title="Your Health Twin, Explained" subtitle="A research prototype that mirrors a synthetic person's health state from time-stamped measurements — and is explicit about what it doesn't know when data is missing or outdated." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-2xl bg-hero p-5 text-primary-foreground shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide">DEMO DATA</span>
            <UserRound className="h-5 w-5 opacity-80" />
          </div>
          <div className="mt-6 text-sm opacity-80">Synthetic patient</div>
          <div className="text-2xl font-semibold">{patient.id}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><div className="opacity-75">Age</div><div className="font-semibold">{patient.age} years</div></div>
            <div><div className="opacity-75">Profile</div><div className="font-semibold">{patient.label}</div></div>
          </div>
          <p className="mt-4 text-xs opacity-80">Not a real person. Values are generated deterministically for research demonstration.</p>
        </section>

        <Panel title="Current illustrative risk estimate" className="lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="shrink-0">
              {risk.status === "ok" ? (
                <div className="flex items-baseline gap-2"><span className="text-5xl font-semibold tracking-tight">{risk.score}</span><span className="text-muted-foreground">/ 100</span></div>
              ) : (
                <div className="text-2xl font-semibold text-warning-foreground">Insufficient data</div>
              )}
              {risk.status === "ok" && <div className="mt-1 text-sm text-muted-foreground">{riskBand(risk.score!)} band (illustrative)</div>}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <RiskDisclaimer />
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="font-medium">Data Reliability Indicator</span><span className="font-semibold">{rel.label} · {rel.score}/100</span></div>
                <Meter value={rel.score} tone={relTone(rel.label)} />
                <p className="mt-1.5 text-xs text-muted-foreground">{rel.message}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/simulator"><FlaskConical className="h-4 w-4" /> Open simulator</Link></Button>
            <Button asChild variant="outline"><Link to="/twin">View patient twin <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild variant="ghost"><Link to="/risk">How is this calculated?</Link></Button>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Data completeness (30 days)" value={`${comp.pct}%`} hint={`${comp.filled} of ${comp.expected} expected readings`} tone={comp.pct < 80 ? "warning" : "teal"} />
        <Stat label="Missing measurements" value={comp.missing} hint="Core daily slots without a value" tone={comp.missing > 15 ? "warning" : "default"} />
        <Stat label="Most recent measurement" value={<span className="text-lg">{lastUpdate ? fmtDate(lastUpdate) : "—"}</span>} hint={lastUpdate ? fmtDateTime(lastUpdate) : "No data"} />
        <Stat label="Indicators needing attention" value={alerts.length} hint="Missing or outdated" tone={alerts.length ? "warning" : "teal"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Health indicator trend" description="Synthetic observations · gaps are missing readings (not filled)" className="lg:col-span-2"
          action={
            <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="tablist">
              {CHART_OPTS.map((c) => (
                <button key={c.key} role="tab" aria-selected={chart === c.key} onClick={() => setChart(c.key)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", chart === c.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{c.label}</button>
              ))}
            </div>
          }>
          <TrendChart obs={obs} metrics={sel.metrics} />
        </Panel>

        <Panel title="Data-quality alerts" action={<Link to="/quality" className="text-xs font-medium text-primary hover:underline">Details</Link>}>
          {alerts.length === 0 ? (
            <Notice tone="info">All indicators have recent readings.</Notice>
          ) : (
            <ul className="space-y-2.5">
              {alerts.map((m) => (
                <li key={m} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{METRICS[m].short}</div>
                    <div className="text-xs text-muted-foreground">Last value {fmtAge(states[m].ageHours)}</div>
                  </div>
                  <FreshBadge f={states[m].freshness} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent timeline events" action={<Link to="/timeline" className="text-xs font-medium text-primary hover:underline">Open timeline</Link>}>
        <ul className="divide-y">
          {events.slice(0, 4).map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><span className="font-medium">{e.title}</span>{e.detail && <span className="text-muted-foreground"> · {e.detail}</span>}</div>
              <div className="flex shrink-0 items-center gap-2"><Tag tone={e.kind === "hypothetical" ? "warning" : "primary"}>{e.kind === "hypothetical" ? "Hypothetical" : e.kind}</Tag><span className="hidden text-xs text-muted-foreground sm:inline">{fmtDateTime(e.timestamp)}</span></div>
            </li>
          ))}
          {recentObs.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0"><span className="font-medium">{METRICS[o.metric].short}</span> <span className={o.value === null ? "text-destructive" : "text-muted-foreground"}>{o.value === null ? "Missing reading" : fmtValue(o.metric, o.value)}</span></div>
              <div className="flex shrink-0 items-center gap-2"><Tag>{o.source}</Tag><span className="text-xs text-muted-foreground">{fmtDateTime(o.timestamp)}</span></div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
