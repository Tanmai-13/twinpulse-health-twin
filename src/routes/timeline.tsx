import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader, Panel, FreshBadge, Tag } from "@/components/twin/ui";
import { TrendChart } from "@/components/twin/TrendChart";
import { MeasurementDialog } from "@/components/twin/MeasurementDialog";
import { useTwin } from "@/lib/twin/store";
import { METRICS, type Metric, type Observation } from "@/lib/twin/types";
import { fmtAge, fmtDateTime, fmtValue } from "@/lib/twin/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Health Timeline — TwinPulse" },
      { name: "description", content: "Interactive 30-day synthetic time series with filters, tooltips and explicit missing/outdated markers." },
      { property: "og:title", content: "Health Timeline — TwinPulse" },
      { property: "og:description", content: "Interactive synthetic health measurement timeline." },
    ],
  }),
  component: TimelinePage,
});

const VIEWS: { key: string; label: string; metrics: Metric[] }[] = [
  { key: "hr", label: "Heart rate", metrics: ["hr"] },
  { key: "bp", label: "Blood pressure", metrics: ["sbp", "dbp"] },
  { key: "sleep", label: "Sleep", metrics: ["sleep"] },
  { key: "steps", label: "Activity", metrics: ["steps"] },
  { key: "glucose", label: "Glucose", metrics: ["glucose"] },
];
const RANGES = [{ v: "7", l: "Last 7 days" }, { v: "14", l: "Last 14 days" }, { v: "30", l: "Last 30 days" }, { v: "all", l: "All data" }];

function TimelinePage() {
  const { obs, states, now, thresholds, events, removeObservation } = useTwin();
  const [view, setView] = useState("hr");
  const [range, setRange] = useState("30");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);
  const [deleting, setDeleting] = useState<Observation | null>(null);
  const sel = VIEWS.find((v) => v.key === view)!;

  const filtered = useMemo(() => {
    const from = range === "all" ? 0 : now - Number(range) * 86400000;
    return obs.filter((o) => Date.parse(o.timestamp) >= from);
  }, [obs, range, now]);
  const chartObs = filtered.filter((o) => sel.metrics.includes(o.metric));
  const rows = chartObs
    .filter((o) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [METRICS[o.metric].label, o.source, o.note ?? "", o.value === null ? "missing" : String(o.value), fmtDateTime(o.timestamp)].join(" ").toLowerCase().includes(q);
    })
    .slice()
    .reverse();
  const missingCount = chartObs.filter((o) => o.value === null).length;
  const staleFrom = now - thresholds[sel.metrics[0]] * 3600000;

  return (
    <div className="space-y-6">
      <PageHeader title="Health Timeline" subtitle="Synthetic ~30-day time series. Missing readings appear as gaps and are listed explicitly; the shaded area marks the current freshness window."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add measurement</Button>} />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Measurement type">
            {VIEWS.map((v) => (
              <button key={v.key} role="tab" aria-selected={view === v.key} onClick={() => setView(v.key)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === v.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>{v.label}</button>
            ))}
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px]" aria-label="Date range"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {sel.metrics.map((m) => (
            <span key={m} className="inline-flex items-center gap-1.5">{METRICS[m].short} ({METRICS[m].unit}) <FreshBadge f={states[m].freshness} /> last {fmtAge(states[m].ageHours)}</span>
          ))}
          <span className="ml-auto">{missingCount} missing marker{missingCount === 1 ? "" : "s"} in range</span>
        </div>
        <TrendChart obs={chartObs} metrics={sel.metrics} height={300} staleAfter={staleFrom} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Observations" description="Search, edit or remove synthetic records" className="lg:col-span-2"
          action={<div className="relative w-44 sm:w-56"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search observations" className="pl-8" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>}>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No observations match these filters.</p>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                  <tr><th className="py-2 font-medium">Timestamp</th><th className="font-medium">Type</th><th className="font-medium">Value</th><th className="hidden font-medium sm:table-cell">Source</th><th className="sr-only">Actions</th></tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2 pr-2 text-xs">{fmtDateTime(o.timestamp)}</td>
                      <td className="pr-2">{METRICS[o.metric].short}</td>
                      <td className="pr-2">{o.value === null ? <Tag tone="danger">Missing</Tag> : fmtValue(o.metric, o.value)}</td>
                      <td className="hidden sm:table-cell"><Tag>{o.source}</Tag></td>
                      <td className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" aria-label="Edit observation" onClick={() => { setEditing(o); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Remove observation" onClick={() => setDeleting(o)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Event log" description="Edits, imports and hypothetical simulations">
          {events.length === 0 ? <p className="text-sm text-muted-foreground">No events yet. Add a measurement or save a simulation.</p> : (
            <ol className="relative max-h-[420px] space-y-4 overflow-auto border-l pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={cn("absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full", e.kind === "hypothetical" ? "bg-warning" : "bg-primary")} />
                  <div className="flex flex-wrap items-center gap-1.5"><span className="text-sm font-medium">{e.title}</span>{e.kind === "hypothetical" && <Tag tone="warning">Hypothetical</Tag>}</div>
                  {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
                  <p className="text-[11px] text-muted-foreground">{fmtDateTime(e.timestamp)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <MeasurementDialog open={open} onOpenChange={setOpen} editing={editing} defaultMetric={sel.metrics[0]} />
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this observation?</AlertDialogTitle>
            <AlertDialogDescription>The synthetic record will be deleted and all indicators recalculated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) { removeObservation(deleting.id); toast.success("Observation removed"); } setDeleting(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
