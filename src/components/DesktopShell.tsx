import {
  Check,
  Clock3,
  FileClock,
  FileDown,
  History,
  MessageSquarePlus,
  MessageSquareText,
  PlugZap,
  ScrollText,
  Trash2,
} from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";
import type { ApiDiagnostics, OptimizedPromptResult } from "../types/app";
import type { HistorySummary } from "../types/desktop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { StatusCallout } from "./StatusCallout";
import { normalizePromptField } from "../lib/responseParsers";

export type DesktopStepId = "connection" | "mode" | "input" | "clarify" | "brief" | "history";

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
  headerAction: ReactNode;
  status: {
    tone: "neutral" | "success" | "warning" | "error";
    title: string;
    description: string;
  } | null;
  topBanner?: ReactNode;
  children: ReactNode;
  diagnostics: ApiDiagnostics | null;
  history: HistorySummary[];
  currentResult: OptimizedPromptResult;
  onCopyDiagnostics: CopyAction;
  onOpenHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onCopyPrompt: CopyAction;
  onExportCurrent: CopyAction;
};

const stepIcons: Record<DesktopStepId, ComponentType<{ className?: string }>> = {
  connection: PlugZap,
  mode: MessageSquarePlus,
  input: ScrollText,
  clarify: MessageSquareText,
  brief: FileDown,
  history: History,
};

type DrawerTab = "result" | "diagnostics" | "history";

const drawerTabs: Array<{
  id: DrawerTab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "result", label: "结果", icon: FileClock },
  { id: "diagnostics", label: "诊断", icon: PlugZap },
  { id: "history", label: "历史", icon: Clock3 },
];

function getPromptOutline(markdown: string) {
  let normalized = markdown.trim();
  for (let index = 0; index < 4; index += 1) {
    try {
      const parsed = JSON.parse(normalized) as
        | string
        | {
            finalPromptMarkdown?: string;
            prompt?: string;
          };
      const next =
        typeof parsed === "string"
          ? parsed
          : parsed.finalPromptMarkdown ?? parsed.prompt ?? normalized;
      if (next.trim() && next.trim() !== normalized) {
        normalized = next.trim();
        continue;
      }
    } catch {
      normalized = normalizePromptField(normalized, "finalPromptMarkdown") || normalized;
      break;
    }
    normalized = normalizePromptField(normalized, "finalPromptMarkdown") || normalized;
    break;
  }

  const title = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Agent 任务需求";
  const sections = [...normalized.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
  return { title, sections };
}

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
  topBanner,
}: DesktopShellProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab>("result");
  const promptOutline = getPromptOutline(currentResult.finalPromptMarkdown);

  return (
    <div className="h-screen overflow-hidden bg-paper text-ink">
      <div className="relative grid h-screen grid-cols-[264px_minmax(0,1fr)_360px]">
        <aside className="h-screen overflow-y-auto border-r border-black/8 bg-white/68 px-4 py-4 backdrop-blur-xl">
          <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink/45">
              Desktop MVP
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">
              Prompt Brief Builder
            </h1>
            <p className="mt-2 text-xs leading-5 text-ink/58">
              本地桌面端负责请求模型、保存历史和安全管理密钥。
            </p>
          </div>

          <nav className="mt-4 grid gap-1.5">
            {steps.map((step) => {
              const Icon = stepIcons[step.id];
              const selected = step.id === activeStep;
              return (
                <button
                  type="button"
                  key={step.id}
                  onClick={() => onStepChange(step.id)}
                  className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-[#0071e3]/18 bg-[#0071e3]/10 text-ink"
                      : "border-transparent bg-transparent text-ink/62 hover:border-black/8 hover:bg-white"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-[#0071e3] text-white" : "bg-black/5 text-ink/52"
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

        <main className="flex h-screen min-w-0 flex-col overflow-hidden px-5 py-4">
          <header className="mb-3 flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-black/8 bg-white/78 px-4 py-3 shadow-sm backdrop-blur-xl">
            <div>
              <p className="eyebrow">Workbench</p>
              <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
                阶段式桌面工作台
              </h2>
            </div>
            {headerAction}
          </header>

          {topBanner ? (
            <div className="mb-3 shrink-0">{topBanner}</div>
          ) : status ? (
            <div className="mb-3 shrink-0">
              <StatusCallout
                tone={status.tone}
                title={status.title}
                description={status.description}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-black/8 bg-white/58 p-4 shadow-sm backdrop-blur-xl">
            {children}
          </div>
        </main>

        <aside className="flex h-screen min-w-0 flex-col overflow-hidden border-l border-black/8 bg-white/68 px-3 py-4 backdrop-blur-xl">
          <div className="grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-black/8 bg-black/5 p-1">
            {drawerTabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeDrawer === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveDrawer(tab.id)}
                  className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                    selected
                      ? "bg-white text-ink shadow-sm"
                      : "text-ink/58 hover:bg-white/62"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {activeDrawer === "result" ? (
              <section className="rounded-2xl border border-ink/10 bg-white/62 p-4 shadow-insetline">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">Current Brief</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">当前结果</h3>
                  </div>
                  <FileClock className="h-5 w-5 text-moss" />
                </div>

                {currentResult.finalPromptMarkdown ? (
                  <div className="mt-4 grid gap-3">
                    <CopyFeedbackButton
                      onCopy={onCopyPrompt}
                      label="复制 Prompt"
                      className="w-full gap-2"
                    />
                    <CopyFeedbackButton
                      onCopy={onExportCurrent}
                      label="导出 Markdown"
                      copiedLabel="已复制 Markdown"
                      className="w-full gap-2"
                    />
                    <div className="rounded-xl border border-black/8 bg-[#f5f5f7] p-3">
                      <p className="text-sm font-semibold text-ink">{promptOutline.title}</p>
                      {promptOutline.sections.length ? (
                        <div className="mt-3 grid gap-1.5">
                          {promptOutline.sections.map((section) => (
                            <div
                              key={section}
                              className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-ink/70"
                            >
                              {section}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-ink/58">
                          已生成，可以在主工作区阅读完整内容。
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-ink/58">
                    完成生成后，这里会显示复制和导出入口。
                  </p>
                )}
              </section>
            ) : null}

            {activeDrawer === "diagnostics" ? (
              <DiagnosticsPanel diagnostics={diagnostics} onCopy={onCopyDiagnostics} />
            ) : null}

            {activeDrawer === "history" ? (
              <section className="rounded-2xl border border-ink/10 bg-white/62 p-4 shadow-insetline">
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
                        className="rounded-xl border border-ink/8 bg-vellum/75 p-3"
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
                          className="mt-2 inline-flex h-9 min-w-[72px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-oxblood/15 px-3 text-xs font-semibold text-oxblood transition hover:bg-oxblood/8"
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
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
