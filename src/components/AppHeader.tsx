import { Bot, ShieldCheck, Sparkles } from "lucide-react";

export function AppHeader() {
  return (
    <header className="relative overflow-hidden rounded-[28px] border border-black/5 bg-white/70 p-8 shadow-soft backdrop-blur">
      <div className="absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-moss/10 to-transparent" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3 text-sm font-medium text-moss">
          <Bot className="h-5 w-5" />
          AI 需求描述优化器
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            先把需求说清楚，再把 Prompt 交给 Agent。
          </h1>
          <p className="text-base leading-7 text-ink/75">
            输入一段模糊的想法，AI 会先帮你找出关键缺口，提出澄清问题，再整理成适合
            Cursor、Codex、Claude Code 或其他 Agent 直接执行的 Markdown 需求提示词。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-moss/15 bg-moss/5 p-4 text-sm text-ink/80">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            <span>默认流程：输入需求 → AI 追问关键问题 → 生成结构化 Prompt。</span>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-amberline/15 bg-amberline/5 p-4 text-sm text-ink/80">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amberline" />
            <span>API Key 默认只在当前浏览器会话中使用，不会自动持久化保存。</span>
          </div>
        </div>
      </div>
    </header>
  );
}
