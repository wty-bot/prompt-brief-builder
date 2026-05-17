import type { ClarifyingAnswer, ClarifyingQuestion } from "../types/app";

type ClarifyingQuestionsPanelProps = {
  questions: ClarifyingQuestion[];
  answers: ClarifyingAnswer[];
  disabled?: boolean;
  onChange: (answers: ClarifyingAnswer[]) => void;
  onGeneratePrompt: () => void;
};

function getAnswer(answers: ClarifyingAnswer[], questionId: string) {
  return (
    answers.find((item) => item.questionId === questionId) ?? {
      questionId,
      answer: "",
      skipped: false,
    }
  );
}

export function ClarifyingQuestionsPanel({
  questions,
  answers,
  disabled,
  onChange,
  onGeneratePrompt,
}: ClarifyingQuestionsPanelProps) {
  if (!questions.length) {
    return (
      <section className="rounded-[28px] border border-dashed border-black/10 bg-white/50 p-6 text-sm leading-6 text-ink/65">
        这里会显示 AI 生成的澄清问题。先在左侧填写需求并完成连接测试或直接生成问题。
      </section>
    );
  }

  const updateAnswer = (questionId: string, next: Partial<ClarifyingAnswer>) => {
    const answer = getAnswer(answers, questionId);
    const merged = {
      ...answer,
      ...next,
    };
    const others = answers.filter((item) => item.questionId !== questionId);
    onChange([...others, merged]);
  };

  return (
    <section className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-soft backdrop-blur">
      <div className="mb-5 space-y-2">
        <h2 className="text-xl font-semibold text-ink">AI 澄清问题</h2>
        <p className="text-sm leading-6 text-ink/65">
          回答越完整，最终 Prompt 越像一份真正能执行的需求说明。暂时不确定的问题也可以跳过。
        </p>
      </div>

      <div className="grid gap-4">
        {questions.map((question, index) => {
          const answer = getAnswer(answers, question.id);

          return (
            <article
              key={question.id}
              className="rounded-3xl border border-black/8 bg-paper/50 p-5"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-moss">
                Q{index + 1}
                {question.required ? <span className="text-amberline">关键</span> : null}
              </div>
              <h3 className="mt-3 text-base font-semibold leading-7 text-ink">
                {question.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">{question.why}</p>
              <textarea
                rows={4}
                value={answer.answer}
                disabled={answer.skipped}
                onChange={(event) =>
                  updateAnswer(question.id, {
                    answer: event.target.value,
                    skipped: false,
                  })
                }
                placeholder={question.placeholder}
                className="mt-4 w-full resize-y rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15 disabled:cursor-not-allowed disabled:bg-black/5"
              />
              <label className="mt-3 flex items-center gap-3 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={answer.skipped}
                  onChange={(event) =>
                    updateAnswer(question.id, {
                      skipped: event.target.checked,
                      answer: event.target.checked ? "" : answer.answer,
                    })
                  }
                  className="h-4 w-4 rounded border-black/20 text-moss focus:ring-moss"
                />
                暂时跳过这个问题
              </label>
            </article>
          );
        })}

        <button
          type="button"
          onClick={onGeneratePrompt}
          disabled={disabled}
          className="rounded-full border border-moss bg-moss px-5 py-3 text-sm font-medium text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          生成最终 Prompt
        </button>
      </div>
    </section>
  );
}
