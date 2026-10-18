import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Notice } from "@/components/twin/ui";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TwinPulse — Research Question & Methodology" },
      { name: "description", content: "Research question, hypothesis, methodology, evaluation plan, limitations and privacy considerations of TwinPulse." },
      { property: "og:title", content: "About TwinPulse — Research Question & Methodology" },
      { property: "og:description", content: "Why an uncertainty-aware personal health digital twin?" },
    ],
  }),
  component: AboutPage,
});

const SECTIONS: { t: string; items: string[] }[] = [
  { t: "Research motivation", items: [
    "Personal health dashboards often show a single number without telling users how current or complete the underlying data is.",
    "Wearable and self-reported data are frequently missing, delayed or irregular, which can silently undermine any derived estimate.",
  ] },
  { t: "Proposed methodology", items: [
    "Represent the person as a time-indexed state built only from observed values; missing values stay explicitly missing.",
    "Compute a transparent illustrative score and, separately, a heuristic Data Reliability Indicator from completeness and freshness.",
    "Let users manipulate missingness and delays to observe how reliability — not risk — responds.",
  ] },
  { t: "Dataset strategy", items: [
    "Start with a reproducible synthetic dataset (this prototype).",
    "Optionally run a baseline classifier on UCI Heart Disease, noting it is cross-sectional.",
    "Explore longitudinal behaviour with MIMIC-IV only after credentialed access and under its data use agreement.",
  ] },
  { t: "Evaluation plan", items: [
    "Measure whether reliability indicators track prediction error under controlled missingness.",
    "Report discrimination and calibration only where a suitable labeled dataset exists.",
    "Conduct user studies on whether explicit uncertainty cues improve understanding of estimate limitations.",
  ] },
  { t: "Limitations", items: [
    "Scoring rules and weights are illustrative, not evidence-based.",
    "The reliability indicator is a heuristic and is not statistically calibrated.",
    "Synthetic data cannot capture real physiological variability or device artefacts.",
    "The novelty of this research gap has not yet been established through a related-work review.",
  ] },
  { t: "Privacy considerations", items: [
    "All data is synthetic and stored only in this browser's local storage; nothing is sent to a server.",
    "No wearable devices or medical records are connected.",
    "A real deployment would require consent, data minimisation, encryption and compliance with applicable regulations.",
  ] },
];

function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="About TwinPulse" subtitle="An educational research prototype exploring uncertainty communication in personal health digital twins." />
      <Notice>TwinPulse is not a medical device. It does not diagnose, treat or predict any condition, and all patients shown are synthetic.</Notice>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Research question">
          <blockquote className="border-l-4 border-primary pl-4 text-base font-medium">“How can a personal health digital twin communicate the reliability of its current state and risk estimates when health measurements are missing or outdated?”</blockquote>
        </Panel>
        <Panel title="Hypothesis">
          <blockquote className="border-l-4 border-teal pl-4 text-base font-medium">“Explicit data-quality and uncertainty indicators may help users understand the limitations of digital-twin estimates.”</blockquote>
        </Panel>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Panel key={s.t} title={s.t}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
