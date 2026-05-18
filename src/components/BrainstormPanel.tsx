import ReactMarkdown from "react-markdown";
import {
  ClipboardCheck,
  MessageSquareText,
  SendHorizontal,
  Sparkles,
} from "lucide-react";

import type { BrainstormMessage } from "../types/app";

type BrainstormPanelProps = {
  messages: BrainstormMessage[];
  summaryMarkdown: string;
  confirmedRequirements: string[];
  confidence: number;
  missingInformation: string[];
  answer: string;
  continueDirection: string;
  readyToFinalize: boolean;
  showContinueInput: boolean;
  disabled?: boolean;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onFinalize: () => void;
  onDeclineFinalize: () => void;
  onContinueDirectionChange: (value: string) => void;
  onSubmitContinueDirection: () => void;
};

export function BrainstormPanel({
  messages,
  summaryMarkdown,
  confirmedRequirements,
  confidence,
  missingInformation,
  answer,
  continueDirection,
  readyToFinalize,
  showContinueInput,
  disabled,
  onAnswerChange,
  onSubmitAnswer,
  onFinalize,
  onDeclineFinalize,
  onContinueDirectionChange,
  onSubmitContinueDirection,
}: BrainstormPanelProps) {
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const latestConfirmedRequirement =
    confirmedRequirements.length > 0
      ? confirmedRequirements[confirmedRequirements.length - 1]
      : "";
  const latestAssistantIndex = findLastAssistantIndex(messages);

  return (
    <section className="mx-auto flex min-h-[620px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <header className="border-b border-ink/8 bg-white/94 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-vellum shadow-soft">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Brainstorming</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
                逐轮澄清需求
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink/58">
                AI 每次只问一个问题，确认项会直接沉淀在对话流里。
              </p>
            </div>
          </div>
          <div className="grid min-w-[220px] gap-2">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink/58">
              <span>清晰度</span>
              <span>{confidence}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/8">
              <div
                className="h-full rounded-full bg-[#0071e3]"
                style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
              />
            </div>
            <p className="text-xs font-medium text-ink/48">
              已确认 {confirmedRequirements.length} 条
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-5 py-5">
        <div className="mx-auto grid max-w-4xl gap-4">
          {messages.map((message, index) => (
            <MessageWithConfirmation
              key={message.id}
              message={message}
              confirmation={
                latestConfirmedRequirement && index === latestAssistantIndex
                  ? latestConfirmedRequirement
                  : ""
              }
              showConfirmationBeforeMessage={message.role === "assistant"}
            />
          ))}

          {!latestConfirmedRequirement ? (
            <div className="justify-self-center rounded-full border border-dashed border-black/12 bg-white px-4 py-2 text-xs font-medium text-ink/48">
              发送回答后，这里会显示本轮确认下来的需求维度。
            </div>
          ) : latestAssistantIndex < 0 ? (
            <ConfirmedRequirementCard value={latestConfirmedRequirement} />
          ) : null}

          {confirmedRequirements.length > 1 || summaryMarkdown || missingInformation.length ? (
            <details className="justify-self-center rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm shadow-sm">
              <summary className="cursor-pointer font-semibold text-ink">
                查看全部已确认
              </summary>
              {confirmedRequirements.length ? (
                <div className="mt-3 grid gap-2">
                  {confirmedRequirements.map((item, index) => (
                    <div key={`${index}-${item}`} className="rounded-xl bg-[#f5f5f7] px-3 py-2">
                      <p className="text-xs font-semibold text-[#0071e3]">确认 {index + 1}</p>
                      <p className="mt-1 text-sm leading-6 text-ink/72">{stripMarkdown(item)}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {missingInformation.length ? (
                <div className="mt-3 rounded-xl border border-amberline/20 bg-amberline/8 px-3 py-2">
                  <p className="text-xs font-semibold text-ink">还可能缺少</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/66">
                    {missingInformation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summaryMarkdown ? (
                <details className="mt-3 rounded-xl border border-black/8 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink/58">
                    过程摘要
                  </summary>
                  <div className="prose prose-sm mt-2 max-w-none prose-p:leading-7 prose-p:text-ink/68 prose-li:leading-7 prose-li:text-ink/68">
                    <ReactMarkdown>{summaryMarkdown}</ReactMarkdown>
                  </div>
                </details>
              ) : null}
            </details>
          ) : null}
      </div>
      </div>

      <footer className="border-t border-ink/8 bg-white/94 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-4xl">
          {readyToFinalize ? (
            <div className="mb-3 rounded-2xl border border-moss/20 bg-moss/8 p-3">
              <p className="text-sm font-semibold text-ink">AI 认为当前需求已经接近清楚。</p>
              <p className="mt-1 text-sm leading-6 text-ink/62">
                {lastAssistant?.content || "是否现在收束成最终 Prompt？"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onFinalize} disabled={disabled} className="primary-button min-h-9 gap-2 px-3 text-xs">
                  <ClipboardCheck className="h-4 w-4" />
                  是，收束需求
                </button>
                <button type="button" onClick={onDeclineFinalize} disabled={disabled} className="ghost-button min-h-9 px-3 text-xs">
                  否，我还想继续
                </button>
              </div>
            </div>
          ) : null}

          {showContinueInput ? (
            <div className="mb-3 grid gap-2 rounded-2xl border border-black/8 bg-white p-3">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">你想继续讨论什么？</span>
                <textarea
                  rows={3}
                  value={continueDirection}
                  onChange={(event) => onContinueDirectionChange(event.target.value)}
                  placeholder="例如：继续问我交互细节，或者帮我想一下异常场景。"
                  className="field resize-y text-sm leading-6"
                />
              </label>
              <button
                type="button"
                onClick={onSubmitContinueDirection}
                disabled={disabled || !continueDirection.trim()}
                className="accent-button gap-2"
              >
                <SendHorizontal className="h-4 w-4" />
                继续头脑风暴
              </button>
            </div>
          ) : null}

          <div className="grid gap-2">
            <textarea
              rows={3}
              value={answer}
              disabled={disabled}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="回答当前问题，或者补充任何你想到的信息。"
              className="field resize-y text-sm leading-6"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onSubmitAnswer}
                disabled={disabled || !answer.trim()}
                className="primary-button gap-2"
              >
                <SendHorizontal className="h-4 w-4" />
                发送回答
              </button>
              <button type="button" onClick={onFinalize} disabled={disabled || !messages.length} className="ghost-button gap-2">
                <ClipboardCheck className="h-4 w-4" />
                收束需求
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>
  );
}

function MessageWithConfirmation({
  message,
  confirmation,
  showConfirmationBeforeMessage,
}: {
  message: BrainstormMessage;
  confirmation: string;
  showConfirmationBeforeMessage: boolean;
}) {
  const bubble = (
    <article
      className={`max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-7 shadow-sm ${
        message.role === "assistant"
          ? "justify-self-start border-black/8 bg-white text-ink/76"
          : "justify-self-end border-[#0071e3]/20 bg-[#eaf2ff] text-ink"
      }`}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/42">
        {message.role === "assistant" ? "AI" : "You"}
      </p>
      <div className="whitespace-pre-wrap">{message.content}</div>
    </article>
  );

  if (!confirmation) return bubble;

  return (
    <>
      {showConfirmationBeforeMessage ? <ConfirmedRequirementCard value={confirmation} /> : null}
      {bubble}
      {!showConfirmationBeforeMessage ? <ConfirmedRequirementCard value={confirmation} /> : null}
    </>
  );
}

function findLastAssistantIndex(messages: BrainstormMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") {
      return index;
    }
  }
  return -1;
}

function ConfirmedRequirementCard({ value }: { value: string }) {
  const parsed = parseConfirmedRequirement(value);

  return (
    <article className="justify-self-center rounded-2xl border border-[#0071e3]/18 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0071e3]/10 text-[#0071e3]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
            刚确认
          </p>
          <p className="mt-1 text-sm leading-6 text-ink/76">
            <span className="font-semibold text-ink">【{parsed.dimension}】</span>
            {parsed.content}
          </p>
        </div>
      </div>
    </article>
  );
}

function parseConfirmedRequirement(value: string) {
  const plain = stripMarkdown(value)
    .replace(/^已确认[:：\s]*/u, "")
    .replace(/^用户(?:希望|想|需要|要|要求)/u, "")
    .trim();
  const match = plain.match(/^【([^】]+)】\s*(.+)$/u);
  return {
    dimension: match?.[1]?.trim() || "任务目标",
    content: match?.[2]?.trim() || plain,
  };
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/^[-*]\s+/gm, "")
    .trim();
}
