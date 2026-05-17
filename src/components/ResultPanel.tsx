import ReactMarkdown from "react-markdown";
import { ClipboardCopy, FileCheck2, RotateCcw } from "lucide-react";

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
    <article className="rounded-[28px] border border-ink/8 bg-vellum/90 p-5 shadow-insetline">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onAction}
          className="ghost-button gap-2"
        >
          <ClipboardCopy className="h-4 w-4" />
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
    <section className="panel overflow-hidden">
      <div className="border-b border-ink/8 bg-ink p-5 text-vellum">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss">
              Ready Brief
            </p>
            <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <FileCheck2 className="h-6 w-6 text-amberline" />
              优化结果
            </h2>
            <p className="mt-2 text-sm leading-6 text-vellum/62">
              最终输出固定为 Markdown，适合直接复制给 Coding Agent 或通用 Agent。
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-vellum transition hover:bg-white/12"
          >
            <RotateCcw className="h-4 w-4" />
            清空当前会话
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5">
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
