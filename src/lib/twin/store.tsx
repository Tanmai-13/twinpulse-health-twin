import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { anchorDate, generateAll, PATIENTS } from "./data";
import {
  completeness,
  computeRisk,
  effectiveObservations,
  indicatorStates,
  latestValues,
  reliability,
} from "./calc";
import {
  DEFAULT_THRESHOLDS,
  type Observation,
  type SimulationSettings,
  type Thresholds,
  type TimelineEvent,
} from "./types";

const KEY = "twinpulse-demo-v1";

interface Persisted {
  activePatientId: string;
  observations: Record<string, Observation[]>;
  events: TimelineEvent[];
  thresholds: Thresholds;
  sim: SimulationSettings;
}

function initial(): Persisted {
  return {
    activePatientId: PATIENTS[0].id,
    observations: generateAll(),
    events: [],
    thresholds: DEFAULT_THRESHOLDS,
    sim: { masked: [], delayHours: 0 },
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

function useTwinState() {
  const [state, setState] = useState<Persisted>(initial);
  const [now, setNow] = useState(() => anchorDate() + 12 * 3600000);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial(), ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setNow(Date.now());
    setHydrated(true);
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const patient = PATIENTS.find((p) => p.id === state.activePatientId) ?? PATIENTS[0]!;
  const allObs = useMemo(
    () => [...(state.observations[patient.id] ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [state.observations, patient.id],
  );
  const obs = useMemo(() => effectiveObservations(allObs, state.sim, now), [allObs, state.sim, now]);
  const states = useMemo(() => indicatorStates(obs, state.thresholds, now), [obs, state.thresholds, now]);
  const current = useMemo(() => latestValues(states), [states]);
  const previous = useMemo(() => latestValues(states, "previous"), [states]);
  const risk = useMemo(() => computeRisk(current, patient.age), [current, patient.age]);
  const prevRisk = useMemo(() => computeRisk(previous, patient.age), [previous, patient.age]);
  const rel = useMemo(() => reliability(states, state.thresholds), [states, state.thresholds]);
  const comp = useMemo(() => completeness(obs, now), [obs, now]);
  const events = useMemo(
    () => state.events.filter((e) => e.patientId === patient.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [state.events, patient.id],
  );
  const lastUpdate = obs.length ? obs[obs.length - 1]!.timestamp : null;

  const logEvent = (s: Persisted, e: Omit<TimelineEvent, "id" | "patientId" | "timestamp">): TimelineEvent[] => [
    ...s.events,
    { ...e, id: uid(), patientId: s.activePatientId, timestamp: new Date().toISOString() },
  ];

  const setPatientObs = (s: Persisted, fn: (o: Observation[]) => Observation[]) => ({
    ...s.observations,
    [s.activePatientId]: fn(s.observations[s.activePatientId] ?? []),
  });

  const addObservation = useCallback((o: Omit<Observation, "id" | "patientId">) => {
    setState((s) => ({
      ...s,
      observations: setPatientObs(s, (list) => [...list, { ...o, id: `user-${uid()}`, patientId: s.activePatientId }]),
      events: logEvent(s, { kind: "measurement", title: `Added ${o.metric.toUpperCase()} demo measurement`, detail: o.value === null ? "Missing marker" : String(o.value) }),
    }));
  }, []);

  const updateObservation = useCallback((id: string, patch: Partial<Observation>) => {
    setState((s) => ({
      ...s,
      observations: setPatientObs(s, (list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o))),
      events: logEvent(s, { kind: "edit", title: "Edited demo measurement", detail: patch.value === null ? "Set to missing" : `New value ${patch.value}` }),
    }));
  }, []);

  const removeObservation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      observations: setPatientObs(s, (list) => list.filter((o) => o.id !== id)),
      events: logEvent(s, { kind: "removal", title: "Removed demo measurement" }),
    }));
  }, []);

  const addEvent = useCallback((e: Omit<TimelineEvent, "id" | "patientId" | "timestamp">) => {
    setState((s) => ({ ...s, events: logEvent(s, e) }));
  }, []);

  const importObservations = useCallback((list: Observation[], mode: "replace" | "append") => {
    setState((s) => ({
      ...s,
      observations: setPatientObs(s, (old) => (mode === "replace" ? list : [...old, ...list])),
      events: logEvent(s, { kind: "import", title: `Imported ${list.length} rows from CSV`, detail: mode === "replace" ? "Replaced dataset" : "Appended" }),
    }));
  }, []);

  const setActivePatient = useCallback((id: string) => setState((s) => ({ ...s, activePatientId: id })), []);
  const setThresholds = useCallback((t: Thresholds) => setState((s) => ({ ...s, thresholds: t })), []);
  const setSim = useCallback((sim: SimulationSettings) => setState((s) => ({ ...s, sim })), []);
  const resetDemo = useCallback(() => {
    const fresh = initial();
    setState((s) => ({ ...fresh, activePatientId: s.activePatientId }));
  }, []);

  return {
    hydrated, now, patient, patients: PATIENTS, allObs, obs, states, current, previous, risk, prevRisk,
    rel, comp, events, lastUpdate, thresholds: state.thresholds, sim: state.sim,
    addObservation, updateObservation, removeObservation, addEvent, importObservations,
    setActivePatient, setThresholds, setSim, resetDemo,
  };
}

type Twin = ReturnType<typeof useTwinState>;
const Ctx = createContext<Twin | null>(null);

export function TwinProvider({ children }: { children: ReactNode }) {
  const v = useTwinState();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useTwin() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTwin must be used inside TwinProvider");
  return v;
}
