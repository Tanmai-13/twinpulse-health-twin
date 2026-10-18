import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { METRICS, type Metric, type Observation } from "@/lib/twin/types";
import { fmtDateTime, fmtShort, fmtValue } from "@/lib/twin/format";

const COLORS: Partial<Record<Metric, string>> = { hr: "var(--chart-1)", sbp: "var(--chart-1)", dbp: "var(--chart-2)", sleep: "var(--chart-4)", steps: "var(--chart-2)", glucose: "var(--chart-3)" };

interface Row {
  t: number;
  [k: string]: number | null | string | undefined;
}

/** Plots real values only; missing markers render as gaps + red ticks (no imputation). */
export function TrendChart({ obs, metrics, height = 260, staleAfter }: { obs: Observation[]; metrics: Metric[]; height?: number; staleAfter?: number }) {
  const map = new Map<string, Row>();
  for (const o of obs) {
    if (!metrics.includes(o.metric)) continue;
    const key = o.metric === "sbp" || o.metric === "dbp" ? o.timestamp.slice(0, 13) : o.timestamp + o.metric;
    const r = map.get(key) ?? { t: Date.parse(o.timestamp) };
    r[o.metric] = o.value;
    if (o.value === null) r[`${o.metric}_missing`] = 1;
    r[`${o.metric}_src`] = o.source;
    map.set(key, r);
  }
  const data = [...map.values()].sort((a, b) => a.t - b.t);
  if (!data.length)
    return <div className="grid place-items-center rounded-xl border border-dashed text-sm text-muted-foreground" style={{ height }}>No measurements in this selection.</div>;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={(t) => fmtShort(t)} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" domain={["auto", "auto"]} width={52} />
          {staleAfter && <ReferenceArea x1={staleAfter} fill="var(--warning)" fillOpacity={0.06} />}
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return (
                <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md">
                  <div className="mb-1 font-semibold">{fmtDateTime(r.t)}</div>
                  {metrics.filter((m) => m in r).map((m) => (
                    <div key={m} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{METRICS[m].short}</span>
                      <span className={r[`${m}_missing`] ? "font-semibold text-destructive" : "font-medium"}>
                        {r[`${m}_missing`] ? "Missing" : fmtValue(m, r[m] as number)}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Synthetic · {String(r[`${metrics[0]}_src`] ?? "measured")}</div>
                </div>
              );
            }}
          />
          {metrics.map((m) => (
            <Line key={m} type="monotone" dataKey={m} name={METRICS[m].short} stroke={COLORS[m]} strokeWidth={2} dot={{ r: 2.5 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
