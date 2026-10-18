import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, RiskDisclaimer, FreshBadge, Meter, Notice, relTone } from "@/components/twin/ui";
import { useTwin } from "@/lib/twin/store";
import { MIN_CORE_INPUTS, RISK_RULES, RELIABILITY_WEIGHTS, riskBand } from "@/lib/twin/calc";
import { METRICS, type Metric } from "@/lib/twin/types";
import { fmtAge, fmtValue } from "@/lib/twin/format";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Risk Analysis — TwinPulse" },
      { name: "description", content: "Transparent, deterministic illustrative risk score with inputs, rules and a separate data reliability indicator." },
      { property: "og:title", content: "Risk Analysis — TwinPulse" },
      { property: "og:description", content: "Transparent illustrative research score, kept separate from data reliability." },
    ],
  }),
  component: RiskPage,
});

function RiskPage() {
  const { patient, risk, prevRisk, rel, states } = useTwin();
  const label = (k: Metric | "age") => (k === "age" ? "Age" : METRICS[k].short);

  const changes = risk.used
    .map((u) => {
      const p = prevRisk.used.find((x) => x.metric === u.metric);
      return { metric: u.metric, delta: u.points - (p?.points ?? u.points) };
    })
    .filter((c) => Math.abs(c.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <div className="space-y-6">
      <PageHeader title="Risk Analysis" subtitle="A deterministic, rule-based score designed to demonstrate how a digital twin could summarise its state. It is not derived from or validated against clinical outcomes." />
      <Notice>This score is for research demonstration only. It is not a diagnosis, has no clinical validity and must not be used for health decisions.</Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Illustrative research score">
          <RiskDisclaimer className="mb-4" />
          {risk.status === "ok" ? (
            <>
              <div className="flex items-baseline gap-2"><span className="text-5xl font-semibold">{risk.score}</span><span className="text-muted-foreground">/ 100 · {riskBand(risk.score!)} band</span></div>
              <div className="mt-3"><Meter value={risk.score!} tone={risk.score! < 25 ? "teal" : risk.score! < 50 ? "warning" : "danger"} /></div>
              <div className="mt-4 text-sm">
                <h3 className="font-semibold">Why the score changed</h3>
                {prevRisk.status !== "ok" ? (
                  <p className="text-muted-foreground">No previous state with enough inputs to compare.</p>
                ) : changes.length === 0 ? (
                  <p className="text-muted-foreground">Unchanged from previous state ({prevRisk.score}).</p>
                ) : (
                  <>
                    <p className="text-muted-foreground">Previous state: {prevRisk.score} → current: {risk.score}.</p>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {changes.map((c) => <li key={c.metric}>{label(c.metric)} contributed {c.delta > 0 ? "+" : ""}{c.delta.toFixed(1)} points vs. its previous reading.</li>)}
                    </ul>
                  </>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="text-3xl font-semibold text-warning-foreground">Insufficient data</div>
              <p className="mt-2 text-sm text-muted-foreground">At least {MIN_CORE_INPUTS} core inputs (heart rate, blood pressure, sleep, steps) are required. No score is generated rather than showing a misleading number.</p>
            </div>
          )}
        </Panel>

        <Panel title="Data Reliability Indicator" description="Separate from risk — describes the data, not the person">
          <div className="flex items-baseline gap-2"><span className="text-5xl font-semibold">{rel.score}</span><span className="text-muted-foreground">/ 100 · {rel.label}</span></div>
          <div className="mt-3"><Meter value={rel.score} tone={relTone(rel.label)} /></div>
          <p className="mt-3 text-sm">{rel.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">Heuristic: weighted average where fresh = 1, outdated = 0.6 decaying to 0.2, missing = 0. Weights: {Object.entries(RELIABILITY_WEIGHTS).map(([m, w]) => `${METRICS[m as Metric].short} ${w}`).join(", ")}. This is not a statistically calibrated confidence.</p>
          <p className="mt-2 text-xs text-muted-foreground">Missing data lowers reliability — it does not raise the risk score.</p>
        </Panel>
      </div>

      <Panel title="Inputs and scoring rules" description={`Score = 100 × points earned ÷ maximum points of available inputs. Patient age: ${patient.age}.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Input</th><th className="font-medium">Current value</th><th className="font-medium">Status</th><th className="font-medium">Rule</th><th className="text-right font-medium">Points</th></tr></thead>
            <tbody className="divide-y">
              {RISK_RULES.map((r) => {
                const u = risk.used.find((x) => x.metric === r.metric);
                const st = r.metric === "age" ? null : states[r.metric];
                return (
                  <tr key={r.metric}>
                    <td className="py-2.5 pr-3 font-medium">{label(r.metric)}</td>
                    <td className="pr-3">{r.metric === "age" ? `${patient.age} y` : fmtValue(r.metric, st?.latest?.value)}</td>
                    <td className="pr-3">{st ? <span className="inline-flex items-center gap-1.5"><FreshBadge f={st.freshness} /><span className="hidden text-xs text-muted-foreground md:inline">{fmtAge(st.ageHours)}</span></span> : <span className="text-xs text-muted-foreground">Profile</span>}</td>
                    <td className="pr-3 text-xs text-muted-foreground">{r.rule}</td>
                    <td className="text-right font-medium">{u ? `${u.points.toFixed(1)} / ${r.max}` : "excluded"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><span className="font-semibold">Unavailable inputs: </span><span className="text-muted-foreground">{risk.unavailable.length ? risk.unavailable.map((m) => METRICS[m].short).join(", ") : "none"}</span></div>
          <div><span className="font-semibold">Stale inputs (used but flagged): </span><span className="text-muted-foreground">{rel.stale.length ? rel.stale.map((m) => METRICS[m].short).join(", ") : "none"}</span></div>
        </div>
      </Panel>

      <Panel title="Limitations">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Thresholds and weights were chosen for demonstration and are not derived from clinical evidence or data.</li>
          <li>No accuracy, sensitivity, specificity, AUC or calibration has been measured — none should be assumed.</li>
          <li>The score ignores medical history, medication, interactions between indicators and individual baselines.</li>
          <li>Outdated values are still used in the score; their influence on trust is shown only through the reliability indicator.</li>
        </ul>
      </Panel>
    </div>
  );
}
