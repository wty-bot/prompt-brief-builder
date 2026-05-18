type StatusTone = "neutral" | "success" | "warning" | "error";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-black/10 bg-white/90 text-ink/80",
  success: "border-[#0071e3]/20 bg-[#0071e3]/10 text-ink",
  warning: "border-amberline/25 bg-amberline/10 text-ink",
  error: "border-oxblood/25 bg-oxblood/10 text-oxblood",
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
    <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm backdrop-blur ${toneClasses[tone]}`}>
      <div className="absolute inset-y-0 left-0 w-1 bg-current opacity-25" />
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
    </div>
  );
}
