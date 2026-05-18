import ReactMarkdown from "react-markdown";
import { FileText, RotateCcw } from "lucide-react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";

type FormatOptimizationResultPanelProps = {
  originalText: string;
  optimizedPromptMarkdown: string;
  noteMarkdown: string;
  detectedScenario?: string;
  onCopyPrompt: CopyAction;
  onCopyNotes: CopyAction;
  onClear: () => void;
};

export function FormatOptimizationResultPanel({
  originalText,
  optimizedPromptMarkdown,
  noteMarkdown,
  detectedScenario,
  onCopyPrompt,
  onCopyNotes,
  onClear,
}: FormatOptimizationResultPanelProps) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Format Result</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
            轻量 Prompt 已整理
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/58">
            {detectedScenario ? `识别场景：${detectedScenario}` : "结果适合直接复制给 Agent。"}
          </p>
        </div>
        <button type="button" onClick={onClear} className="ghost-button gap-2">
          <RotateCcw className="h-4 w-4" />
          新建会话
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <article className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <p className="eyebrow">Original</p>
          <h3 className="mt-1 text-base font-semibold text-ink">原文</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/72">
            {originalText.trim() || "无"}
          </div>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Optimized Prompt</p>
              <h3 className="mt-1 text-base font-semibold text-ink">优化后 Prompt</h3>
            </div>
            <CopyFeedbackButton onCopy={onCopyPrompt} className="min-h-9 gap-2 px-3 text-xs" />
          </div>
          <div className="prose prose-sm mt-4 max-w-none prose-p:leading-7 prose-p:text-ink/78 prose-li:leading-7 prose-li:text-ink/78">
            <ReactMarkdown>{optimizedPromptMarkdown}</ReactMarkdown>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0071e3]" />
            <div>
              <p className="eyebrow">Note</p>
              <h3 className="mt-1 text-base font-semibold text-ink">备注</h3>
            </div>
          </div>
          <CopyFeedbackButton
            onCopy={onCopyNotes}
            label="复制备注"
            className="min-h-9 gap-2 px-3 text-xs"
          />
        </div>
        <div className="prose prose-sm mt-3 max-w-none prose-p:leading-7 prose-p:text-ink/72 prose-li:leading-7 prose-li:text-ink/72">
          <ReactMarkdown>{noteMarkdown}</ReactMarkdown>
        </div>
      </article>
    </section>
  );
}
