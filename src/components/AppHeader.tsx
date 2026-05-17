import { Bot, CheckCircle2, Layers3, ShieldCheck, Sparkles } from "lucide-react";

export function AppHeader() {
  return (
    <header className="panel-dark relative overflow-hidden p-6 sm:p-8 lg:p-10">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-moss/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-44 w-full bg-gradient-to-l from-amberline/15 via-moss/10 to-transparent" />
      <div className="absolute inset-0 bg-paper-grid bg-[size:28px_28px] opacity-[0.08]" />

      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-end">
        <div className="flex flex-col gap-6">
          <div className="flex w-fit items-center gap-3 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-vellum/80">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss text-white">
              <Bot className="h-4 w-4" />
            </span>
            Prompt Brief Builder
          </div>

          <div className="max-w-4xl space-y-5">
            <p className="eyebrow text-moss/90">Agent Command Brief</p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-vellum sm:text-5xl lg:text-6xl">
              把一句模糊想法，变成 Agent 可执行任务书。
            </h1>
            <p className="max-w-2xl text-base leading-8 text-vellum/68 sm:text-lg">
              先由 AI 追问关键缺口，再把背景、范围、约束、交付物和验收标准整理成专业 Brief。
              不是润色，而是把混沌压缩成行动。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Draft", "输入原始想法"],
              ["Clarify", "AI 访谈追问"],
              ["Ready", "复制执行 Brief"],
            ].map(([label, text], index) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-moss/90">
                    0{index + 1}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-amberline" />
                </div>
                <p className="mt-3 text-sm font-semibold text-vellum">{label}</p>
                <p className="mt-1 text-xs leading-5 text-vellum/55">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-vellum">Brief Quality Stack</p>
              <p className="mt-1 text-xs text-vellum/52">从“想法”到“可验收任务”</p>
            </div>
            <Layers3 className="h-5 w-5 text-amberline" />
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ["目标", "明确最终要达成什么"],
              ["边界", "哪些做，哪些不做"],
              ["交付物", "Agent 应该产出什么"],
              ["验收", "怎样判断结果合格"],
            ].map(([label, text]) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-ink/24 p-3"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-moss shadow-[0_0_22px_rgba(13,148,136,0.8)]" />
                <div>
                  <p className="text-sm font-semibold text-vellum">{label}</p>
                  <p className="text-xs leading-5 text-vellum/50">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amberline/20 bg-amberline/10 p-4 text-sm leading-6 text-vellum/76">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amberline" />
            <span>API Key 默认只存在当前页面内存中，不会自动持久化。</span>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-moss/20 bg-moss/10 p-4 text-sm leading-6 text-vellum/76">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            <span>适合 Cursor、Codex、Claude Code、ChatGPT 等 Agent 工作流。</span>
          </div>
        </aside>
      </div>
    </header>
  );
}
