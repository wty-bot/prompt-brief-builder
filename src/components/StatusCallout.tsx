type StatusTone = "neutral" | "success" | "warning" | "error";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-black/10 bg-white/70 text-ink/80",
  success: "border-moss/20 bg-moss/5 text-ink",
  warning: "border-amberline/25 bg-amberline/10 text-ink",
  error: "border-red-500/25 bg-red-50 text-red-900",
};

type StatusCalloutProps = {
  tone?: StatusTone;
  title: string;
  description: string;
};

export function StatusCallout({
  tone = "neutral",
  title,
  description,
}: StatusCalloutProps) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}
