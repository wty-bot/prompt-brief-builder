import ReactMarkdown from "react-markdown";

type ResultPanelProps = {
  finalPromptMarkdown: string;
  improvementNotesMarkdown: string;
  onCopyPrompt: () => void;
  onCopyNotes: () => void;
  onClear: () => void;
};

function MarkdownCard({
  title,
  value,
  actionLabel,
  onAction,
}: {
  title: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <article className="rounded-3xl border border-black/8 bg-white/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink transition hover:border-moss hover:text-moss"
        >
          {actionLabel}
        </button>
      </div>
      <div className="prose prose-sm mt-5 max-w-none prose-headings:text-ink prose-p:text-ink/80 prose-strong:text-ink prose-li:text-ink/80">
        <ReactMarkdown>{value}</ReactMarkdown>
      </div>
    </article>
  );
}

export function ResultPanel({
  finalPromptMarkdown,
  improvementNotesMarkdown,
  onCopyPrompt,
  onCopyNotes,
  onClear,
}: ResultPanelProps) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-soft backdrop-blur">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">优化结果</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            最终输出固定为 Markdown，适合直接复制给 Coding Agent 或通用 Agent。
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-ink transition hover:border-red-400 hover:text-red-600"
        >
          清空当前会话
        </button>
      </div>

      <div className="grid gap-4">
        <MarkdownCard
          title="最终 Prompt"
          value={finalPromptMarkdown}
          actionLabel="复制 Prompt"
          onAction={onCopyPrompt}
        />
        <MarkdownCard
          title="优化说明"
          value={improvementNotesMarkdown}
          actionLabel="复制说明"
          onAction={onCopyNotes}
        />
      </div>
    </section>
  );
}
