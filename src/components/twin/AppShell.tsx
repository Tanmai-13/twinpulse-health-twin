import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity, BarChart3, Database, FlaskConical, Gauge, Info, LayoutDashboard, Menu, PanelLeftClose,
  PanelLeftOpen, ShieldCheck, UserRound, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTwin } from "@/lib/twin/store";
import { fmtDateTime } from "@/lib/twin/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/twin", label: "Patient Twin", icon: UserRound },
  { to: "/timeline", label: "Health Timeline", icon: Activity },
  { to: "/risk", label: "Risk Analysis", icon: Gauge },
  { to: "/simulator", label: "What-If Simulator", icon: FlaskConical },
  { to: "/quality", label: "Data Quality", icon: ShieldCheck },
  { to: "/dataset", label: "Dataset & Validation", icon: Database },
  { to: "/about", label: "About TwinPulse", icon: Info },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hero">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12h4l2-5 4 10 2-5h8" />
        </svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">TwinPulse</span>
    </div>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <n.icon className={cn("h-4.5 w-4.5 shrink-0", active && "text-sidebar-primary")} />
            {!collapsed && <span>{n.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { patients, patient, setActivePatient, lastUpdate } = useTwin();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 lg:flex", collapsed ? "w-[72px]" : "w-64")}>
        <div className={cn("mb-6 flex items-center px-2 pt-2 text-sidebar-accent-foreground", collapsed && "justify-center px-0")}>
          {collapsed ? <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero"><Activity className="h-5 w-5" /></div> : <Logo />}
        </div>
        <NavList collapsed={collapsed} />
        <div className="mt-auto space-y-3">
          {!collapsed && (
            <p className="rounded-lg border border-sidebar-border p-3 text-xs leading-relaxed text-sidebar-foreground/70">
              Educational research prototype. Not a medical device. All data is synthetic.
            </p>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4 text-sidebar-accent-foreground">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-sidebar-accent"><X className="h-5 w-5" /></button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button>
            <div className="lg:hidden"><Logo /></div>
            <span className="hidden items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground sm:inline-flex">
              <FlaskConical className="h-3.5 w-3.5" /> Research Prototype
            </span>
            <span className="hidden rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal md:inline-flex">DEMO DATA</span>
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <div className="hidden text-right text-xs text-muted-foreground xl:block">
                <div>Last data update</div>
                <div className="font-medium text-foreground">{lastUpdate ? fmtDateTime(lastUpdate) : "No data"}</div>
              </div>
              <Select value={patient.id} onValueChange={setActivePatient}>
                <SelectTrigger className="w-[170px] sm:w-[210px]" aria-label="Demo patient">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.id} · age {p.age}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
          TwinPulse is an educational research prototype using synthetic data. It is not a medical device and does not provide diagnoses or treatment advice.
        </footer>
      </div>
    </div>
  );
}

export { BarChart3 };
