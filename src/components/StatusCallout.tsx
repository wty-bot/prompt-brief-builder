type StatusTone = "neutral" | "success" | "warning" | "error";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-ink/10 bg-vellum/80 text-ink/80",
  success: "border-moss/20 bg-moss/8 text-ink",
  warning: "border-amberline/25 bg-amberline/10 text-ink",
  error: "border-oxblood/25 bg-oxblood/8 text-oxblood",
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
    <div className={`relative overflow-hidden rounded-[24px] border p-4 shadow-insetline backdrop-blur ${toneClasses[tone]}`}>
      <div className="absolute inset-y-0 left-0 w-1 bg-current opacity-25" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 opacity-78">{description}</p>
    </div>
  );
}
