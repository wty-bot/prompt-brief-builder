type ComparisonPanelProps = {
  rawRequirement: string;
  finalPromptMarkdown: string;
};

export function ComparisonPanel({
  rawRequirement,
  finalPromptMarkdown,
}: ComparisonPanelProps) {
  if (!finalPromptMarkdown.trim()) {
    return null;
  }

  return (
    <details className="panel p-6">
      <summary className="cursor-pointer list-none">
        <div className="space-y-2">
          <p className="eyebrow">Before / After</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">对比视图</h2>
          <p className="text-sm leading-6 text-ink/65">
            展开查看原始输入和优化后 Prompt 的差异。
          </p>
        </div>
      </summary>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="rounded-[28px] border border-ink/8 bg-paper/55 p-5">
          <h3 className="text-sm font-semibold text-ink">原始需求</h3>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/75">
            {rawRequirement.trim()}
          </pre>
        </article>

        <article className="rounded-[28px] border border-moss/15 bg-moss/8 p-5">
          <h3 className="text-sm font-semibold text-ink">优化后 Prompt</h3>
          <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/75">
            {finalPromptMarkdown.trim()}
          </pre>
        </article>
      </div>
    </details>
  );
}
