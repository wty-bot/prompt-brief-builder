import type { ClarifyingAnswer, ClarifyingQuestion } from "../types/app";
import { CircleDashed, MessageSquareText, SendHorizontal } from "lucide-react";

type ClarifyingQuestionsPanelProps = {
  questions: ClarifyingQuestion[];
  answers: ClarifyingAnswer[];
  disabled?: boolean;
  generating?: boolean;
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
  generating,
  onChange,
  onGeneratePrompt,
}: ClarifyingQuestionsPanelProps) {
  if (!questions.length) {
    return (
      <section className="panel relative overflow-hidden p-5">
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Interview Queue</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                等待 AI 生成访谈问题
              </h2>
            </div>
            <CircleDashed className="h-7 w-7 animate-pulseglow text-moss" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-ink/8 bg-white/55 p-4"
              >
                <div className="h-3 w-20 rounded-full bg-ink/10" />
                <div className="mt-4 h-4 w-3/4 rounded-full bg-ink/8" />
                <div className="mt-3 h-4 w-1/2 rounded-full bg-ink/6" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/58">
            先在左侧写下需求。AI 会把它拆成最关键的 3-7 个确认问题。
          </p>
        </div>
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
    <section className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-ink/8 bg-vellum/90 p-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-vellum shadow-soft">
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Interview Queue</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              AI 澄清问题
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-ink/62">
          回答越完整，最终 Brief 越像一份真正能执行的任务书。不确定的问题可以跳过。
        </p>
      </div>

      <div className="grid min-h-0 gap-3 p-4 lg:grid-cols-2">
        {questions.map((question, index) => {
          const answer = getAnswer(answers, question.id);

          return (
            <article
              key={question.id}
              className="group rounded-2xl border border-ink/8 bg-white/65 p-4 transition hover:border-moss/25 hover:shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  Q{index + 1}
                  {question.required ? (
                    <span className="rounded-full bg-amberline/10 px-2 py-1 text-[10px] text-amberline">
                      关键
                    </span>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    answer.skipped
                      ? "bg-ink/8 text-ink/50"
                      : answer.answer.trim()
                        ? "bg-moss/10 text-deepmoss"
                        : "bg-paper text-ink/45"
                  }`}
                >
                  {answer.skipped
                    ? "Skipped"
                    : answer.answer.trim()
                      ? "Answered"
                      : "Waiting"}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-6 text-ink">
                {question.question}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">{question.why}</p>
              <textarea
                rows={3}
                value={answer.answer}
                disabled={answer.skipped}
                onChange={(event) =>
                  updateAnswer(question.id, {
                    answer: event.target.value,
                    skipped: false,
                  })
                }
                placeholder={question.placeholder}
                className="field mt-3 resize-y text-sm leading-6 disabled:cursor-not-allowed disabled:bg-ink/5"
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
      </div>

      <div className="sticky bottom-0 z-10 border-t border-ink/8 bg-vellum/92 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink/62">
            已填写 {answers.filter((item) => item.answer.trim()).length}/{questions.length}，跳过{" "}
            {answers.filter((item) => item.skipped).length} 项。
          </p>
          <button
            type="button"
            onClick={onGeneratePrompt}
            disabled={disabled}
            className="accent-button gap-2"
          >
            <SendHorizontal className="h-4 w-4" />
            {generating ? "正在生成最终 Prompt..." : "生成最终 Prompt"}
          </button>
        </div>
      </div>
    </section>
  );
}
