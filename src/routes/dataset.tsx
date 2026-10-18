import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader, Panel, Notice, Tag } from "@/components/twin/ui";
import { useTwin } from "@/lib/twin/store";
import { CSV_COLUMNS, MISSING_MARKER, parseCSV, toCSV } from "@/lib/twin/csv";
import { METRICS, METRIC_KEYS } from "@/lib/twin/types";

export const Route = createFileRoute("/dataset")({
  head: () => ({
    meta: [
      { title: "Dataset & Validation — TwinPulse" },
      { name: "description", content: "Synthetic dataset export/import with validation, public dataset strategy and a validation-metrics plan." },
      { property: "og:title", content: "Dataset & Validation — TwinPulse" },
      { property: "og:description", content: "Reproducible synthetic data and an honest evaluation plan." },
    ],
  }),
  component: DatasetPage,
});

const METRIC_ROWS = [
  "Missing-data rate",
  "Data freshness",
  "Discrimination (e.g. AUROC) — requires suitable labeled dataset",
  "Calibration (e.g. Brier score, calibration curve)",
  "Error for continuous predictions (MAE / RMSE)",
  "Baseline vs. proposed-method comparison",
];

function DatasetPage() {
  const { allObs, patient, comp, importObservations, resetDemo } = useTwin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"replace" | "append">("append");
  const [steps, setSteps] = useState({ uci: true, mimic: false, preprocess: true, missing: true, metrics: true });

  function download() {
    const blob = new Blob([toCSV(allObs)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `twinpulse-${patient.id}-synthetic.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${allObs.length} synthetic rows`);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { setErrors(["Please choose a .csv file."]); return; }
    const res = parseCSV(await f.text(), patient.id);
    if (fileRef.current) fileRef.current.value = "";
    if (res.errors.length) { setErrors(res.errors); toast.error(`Import rejected: ${res.errors.length} problem(s) found`); return; }
    setErrors([]);
    importObservations(res.observations, mode);
    toast.success(`Imported ${res.observations.length} rows (${res.observations.filter((o) => o.value === null).length} missing markers preserved)`);
  }

  const missingRate = 100 - comp.pct;

  return (
    <div className="space-y-6">
      <PageHeader title="Dataset & Validation" subtitle="Where the data comes from, how it can be exchanged, and how TwinPulse would be evaluated in future research." />

      <Panel title="A. Synthetic dataset" description={`Deterministic, seeded generator · ${allObs.length} rows for ${patient.id}`}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import CSV</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="CSV file" onChange={(e) => onFile(e.target.files?.[0])} />
          <Select value={mode} onValueChange={(v) => setMode(v as "replace" | "append")}>
            <SelectTrigger className="w-[190px]" aria-label="Import mode"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="append">Append to dataset</SelectItem><SelectItem value="replace">Replace patient dataset</SelectItem></SelectContent>
          </Select>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" className="text-destructive"><RotateCcw className="h-4 w-4" /> Reset demo data</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
                <AlertDialogDescription>All edits, imports, events, thresholds and simulations for every synthetic patient will be replaced by the original generated dataset.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { resetDemo(); setErrors([]); toast.success("Demo data reset"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {errors.length > 0 && (
          <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive">
            <div className="font-semibold">The file was not imported:</div>
            <ul className="mt-1 list-disc pl-5">{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>
            {errors.length > 8 && <p className="mt-1">…and {errors.length - 8} more.</p>}
          </div>
        )}
        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Required columns</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{CSV_COLUMNS.join(",")}</p>
            <p className="mt-2 text-muted-foreground">Timestamps in ISO 8601. Use <code className="rounded bg-muted px-1">{MISSING_MARKER}</code> for missing values — they are preserved as missing, never filled.</p>
          </div>
          <div>
            <h3 className="font-semibold">Accepted metrics and units</h3>
            <ul className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground">{METRIC_KEYS.map((m) => <li key={m}><span className="font-mono">{m}</span> · {METRICS[m].unit}</li>)}</ul>
          </div>
        </div>
      </Panel>

      <Panel title="B. Public dataset evaluation" description="Future work — nothing below has been downloaded, processed or evaluated">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">UCI Heart Disease</h3><Tag>Not started</Tag></div>
            <p className="mt-2 text-sm text-muted-foreground">Cross-sectional records that may support a baseline classification experiment. It does not contain longitudinal measurements, so it cannot by itself establish a dynamic digital twin.</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">MIMIC-IV</h3><Tag>Not started</Tag></div>
            <p className="mt-2 text-sm text-muted-foreground">Time-stamped clinical data. Access requires credentialing via PhysioNet, completion of required training and adherence to its data use agreement.</p>
          </div>
        </div>
        <h3 className="mt-5 text-sm font-semibold">Configure future evaluation workflow</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([
            ["uci", "Include UCI baseline classification"],
            ["mimic", "Include MIMIC-IV time-series (after approved access)"],
            ["preprocess", "Harmonise units and timestamps"],
            ["missing", "Inject controlled missingness / delays"],
            ["metrics", "Report reliability vs. error relationship"],
          ] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
              <Checkbox checked={steps[k]} onCheckedChange={(c) => setSteps((s) => ({ ...s, [k]: c === true }))} /> {l}
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Planned steps: {Object.values(steps).filter(Boolean).length} of 5 selected. This is a planning checklist; selecting steps runs no experiment.</p>
      </Panel>

      <Panel title="C. Validation metrics">
        <Notice tone="info">No experiments have been run. Only descriptive statistics of the current synthetic data are computed.</Notice>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-medium">Metric</th><th className="font-medium">Result</th></tr></thead>
            <tbody className="divide-y">
              {METRIC_ROWS.map((r, i) => (
                <tr key={r}>
                  <td className="py-2.5 pr-3">{r}</td>
                  <td>
                    {i === 0 ? <span className="font-medium">{missingRate}% <span className="text-xs text-muted-foreground">(synthetic data, descriptive only)</span></span>
                      : i === 1 ? <span className="text-xs text-muted-foreground">See Data Quality page (synthetic, descriptive only)</span>
                      : <Tag tone="warning">Not evaluated yet</Tag>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
