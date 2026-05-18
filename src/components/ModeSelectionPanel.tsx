import { MessageSquarePlus, Sparkles } from "lucide-react";

import type { WorkflowMode } from "../types/app";

type ModeSelectionPanelProps = {
  value: WorkflowMode | null;
  onSelect: (mode: WorkflowMode) => void;
};

const modes: Array<{
  id: WorkflowMode;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  icon: typeof Sparkles;
}> = [
  {
    id: "format-optimization",
    title: "格式优化",
    subtitle: "我知道要说什么，只想表达得更清楚",
    description: "适合 debug、局部修改、文案整理和轻量任务请求。",
    points: ["不追问", "轻量 Prompt", "少量专业补全会写进备注"],
    icon: Sparkles,
  },
  {
    id: "brainstorming",
    title: "头脑风暴",
    subtitle: "我还没完全想清楚，需要 AI 一步步问我",
    description: "适合复杂想法、产品设计、自动化流程和不确定需求。",
    points: ["逐轮单问", "实时摘要看板", "清楚后收束成 Prompt"],
    icon: MessageSquarePlus,
  },
];

export function ModeSelectionPanel({ value, onSelect }: ModeSelectionPanelProps) {
  return (
    <section className="grid gap-4">
      <div>
        <p className="eyebrow">Mode</p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
          选择这次的优化方式
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">
          简单请求走轻量整理，没想清楚的需求走逐轮头脑风暴。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const selected = value === mode.id;
          return (
            <button
              type="button"
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`min-h-[260px] rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#0071e3]/35 hover:shadow-soft ${
                selected ? "border-[#0071e3]/40 ring-4 ring-[#0071e3]/12" : "border-black/10"
              }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  selected ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-ink/62"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                {mode.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-ink/72">{mode.subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-ink/58">{mode.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {mode.points.map((point) => (
                  <span
                    key={point}
                    className="rounded-full border border-black/8 bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-ink/62"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
