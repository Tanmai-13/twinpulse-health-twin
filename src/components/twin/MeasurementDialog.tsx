import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METRICS, METRIC_KEYS, type Metric, type Observation } from "@/lib/twin/types";
import { useTwin } from "@/lib/twin/store";
import { toLocalInput } from "@/lib/twin/format";

export function MeasurementDialog({
  open, onOpenChange, editing, defaultMetric = "hr",
}: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Observation | null; defaultMetric?: Metric }) {
  const { addObservation, updateObservation, now } = useTwin();
  const [metric, setMetric] = useState<Metric>(defaultMetric);
  const [value, setValue] = useState("");
  const [missing, setMissing] = useState(false);
  const [ts, setTs] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setMetric(editing.metric);
      setValue(editing.value === null ? "" : String(editing.value));
      setMissing(editing.value === null);
      setTs(toLocalInput(editing.timestamp));
    } else {
      setMetric(defaultMetric);
      setValue("");
      setMissing(false);
      setTs(toLocalInput(new Date(now).toISOString()));
    }
  }, [open, editing, defaultMetric, now]);

  const info = METRICS[metric];

  function save() {
    const t = Date.parse(`${ts}:00Z`);
    if (!ts || Number.isNaN(t)) return setError("Please enter a valid timestamp.");
    if (t > now + 5 * 60000) return setError("Timestamp cannot be in the future.");
    let v: number | null = null;
    if (!missing) {
      if (value.trim() === "") return setError("Enter a value or mark the reading as missing.");
      v = Number(value);
      if (!Number.isFinite(v)) return setError("Value must be a number.");
      if (v < info.min || v > info.max) return setError(`${info.short} must be between ${info.min} and ${info.max} ${info.unit}.`);
    }
    const iso = new Date(t).toISOString();
    if (editing) {
      updateObservation(editing.id, { metric, value: v, timestamp: iso, note: missing ? "Marked missing by user" : undefined });
      toast.success("Demo measurement updated");
    } else {
      addObservation({ metric, value: v, timestamp: iso, source: "measured", note: missing ? "Marked missing by user" : "User-entered demo value" });
      toast.success("Demo measurement added — twin state updated");
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit demo measurement" : "Add synthetic measurement"}</DialogTitle>
          <DialogDescription>All entries are synthetic DEMO DATA stored only in this browser.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="m-metric">Measurement type</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
              <SelectTrigger id="m-metric"><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRIC_KEYS.map((m) => <SelectItem key={m} value={m}>{METRICS[m].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-value">Value ({info.unit})</Label>
            <Input id="m-value" type="number" inputMode="decimal" step={info.step} min={info.min} max={info.max} disabled={missing} value={value} onChange={(e) => setValue(e.target.value)} placeholder={`${info.min}–${info.max}`} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={missing} onCheckedChange={(c) => setMissing(c === true)} />
            Record as missing reading (no value is inferred)
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="m-ts">Timestamp (UTC)</Label>
            <Input id="m-ts" type="datetime-local" value={ts} onChange={(e) => setTs(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Save measurement"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
