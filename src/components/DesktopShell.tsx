import {
  Check,
  Clock3,
  Copy,
  FileClock,
  FileDown,
  History,
  MessageSquareText,
  PlugZap,
  ScrollText,
  Settings2,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import type { ApiDiagnostics, OptimizedPromptResult } from "../types/app";
import type { HistorySummary } from "../types/desktop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { StatusCallout } from "./StatusCallout";

export type DesktopStepId = "connection" | "input" | "clarify" | "brief" | "history";

type DesktopStep = {
  id: DesktopStepId;
  label: string;
  description: string;
  status: "idle" | "active" | "done";
};

type DesktopShellProps = {
  steps: DesktopStep[];
  activeStep: DesktopStepId;
  onStepChange: (step: DesktopStepId) => void;
  headerAction: React.ReactNode;
  status: {
    tone: "neutral" | "success" | "warning" | "error";
    title: string;
    description: string;
  } | null;
  children: React.ReactNode;
  diagnostics: ApiDiagnostics | null;
  history: HistorySummary[];
  currentResult: OptimizedPromptResult;
  onCopyDiagnostics: () => void;
  onOpenHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onCopyPrompt: () => void;
  onExportCurrent: () => void;
};

const stepIcons: Record<DesktopStepId, React.ComponentType<{ className?: string }>> = {
  connection: PlugZap,
  input: ScrollText,
  clarify: MessageSquareText,
  brief: FileDown,
  history: History,
};

export function DesktopShell({
  steps,
  activeStep,
  onStepChange,
  headerAction,
  status,
  children,
  diagnostics,
  history,
  currentResult,
  onCopyDiagnostics,
  onOpenHistory,
  onDeleteHistory,
  onCopyPrompt,
  onExportCurrent,
}: DesktopShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="pointer-events-none fixed inset-0 bg-paper-grid bg-[size:32px_32px] opacity-[0.12]" />
      <div className="relative grid min-h-screen grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="border-r border-ink/10 bg-vellum/86 px-4 py-5 shadow-insetline backdrop-blur">
          <div className="rounded-3xl border border-ink/10 bg-ink p-5 text-vellum shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-moss">
              Desktop MVP
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Prompt Brief Builder
            </h1>
            <p className="mt-3 text-sm leading-6 text-vellum/62">
              本地桌面端负责请求模型、保存历史和安全管理密钥。
            </p>
          </div>

          <nav className="mt-5 grid gap-2">
            {steps.map((step) => {
              const Icon = stepIcons[step.id];
              const selected = step.id === activeStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => onStepChange(step.id)}
                  className={`group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-moss/35 bg-moss/10 text-ink"
                      : "border-transparent bg-transparent text-ink/65 hover:border-ink/8 hover:bg-white/55"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      selected ? "bg-moss text-white" : "bg-ink/6 text-ink/52"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {step.label}
                      {step.status === "done" ? <Check className="h-3.5 w-3.5 text-moss" /> : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ink/52">
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 px-6 py-5">
          <header className="mb-5 flex items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-vellum/76 px-5 py-4 shadow-insetline backdrop-blur">
            <div>
              <p className="eyebrow">Workbench</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                阶段式桌面工作台
              </h2>
            </div>
            {headerAction}
          </header>

          {status ? (
            <div className="mb-5">
              <StatusCallout
                tone={status.tone}
                title={status.title}
                description={status.description}
              />
            </div>
          ) : null}

          <div className="min-h-[calc(100vh-152px)] rounded-[28px] border border-ink/10 bg-vellum/72 p-5 shadow-soft shadow-insetline backdrop-blur">
            {children}
          </div>
        </main>

        <aside className="border-l border-ink/10 bg-vellum/76 px-4 py-5 backdrop-blur">
          <div className="grid max-h-[calc(100vh-40px)] gap-4 overflow-y-auto pr-1">
            <section className="rounded-3xl border border-ink/10 bg-white/60 p-4 shadow-insetline">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Current Brief</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">当前结果</h3>
                </div>
                <FileClock className="h-5 w-5 text-moss" />
              </div>

              {currentResult.finalPromptMarkdown ? (
                <div className="mt-4 grid gap-3">
                  <button type="button" onClick={onCopyPrompt} className="ghost-button w-full gap-2">
                    <Copy className="h-4 w-4" />
                    复制 Prompt
                  </button>
                  <button type="button" onClick={onExportCurrent} className="ghost-button w-full gap-2">
                    <FileDown className="h-4 w-4" />
                    导出 Markdown
                  </button>
                  <details className="rounded-2xl border border-ink/8 bg-vellum/80 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">
                      预览结果
                    </summary>
                    <div className="prose prose-sm mt-3 max-w-none prose-headings:text-ink prose-p:text-ink/76 prose-li:text-ink/76">
                      <ReactMarkdown>{currentResult.finalPromptMarkdown}</ReactMarkdown>
                    </div>
                  </details>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink/58">
                  完成生成后，这里会显示复制和导出入口。
                </p>
              )}
            </section>

            <DiagnosticsPanel diagnostics={diagnostics} onCopy={onCopyDiagnostics} />

            <section className="rounded-3xl border border-ink/10 bg-white/60 p-4 shadow-insetline">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">History</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">本地历史</h3>
                </div>
                <Clock3 className="h-5 w-5 text-amberline" />
              </div>

              <div className="mt-4 grid gap-2">
                {history.length ? (
                  history.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-ink/8 bg-vellum/75 p-3"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenHistory(item.id)}
                        className="block w-full text-left"
                      >
                        <p className="line-clamp-2 text-sm font-semibold leading-5 text-ink">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-ink/48">
                          {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHistory(item.id)}
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-oxblood/15 px-3 text-xs font-semibold text-oxblood transition hover:bg-oxblood/8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-ink/58">
                    生成 Brief 后会自动保存到本地。
                  </p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
