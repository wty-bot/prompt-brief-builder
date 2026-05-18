import { normalizePromptField } from "../lib/responseParsers";

type ComparisonPanelProps = {
  rawRequirement: string;
  finalPromptMarkdown: string;
};

function normalizePromptMarkdown(value: string) {
  let current = value.trim();
  if (!current) return "";

  for (let index = 0; index < 4; index += 1) {
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

function getPromptOutline(markdown: string) {
  const normalized = normalizePromptMarkdown(markdown);
  const title = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Agent 任务需求";
  const sections = [...normalized.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

  return { title, sections };
}

export function ComparisonPanel({
  rawRequirement,
  finalPromptMarkdown,
}: ComparisonPanelProps) {
  if (!finalPromptMarkdown.trim()) {
    return null;
  }

  const outline = getPromptOutline(finalPromptMarkdown);

  return (
    <details className="panel p-5">
      <summary className="cursor-pointer list-none">
        <div className="space-y-2">
          <p className="eyebrow">Before / After</p>
          <h2 className="text-xl font-semibold tracking-tight text-ink">对比视图</h2>
          <p className="text-sm leading-6 text-ink/58">
            展开后只展示输入摘要和结构变化；完整正文在上方“最终 Prompt”阅读。
          </p>
        </div>
      </summary>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-2xl border border-black/8 bg-white p-4">
          <h3 className="text-sm font-semibold text-ink">原始需求</h3>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/76">
            {rawRequirement.trim() || "没有原始需求文本。"}
          </div>
        </article>

        <article className="rounded-2xl border border-black/8 bg-[#f5f5f7] p-4">
          <h3 className="text-sm font-semibold text-ink">优化后结构</h3>
          <p className="mt-2 text-sm leading-6 text-ink/62">{outline.title}</p>
          {outline.sections.length ? (
            <div className="mt-3 grid gap-2">
              {outline.sections.map((section) => (
                <div
                  key={section}
                  className="rounded-xl border border-black/8 bg-white px-3 py-2 text-sm font-medium text-ink/76"
                >
                  {section}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ink/58">
              当前结果没有明显章节标题，但已可在主结果区阅读。
            </p>
          )}
        </article>
      </div>
    </details>
  );
}
