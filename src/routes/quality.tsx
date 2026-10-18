import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { PageHeader, Panel, Stat, FreshBadge, Meter, Notice, relTone } from "@/components/twin/ui";
import { useTwin } from "@/lib/twin/store";
import { DEFAULT_THRESHOLDS, METRICS, METRIC_KEYS, type Metric } from "@/lib/twin/types";
import { fmtAge, fmtDateTime } from "@/lib/twin/format";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Data Quality & Uncertainty — TwinPulse" },
      { name: "description", content: "Completeness, freshness thresholds, missing/stale alerts and a heuristic Data Reliability Indicator." },
      { property: "og:title", content: "Data Quality & Uncertainty — TwinPulse" },
      { property: "og:description", content: "How missing or outdated data affects digital-twin reliability." },
    ],
  }),
  component: QualityPage,
});

function QualityPage() {
  const { states, rel, comp, thresholds, setThresholds, sim, setSim, risk } = useTwin();
  const simActive = sim.masked.length > 0 || sim.delayHours > 0;

  const toggleMask = (m: Metric, on: boolean) =>
    setSim({ ...sim, masked: on ? [...sim.masked, m] : sim.masked.filter((x) => x !== m) });

  return (
    <div className="space-y-6">
      <PageHeader title="Data Quality & Uncertainty" subtitle="Data quality describes how much the twin can be trusted right now. It is deliberately kept separate from the illustrative health risk score." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Completeness (30 days)" value={`${comp.pct}%`} hint={`${comp.filled}/${comp.expected} core readings`} tone={comp.pct < 80 ? "warning" : "teal"} />
        <Stat label="Missing measurements" value={comp.missing} hint="Includes explicit missing markers" />
        <Stat label="Outdated indicators" value={rel.stale.length} tone={rel.stale.length ? "warning" : "default"} />
        <Stat label="Unavailable indicators" value={rel.missing.length} tone={rel.missing.length ? "danger" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Data Reliability Indicator" description="Heuristic — not a calibrated statistical confidence">
          <div className="flex items-baseline gap-2"><span className="text-5xl font-semibold">{rel.score}</span><span className="text-muted-foreground">/ 100 · {rel.label}</span></div>
          <div className="mt-3"><Meter value={rel.score} tone={relTone(rel.label)} /></div>
          <p className="mt-3 text-sm font-medium">{rel.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">Each indicator contributes its weight when fresh, 60%→20% of its weight when outdated (decaying with age), and nothing when missing. The illustrative risk score is currently <span className="font-semibold text-foreground">{risk.status === "ok" ? risk.score : "insufficient data"}</span> — missing data excludes inputs rather than raising risk.</p>
        </Panel>

        <Panel title="Simulate missing or delayed readings" description="Hides data from the twin without deleting it"
          action={simActive ? <Button size="sm" variant="outline" onClick={() => setSim({ masked: [], delayHours: 0 })}><RotateCcw className="h-3.5 w-3.5" /> Clear</Button> : undefined}>
          <div className="grid grid-cols-2 gap-2">
            {METRIC_KEYS.map((m) => (
              <label key={m} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                <span className="truncate">Remove {METRICS[m].short}</span>
                <Switch checked={sim.masked.includes(m)} onCheckedChange={(c) => toggleMask(m, c)} aria-label={`Simulate missing ${METRICS[m].short}`} />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Delay all incoming readings</span><span className="text-muted-foreground">{sim.delayHours} h</span></div>
            <Slider aria-label="Reading delay in hours" min={0} max={240} step={6} value={[sim.delayHours]} onValueChange={([v]) => setSim({ ...sim, delayHours: v ?? 0 })} />
            <p className="mt-1.5 text-xs text-muted-foreground">Readings newer than the delay are treated as not yet received, so values age and may become outdated.</p>
          </div>
          {simActive && <div className="mt-4"><Notice>Simulation active — all pages currently reflect the reduced dataset.</Notice></div>}
        </Panel>
      </div>

      <Panel title="Indicator freshness" description="Edit thresholds to change when a reading is considered outdated"
        action={<Button size="sm" variant="ghost" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>Reset thresholds</Button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Indicator</th><th className="font-medium">Last updated</th><th className="font-medium">Age</th><th className="font-medium">Status</th><th className="font-medium">Stale after (hours)</th></tr></thead>
            <tbody className="divide-y">
              {METRIC_KEYS.map((m) => {
                const s = states[m];
                return (
                  <tr key={m}>
                    <td className="py-2.5 pr-3 font-medium">{METRICS[m].short}</td>
                    <td className="pr-3 text-xs">{s.latest ? fmtDateTime(s.latest.timestamp) : "—"}</td>
                    <td className="pr-3 text-xs text-muted-foreground">{fmtAge(s.ageHours)}</td>
                    <td className="pr-3"><FreshBadge f={s.freshness} /></td>
                    <td>
                      <Input type="number" min={1} max={2000} className="h-8 w-24" aria-label={`Stale threshold for ${METRICS[m].short}`} value={thresholds[m]}
                        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 1) setThresholds({ ...thresholds, [m]: v }); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Alerts">
        <div className="space-y-2">
          {rel.missing.map((m) => <Notice key={m} tone="danger">{METRICS[m].label} is unavailable. It is excluded from the score; no value is inferred.</Notice>)}
          {rel.stale.map((m) => <Notice key={m}>{METRICS[m].label} was last recorded {fmtAge(states[m].ageHours)} (threshold {thresholds[m]} h). The value is used but lowers reliability.</Notice>)}
          {!rel.missing.length && !rel.stale.length && <Notice tone="info">No missing or outdated indicators.</Notice>}
        </div>
      </Panel>
    </div>
  );
}
