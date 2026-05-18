import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";
import { normalizePromptField } from "../lib/responseParsers";

type PromptDocumentProps = {
  markdown: string;
  onCopy: CopyAction;
  title?: string;
};

type PromptSection = {
  title: string;
  body: string;
};

function normalizeMarkdown(value: string) {
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
            finalPromptMarkdown?: string;
            prompt?: string;
          };

      if (typeof parsed === "string" && parsed.trim() && parsed.trim() !== current) {
        current = parsed.trim();
        continue;
      }

      if (typeof parsed === "object" && parsed) {
        const next = parsed.finalPromptMarkdown ?? parsed.prompt;
        if (next?.trim() && next.trim() !== current) {
          current = next.trim();
          continue;
        }
      }
    } catch {
      return normalizePromptField(current, "finalPromptMarkdown") || current;
    }

    return normalizePromptField(current, "finalPromptMarkdown") || current;
  }

  return normalizePromptField(current, "finalPromptMarkdown") || current;
}

function parsePromptMarkdown(markdown: string) {
  const normalized = normalizeMarkdown(markdown);
  const h1Match = normalized.match(/^#\s+(.+)$/m);
  const title = h1Match?.[1]?.trim() || "Agent 任务需求";

  const h2Matches = [...normalized.matchAll(/^##\s+(.+)$/gm)];
  const introStart = h1Match ? (h1Match.index ?? 0) + h1Match[0].length : 0;
  const introEnd = h2Matches.length ? h2Matches[0]!.index ?? normalized.length : normalized.length;
  const intro = normalized.slice(introStart, introEnd).trim();

  const sections: PromptSection[] = h2Matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < h2Matches.length ? h2Matches[index + 1]!.index ?? normalized.length : normalized.length;
    return {
      title: match[1]?.trim() || `第 ${index + 1} 节`,
      body: normalized.slice(start, end).trim(),
    };
  });

  if (!sections.length && normalized) {
    const body = h1Match ? normalized.slice(introStart).trim() : normalized;
    return { title, intro: "", sections: [{ title: "正文", body }] };
  }

  return { title, intro, sections };
}

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-2 text-[15px] leading-7 text-ink/78">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 text-[15px] leading-7 text-ink/78">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 text-[15px] leading-7 text-ink/78">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="pl-1">{children}</li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-[13px] text-ink">
      {children}
    </code>
  ),
};

export function PromptDocument({ markdown, onCopy, title = "最终 Prompt" }: PromptDocumentProps) {
  const parsed = useMemo(() => parsePromptMarkdown(markdown), [markdown]);

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">Readable Document</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink/58">
            这里展示的是可阅读文本；Markdown 源码只用于复制和导出。
          </p>
        </div>
        <CopyFeedbackButton onCopy={onCopy} className="min-h-9 gap-2 px-3 text-xs" />
      </div>

      <div className="grid gap-4 p-5">
        <header className="rounded-2xl bg-[#f5f5f7] px-4 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0071e3]" />
            <h1 className="text-xl font-semibold tracking-tight text-ink">{parsed.title}</h1>
          </div>
          {parsed.intro ? (
            <div className="mt-3">
              <ReactMarkdown components={markdownComponents}>{parsed.intro}</ReactMarkdown>
            </div>
          ) : null}
        </header>

        <div className="grid gap-4">
          {parsed.sections.map((section) => (
            <section key={section.title} className="border-t border-black/8 pt-4 first:border-t-0 first:pt-0">
              <h2 className="text-base font-semibold tracking-tight text-ink">{section.title}</h2>
              <div className="mt-2">
                <ReactMarkdown components={markdownComponents}>{section.body || " "}</ReactMarkdown>
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
