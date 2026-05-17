import { Check, CircleDot, Sparkles } from "lucide-react";

export type WorkflowStep = {
  key: string;
  label: string;
  description: string;
  status: "idle" | "active" | "done";
};

type WorkflowStripProps = {
  steps: WorkflowStep[];
};

export function WorkflowStrip({ steps }: WorkflowStripProps) {
  return (
    <section className="panel overflow-hidden px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Workflow</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
            当前工作流
          </h2>
        </div>
        <Sparkles className="h-5 w-5 text-moss" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`rounded-2xl border px-4 py-3 transition ${
              step.status === "done"
                ? "border-moss/20 bg-moss/8"
                : step.status === "active"
                  ? "border-amberline/20 bg-amberline/10"
                  : "border-ink/8 bg-white/55"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                {step.key}
              </span>
              {step.status === "done" ? (
                <Check className="h-4 w-4 text-moss" />
              ) : step.status === "active" ? (
                <CircleDot className="h-4 w-4 text-amberline" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-ink/18" />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-ink">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-ink/58">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
