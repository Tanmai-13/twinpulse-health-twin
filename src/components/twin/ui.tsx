import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Freshness } from "@/lib/twin/calc";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className, action }: { title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("card-surface p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "warning" | "danger" | "teal" }) {
  return (
    <div className="card-surface p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 text-2xl font-semibold tracking-tight", tone === "warning" && "text-warning-foreground", tone === "danger" && "text-destructive", tone === "teal" && "text-teal")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const FRESH = {
  fresh: { label: "Fresh", cls: "bg-teal-soft text-teal", Icon: CheckCircle2 },
  stale: { label: "Outdated", cls: "bg-warning-soft text-warning-foreground", Icon: Clock },
  missing: { label: "Missing", cls: "bg-destructive-soft text-destructive", Icon: CircleSlash },
};

export function FreshBadge({ f }: { f: Freshness }) {
  const c = FRESH[f];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", c.cls)}>
      <c.Icon className="h-3 w-3" /> {c.label}
    </span>
  );
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "warning" | "teal" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-accent text-accent-foreground",
        tone === "warning" && "bg-warning-soft text-warning-foreground",
        tone === "teal" && "bg-teal-soft text-teal",
        tone === "danger" && "bg-destructive-soft text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function RiskDisclaimer({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <Tag tone="primary">Illustrative research score</Tag>
      <Tag tone="warning">Not clinically validated</Tag>
      <Tag tone="danger">Not a diagnosis</Tag>
    </div>
  );
}

export function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "info" | "danger" }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-2.5 rounded-xl border p-3 text-sm",
        tone === "warning" && "border-warning/40 bg-warning-soft text-warning-foreground",
        tone === "info" && "border-primary/20 bg-accent text-accent-foreground",
        tone === "danger" && "border-destructive/30 bg-destructive-soft text-destructive",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Meter({ value, tone = "primary" }: { value: number; tone?: "primary" | "teal" | "warning" | "danger" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", tone === "primary" && "bg-primary", tone === "teal" && "bg-teal", tone === "warning" && "bg-warning", tone === "danger" && "bg-destructive")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function relTone(label: string) {
  return label === "High" ? "teal" : label === "Moderate" ? "warning" : "danger";
}
