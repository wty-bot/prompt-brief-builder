import { ClipboardEdit, WandSparkles } from "lucide-react";

type FormatOptimizationPanelProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onOptimize: () => void;
};

export function FormatOptimizationPanel({
  value,
  disabled,
  onChange,
  onOptimize,
}: FormatOptimizationPanelProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-ink/8 bg-vellum/90 p-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0071e3] text-white shadow-soft">
            <ClipboardEdit className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Format Optimization</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              输入你想优化的原文
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink/62">
          这里不会追问，也不会扩写成项目任务书。AI 只负责把表达整理得更准确。
        </p>
      </div>

      <div className="grid gap-4 p-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-ink">原文 *</span>
          <textarea
            rows={10}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="例如：帮我看看这个按钮为什么点了没反应，顺便修一下，不要乱改别的。"
            className="field min-h-[260px] resize-y bg-white text-sm leading-7"
          />
        </label>

        <div className="rounded-2xl border border-black/8 bg-[#f5f5f7] px-4 py-3 text-sm leading-6 text-ink/62">
          适合 debug、局部修改、改文案、总结、润色这类轻量请求。若 AI 基于专业场景做了少量补全，会写在备注里。
        </div>

        <button
          type="button"
          onClick={onOptimize}
          disabled={disabled || !value.trim()}
          className="primary-button w-full gap-2"
        >
          <WandSparkles className="h-4 w-4" />
          优化表达
        </button>
      </div>
    </section>
  );
}
