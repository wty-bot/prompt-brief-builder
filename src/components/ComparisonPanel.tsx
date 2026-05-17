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
    <section className="panel p-6">
      <div className="mb-5 space-y-2">
        <p className="eyebrow">Before / After</p>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">对比视图</h2>
        <p className="text-sm leading-6 text-ink/65">
          左边是你最初的输入，右边是适合交给 Agent 执行的结构化 Markdown。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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
    </section>
  );
}
