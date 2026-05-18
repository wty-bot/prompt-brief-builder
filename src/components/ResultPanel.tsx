import ReactMarkdown from "react-markdown";
import { FileCheck2, RotateCcw } from "lucide-react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";
import { PromptDocument } from "./PromptDocument";
import { normalizePromptField } from "../lib/responseParsers";

type ResultPanelProps = {
  finalPromptMarkdown: string;
  improvementNotesMarkdown: string;
  sourceLabel?: string;
  outputKind?: string;
  onCopyPrompt: CopyAction;
  onCopyNotes: CopyAction;
  onClear: () => void;
};

function normalizeNotesMarkdown(value: string) {
  let current = value.trim();
  if (!current) return "";

  for (let index = 0; index < 4; index += 1) {
    const fenced = current.match(/^```(?:json|markdown|md)?\s*([\s\S]*?)\s*```$/i);
    if (fenced?.[1]) {
      current = fenced[1].trim();
    }

    try {
      const parsed = JSON.parse(current) as
        | string
        | {
            improvementNotesMarkdown?: string;
            notes?: string;
            content?: string;
          };

      if (typeof parsed === "string" && parsed.trim() && parsed.trim() !== current) {
        current = parsed.trim();
        continue;
      }

      if (typeof parsed === "object" && parsed) {
        const next = parsed.improvementNotesMarkdown ?? parsed.notes ?? parsed.content;
        if (next?.trim() && next.trim() !== current) {
          current = next.trim();
          continue;
        }
      }
    } catch {
      return normalizePromptField(current, "improvementNotesMarkdown") || current;
    }

    return normalizePromptField(current, "improvementNotesMarkdown") || current;
  }

  return normalizePromptField(current, "improvementNotesMarkdown") || current;
}

export function ResultPanel({
  finalPromptMarkdown,
  improvementNotesMarkdown,
  sourceLabel,
  outputKind,
  onCopyPrompt,
  onCopyNotes,
  onClear,
}: ResultPanelProps) {
  const readableNotes = normalizeNotesMarkdown(improvementNotesMarkdown);

  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/8 bg-white px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">
              Ready Brief
            </p>
            <h2 className="mt-2 flex items-center gap-3 text-xl font-semibold tracking-tight text-ink">
              <FileCheck2 className="h-5 w-5 text-[#0071e3]" />
              优化结果
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/62">
              {outputKind === "轻量 Prompt"
                ? "最终输出是轻量 Prompt，适合直接复制给 Coding Agent 或通用 Agent。"
                : "最终输出已按章节整理，适合直接复制给 Coding Agent 或通用 Agent。"}
            </p>
            {sourceLabel || outputKind ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {sourceLabel ? (
                  <span className="rounded-full border border-black/8 bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-ink/58">
                    {sourceLabel}
                  </span>
                ) : null}
                {outputKind ? (
                  <span className="rounded-full border border-black/8 bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-ink/58">
                    {outputKind}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="ghost-button gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            清空当前会话
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <PromptDocument
          title="最终 Prompt"
          markdown={finalPromptMarkdown}
          onCopy={onCopyPrompt}
        />

        <article className="rounded-2xl border border-black/10 bg-[#f5f5f7] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Notes</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">优化说明</h3>
            </div>
            <CopyFeedbackButton
              onCopy={onCopyNotes}
              label="复制说明"
              className="min-h-9 gap-2 px-3 text-xs"
            />
          </div>
          <div className="prose prose-sm mt-4 max-w-none prose-headings:text-ink prose-p:leading-7 prose-p:text-ink/76 prose-li:leading-7 prose-li:text-ink/76 prose-code:rounded-md prose-code:bg-black/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-ink prose-pre:bg-ink">
            <ReactMarkdown>{readableNotes}</ReactMarkdown>
          </div>
        </article>
      </div>
    </section>
  );
}
