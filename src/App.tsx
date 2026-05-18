import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { ClarifyingQuestionsPanel } from "./components/ClarifyingQuestionsPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { DesktopShell, type DesktopStepId } from "./components/DesktopShell";
import { RequirementForm } from "./components/RequirementForm";
import { ResultPanel } from "./components/ResultPanel";
import { normalizeErrorMessage } from "./lib/errors";
import {
  deleteHistorySession,
  deleteSavedApiKey,
  exportHistoryMarkdown,
  generateDesktopChatCompletion,
  hasSavedApiKey,
  isDesktopRuntime,
  listHistory,
  loadDesktopSettings,
  saveApiKey,
  saveDesktopSettings,
  saveHistorySession,
  testDesktopConnection,
} from "./lib/desktopClient";
import {
  buildClarifyingQuestionsUserPrompt,
  buildFinalPromptUserPrompt,
  clarifyingQuestionsSystemPrompt,
  finalPromptSystemPrompt,
} from "./lib/promptTemplates";
import {
  parseClarifyingQuestions,
  parseOptimizedPromptResult,
} from "./lib/responseParsers";
import { providerPresets } from "./shared/providerPresets";
import type {
  ApiDiagnostics,
  AppPhase,
  ClarifyingAnswer,
  ClarifyingQuestion,
  OptimizedPromptResult,
  RequirementInput,
} from "./types/app";
import type {
  DesktopApiConfig,
  DesktopSettings,
  HistorySession,
  HistorySummary,
  ProviderPresetId,
} from "./types/desktop";

const defaultPreset = providerPresets[0];

const defaultApiConfig: DesktopApiConfig = {
  baseUrl: defaultPreset.baseUrl,
  apiKey: "",
  model: defaultPreset.model,
  temperature: 0.4,
  rememberConfig: false,
  providerPresetId: defaultPreset.id,
};

const defaultRequirementInput: RequirementInput = {
  rawRequirement: "",
  projectBackground: "",
  targetAudience: "",
  constraints: "",
  extraMaterials: "",
};

const defaultResult: OptimizedPromptResult = {
  finalPromptMarkdown: "",
  improvementNotesMarkdown: "",
};

type NoticeTone = "neutral" | "success" | "warning" | "error";

function App() {
  const desktopMode = isDesktopRuntime();
  const [apiConfig, setApiConfig] = useState<DesktopApiConfig>(defaultApiConfig);
  const [requirementInput, setRequirementInput] =
    useState<RequirementInput>(defaultRequirementInput);
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [activeStep, setActiveStep] = useState<DesktopStepId>("connection");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<ClarifyingAnswer[]>([]);
  const [result, setResult] = useState<OptimizedPromptResult>(defaultResult);
  const [diagnostics, setDiagnostics] = useState<ApiDiagnostics | null>(null);
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [savedKeyAvailable, setSavedKeyAvailable] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{
    tone: NoticeTone;
    title: string;
    description: string;
  } | null>({
    tone: "neutral",
    title: "桌面端已就绪",
    description:
      "模型请求会从 Electron 主进程发出，通常不会再被浏览器 CORS 限制拦住。",
  });

  useEffect(() => {
    async function bootstrap() {
      if (!desktopMode) return;

      const [settings, keyState, historyItems] = await Promise.all([
        loadDesktopSettings(),
        hasSavedApiKey(),
        listHistory(),
      ]);

      if (settings) {
        setApiConfig((current) => ({
          ...current,
          ...settings,
          apiKey: "",
        }));
      }
      setSavedKeyAvailable(keyState);
      setHistory(historyItems);
    }

    void bootstrap();
  }, [desktopMode]);

  const hasConfig = Boolean(
    apiConfig.baseUrl.trim() &&
      apiConfig.model.trim() &&
      (apiConfig.apiKey.trim() || savedKeyAvailable),
  );

  const steps = useMemo(
    () => [
      {
        id: "connection" as const,
        label: "连接模型",
        description: savedKeyAvailable ? "已保存密钥，可直接测试" : "选择服务商并填写 API Key",
        status:
          phase === "ready" ||
          phase === "generatingQuestions" ||
          phase === "answeringQuestions" ||
          phase === "generatingPrompt" ||
          phase === "completed"
            ? ("done" as const)
            : activeStep === "connection"
              ? ("active" as const)
              : ("idle" as const),
      },
      {
        id: "input" as const,
        label: "输入需求",
        description: "写下原始想法和背景材料",
        status: requirementInput.rawRequirement.trim()
          ? ("done" as const)
          : activeStep === "input"
            ? ("active" as const)
            : ("idle" as const),
      },
      {
        id: "clarify" as const,
        label: "澄清问题",
        description: questions.length ? "回答或跳过关键问题" : "等待 AI 生成访谈问题",
        status:
          questions.length && (phase === "completed" || phase === "generatingPrompt")
            ? ("done" as const)
            : activeStep === "clarify" || questions.length
              ? ("active" as const)
              : ("idle" as const),
      },
      {
        id: "brief" as const,
        label: "生成 Brief",
        description: "复制、导出和对比最终 Prompt",
        status: result.finalPromptMarkdown
          ? ("done" as const)
          : activeStep === "brief"
            ? ("active" as const)
            : ("idle" as const),
      },
      {
        id: "history" as const,
        label: "回看历史",
        description: "打开本地保存的会话",
        status: activeStep === "history" ? ("active" as const) : ("idle" as const),
      },
    ],
    [
      activeStep,
      phase,
      questions.length,
      requirementInput.rawRequirement,
      result.finalPromptMarkdown,
      savedKeyAvailable,
    ],
  );

  async function refreshHistory() {
    if (!desktopMode) return;
    setHistory(await listHistory());
  }

  async function persistSettings(nextConfig = apiConfig) {
    if (!desktopMode) return;
    const settings: DesktopSettings = {
      baseUrl: nextConfig.baseUrl,
      model: nextConfig.model,
      temperature: nextConfig.temperature,
      rememberConfig: nextConfig.rememberConfig,
      providerPresetId: nextConfig.providerPresetId,
    };
    await saveDesktopSettings(settings);
  }

  async function handleSaveApiKey() {
    if (!apiConfig.apiKey.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有 API Key",
        description: "请先输入 API Key，再保存到系统安全凭据。",
      });
      return;
    }

    try {
      await saveApiKey(apiConfig.apiKey.trim());
      setSavedKeyAvailable(true);
      setApiConfig((current) => ({ ...current, apiKey: "" }));
      setGlobalMessage({
        tone: "success",
        title: "API Key 已安全保存",
        description: "界面不会回显明文；后续请求会由主进程读取已保存密钥。",
      });
    } catch (error) {
      setGlobalMessage({
        tone: "error",
        title: "保存失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function handleDeleteApiKey() {
    await deleteSavedApiKey();
    setSavedKeyAvailable(false);
    setGlobalMessage({
      tone: "neutral",
      title: "已删除保存的 API Key",
      description: "下次请求前需要重新输入 API Key。",
    });
  }

  async function handleTestConnection() {
    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "配置不完整",
        description: "请填写 Base URL、Model，并输入或保存 API Key。",
      });
      return;
    }

    try {
      setPhase("testingConnection");
      setGlobalMessage({
        tone: "neutral",
        title: "正在测试连接",
        description: "主进程正在向模型服务发起一次极短请求。",
      });
      await persistSettings();
      const response = await testDesktopConnection(apiConfig);
      setDiagnostics(response.diagnostics);
      setPhase("ready");
      setActiveStep("input");
      setGlobalMessage({
        tone: "success",
        title: "连接成功",
        description: "当前模型配置可用，可以开始输入需求。",
      });
    } catch (error) {
      setPhase("error");
      if (error instanceof Error && "diagnostics" in error) {
        setDiagnostics((error as { diagnostics: ApiDiagnostics }).diagnostics);
      }
      setGlobalMessage({
        tone: "error",
        title: "连接测试失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function handleGenerateQuestions() {
    if (!requirementInput.rawRequirement.trim()) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺原始需求",
        description: "至少先输入一句想法，AI 才能判断应该追问什么。",
      });
      return;
    }

    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先完成模型连接设置。",
      });
      setActiveStep("connection");
      return;
    }

    try {
      setPhase("generatingQuestions");
      setActiveStep("clarify");
      setGlobalMessage({
        tone: "neutral",
        title: "正在生成澄清问题",
        description: "AI 正在找出最影响执行质量的信息缺口。",
      });

      const response = await generateDesktopChatCompletion({
        config: apiConfig,
        context: "clarify-questions",
        systemPrompt: clarifyingQuestionsSystemPrompt(),
        userPrompt: buildClarifyingQuestionsUserPrompt(requirementInput),
      });
      setDiagnostics(response.diagnostics);

      const payload = parseClarifyingQuestions(response.content);
      setQuestions(payload.questions);
      setAnswers(
        payload.questions.map((question) => ({
          questionId: question.id,
          answer: "",
          skipped: false,
        })),
      );
      setResult(defaultResult);
      setPhase("answeringQuestions");
      setGlobalMessage({
        tone: "success",
        title: "问题已生成",
        description: "把能回答的先补上，不确定的问题可以跳过。",
      });
    } catch (error) {
      setPhase("error");
      if (error instanceof Error && "diagnostics" in error) {
        setDiagnostics((error as { diagnostics: ApiDiagnostics }).diagnostics);
      }
      setGlobalMessage({
        tone: "error",
        title: "生成澄清问题失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function handleGeneratePrompt() {
    if (!questions.length) {
      setGlobalMessage({
        tone: "warning",
        title: "还没有澄清问题",
        description: "请先生成澄清问题，再继续生成最终 Prompt。",
      });
      return;
    }

    try {
      setPhase("generatingPrompt");
      setActiveStep("brief");
      setGlobalMessage({
        tone: "neutral",
        title: "正在整理最终 Prompt",
        description: "AI 正在整合原始需求与补充回答。",
      });

      const response = await generateDesktopChatCompletion({
        config: apiConfig,
        context: "compose-brief",
        systemPrompt: finalPromptSystemPrompt(),
        userPrompt: buildFinalPromptUserPrompt(requirementInput, answers),
      });
      setDiagnostics(response.diagnostics);

      const parsed = parseOptimizedPromptResult(response.content);
      setResult(parsed);
      setPhase("completed");
      const saved = await saveCurrentSession(parsed, response.diagnostics);
      setCurrentHistoryId(saved.id);
      await refreshHistory();
      setGlobalMessage({
        tone: "success",
        title: "最终 Prompt 已生成",
        description: "结果已保存到本地历史，可以复制或导出 Markdown。",
      });
    } catch (error) {
      setPhase("error");
      if (error instanceof Error && "diagnostics" in error) {
        setDiagnostics((error as { diagnostics: ApiDiagnostics }).diagnostics);
      }
      setGlobalMessage({
        tone: "error",
        title: "生成最终 Prompt 失败",
        description: normalizeErrorMessage(error),
      });
    }
  }

  async function saveCurrentSession(
    nextResult = result,
    nextDiagnostics = diagnostics,
  ): Promise<HistorySession> {
    const saved = await saveHistorySession({
      id: currentHistoryId ?? undefined,
      title: requirementInput.rawRequirement.trim().slice(0, 42) || "未命名需求",
      requirementInput,
      questions,
      answers,
      result: nextResult,
      diagnostics: nextDiagnostics,
      providerHint: nextDiagnostics?.providerHint,
    });
    return saved;
  }

  async function copyText(text: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(text);
      setGlobalMessage({
        tone: "success",
        title: successTitle,
        description: "内容已经复制到剪贴板。",
      });
    } catch {
      setGlobalMessage({
        tone: "error",
        title: "复制失败",
        description: "系统未能写入剪贴板。你可以手动选中文本复制。",
      });
    }
  }

  async function handleOpenHistory(id: string) {
    const session = await window.desktopApi?.history.get(id);
    if (!session) return;
    setCurrentHistoryId(session.id);
    setRequirementInput(session.requirementInput);
    setQuestions(session.questions);
    setAnswers(session.answers);
    setResult(session.result);
    setDiagnostics(session.diagnostics);
    setPhase("completed");
    setActiveStep("brief");
    setGlobalMessage({
      tone: "success",
      title: "历史会话已打开",
      description: "可以复制结果，也可以修改回答后重新生成。",
    });
  }

  async function handleDeleteHistory(id: string) {
    await deleteHistorySession(id);
    if (currentHistoryId === id) {
      setCurrentHistoryId(null);
    }
    await refreshHistory();
  }

  async function handleExportCurrent() {
    if (!currentHistoryId) {
      const saved = await saveCurrentSession();
      setCurrentHistoryId(saved.id);
      await refreshHistory();
      await copyText(await exportHistoryMarkdown(saved.id), "Markdown 已复制");
      return;
    }
    await copyText(await exportHistoryMarkdown(currentHistoryId), "Markdown 已复制");
  }

  function clearSession() {
    setRequirementInput(defaultRequirementInput);
    setQuestions([]);
    setAnswers([]);
    setResult(defaultResult);
    setDiagnostics(null);
    setCurrentHistoryId(null);
    setPhase(hasConfig ? "ready" : "idle");
    setActiveStep("input");
    setGlobalMessage({
      tone: "neutral",
      title: "会话已清空",
      description: "模型配置和保存的 API Key 不受影响。",
    });
  }

  function applyPreset(providerPresetId: ProviderPresetId) {
    const preset = providerPresets.find((item) => item.id === providerPresetId);
    if (!preset) return;
    setApiConfig((current) => ({
      ...current,
      providerPresetId,
      baseUrl: preset.baseUrl || current.baseUrl,
      model: preset.model || current.model,
    }));
  }

  const currentStepContent = (() => {
    switch (activeStep) {
      case "connection":
        return (
          <ConnectionStage
            value={apiConfig}
            savedKeyAvailable={savedKeyAvailable}
            disabled={phase === "testingConnection"}
            onChange={setApiConfig}
            onPresetChange={applyPreset}
            onTestConnection={handleTestConnection}
            onSaveApiKey={handleSaveApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onSaveSettings={() => persistSettings()}
          />
        );
      case "input":
        return (
          <RequirementForm
            value={requirementInput}
            disabled={phase === "generatingQuestions" || phase === "generatingPrompt"}
            onChange={setRequirementInput}
            onGenerateQuestions={handleGenerateQuestions}
          />
        );
      case "clarify":
        return (
          <ClarifyingQuestionsPanel
            questions={questions}
            answers={answers}
            disabled={phase === "generatingPrompt"}
            onChange={setAnswers}
            onGeneratePrompt={handleGeneratePrompt}
          />
        );
      case "brief":
        return result.finalPromptMarkdown ? (
          <div className="grid gap-5">
            <ResultPanel
              finalPromptMarkdown={result.finalPromptMarkdown}
              improvementNotesMarkdown={result.improvementNotesMarkdown}
              onCopyPrompt={() => copyText(result.finalPromptMarkdown, "Prompt 已复制")}
              onCopyNotes={() =>
                copyText(result.improvementNotesMarkdown, "优化说明已复制")
              }
              onClear={clearSession}
            />
            <ComparisonPanel
              rawRequirement={requirementInput.rawRequirement}
              finalPromptMarkdown={result.finalPromptMarkdown}
            />
          </div>
        ) : (
          <EmptyBrief onGoClarify={() => setActiveStep("clarify")} />
        );
      case "history":
        return (
          <HistoryStage
            items={history}
            onOpen={handleOpenHistory}
            onDelete={handleDeleteHistory}
          />
        );
      default:
        return null;
    }
  })();

  if (!desktopMode) {
    return (
      <div className="min-h-screen bg-paper p-6 text-ink">
        <div className="mx-auto max-w-2xl rounded-3xl border border-amberline/25 bg-vellum p-6 shadow-soft">
          <p className="eyebrow">Desktop Required</p>
          <h1 className="mt-2 text-2xl font-semibold">请使用桌面端启动</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            当前版本的模型请求、历史记录和密钥保存依赖 Electron 主进程。开发时请运行
            <code className="mx-1 rounded bg-ink/8 px-1.5 py-0.5">npm run dev:desktop</code>。
          </p>
        </div>
      </div>
    );
  }

  return (
    <DesktopShell
      steps={steps}
      activeStep={activeStep}
      onStepChange={setActiveStep}
      headerAction={
        <button type="button" onClick={clearSession} className="ghost-button gap-2">
          <RotateCcw className="h-4 w-4" />
          新建会话
        </button>
      }
      status={globalMessage}
      diagnostics={diagnostics}
      history={history}
      currentResult={result}
      onCopyDiagnostics={() =>
        copyText(JSON.stringify(diagnostics, null, 2), "诊断信息已复制")
      }
      onOpenHistory={handleOpenHistory}
      onDeleteHistory={handleDeleteHistory}
      onCopyPrompt={() => copyText(result.finalPromptMarkdown, "Prompt 已复制")}
      onExportCurrent={handleExportCurrent}
    >
      {currentStepContent}
    </DesktopShell>
  );
}

type ConnectionStageProps = {
  value: DesktopApiConfig;
  savedKeyAvailable: boolean;
  disabled: boolean;
  onChange: (value: DesktopApiConfig) => void;
  onPresetChange: (id: ProviderPresetId) => void;
  onTestConnection: () => void;
  onSaveApiKey: () => void;
  onDeleteApiKey: () => void;
  onSaveSettings: () => void;
};

function ConnectionStage({
  value,
  savedKeyAvailable,
  disabled,
  onChange,
  onPresetChange,
  onTestConnection,
  onSaveApiKey,
  onDeleteApiKey,
  onSaveSettings,
}: ConnectionStageProps) {
  const selectedPreset = providerPresets.find((preset) => preset.id === value.providerPresetId);

  return (
    <section className="grid gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Connection</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            连接模型服务
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            桌面端会从主进程发起请求，绕开浏览器 CORS 限制；API Key 默认不保存。
          </p>
        </div>
        <SlidersHorizontal className="h-6 w-6 text-moss" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="grid gap-2">
          {providerPresets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                value.providerPresetId === preset.id
                  ? "border-moss/35 bg-moss/10"
                  : "border-ink/8 bg-white/55 hover:border-moss/20"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{preset.name}</p>
              <p className="mt-1 text-xs leading-5 text-ink/52">{preset.note}</p>
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white/55 p-5">
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-moss/15 bg-moss/8 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-moss" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {savedKeyAvailable ? "已保存 API Key" : "尚未保存 API Key"}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink/62">
                {savedKeyAvailable
                  ? "界面不会回显明文。输入新的 Key 可替换保存。"
                  : "你可以只在本次会话输入，也可以保存到系统安全凭据。"}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">服务商预设</span>
              <select
                value={value.providerPresetId}
                onChange={(event) => onPresetChange(event.target.value as ProviderPresetId)}
                className="field"
              >
                {providerPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              {selectedPreset ? (
                <span className="text-xs leading-5 text-ink/50">{selectedPreset.note}</span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Base URL</span>
              <input
                type="url"
                value={value.baseUrl}
                onChange={(event) => onChange({ ...value, baseUrl: event.target.value })}
                placeholder="https://api.openai.com/v1"
                className="field"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">API Key</span>
              <input
                type="password"
                value={value.apiKey}
                onChange={(event) => onChange({ ...value, apiKey: event.target.value })}
                placeholder={savedKeyAvailable ? "已保存，可留空继续使用" : "sk-..."}
                className="field"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Model</span>
                <input
                  type="text"
                  value={value.model}
                  onChange={(event) => onChange({ ...value, model: event.target.value })}
                  className="field"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-ink">Temperature</span>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={value.temperature}
                  onChange={(event) =>
                    onChange({ ...value, temperature: Number(event.target.value || 0) })
                  }
                  className="field"
                />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-ink/8 bg-vellum/65 p-4">
              <input
                type="checkbox"
                checked={value.rememberConfig}
                onChange={(event) =>
                  onChange({ ...value, rememberConfig: event.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-ink/20 text-moss focus:ring-moss"
              />
              <span className="text-sm leading-6 text-ink/68">
                记住非敏感配置。API Key 只会在点击“安全保存 Key”时单独保存。
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onTestConnection}
                disabled={disabled}
                className="primary-button gap-2"
              >
                <KeyRound className="h-4 w-4" />
                测试连接
              </button>
              <button type="button" onClick={onSaveApiKey} className="accent-button gap-2">
                <ShieldCheck className="h-4 w-4" />
                安全保存 Key
              </button>
              <button type="button" onClick={onSaveSettings} className="ghost-button gap-2">
                <Save className="h-4 w-4" />
                保存配置
              </button>
              {savedKeyAvailable ? (
                <button type="button" onClick={onDeleteApiKey} className="ghost-button">
                  删除保存的 Key
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyBrief({ onGoClarify }: { onGoClarify: () => void }) {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-ink/16 bg-white/45 p-8 text-center">
      <div className="max-w-md">
        <p className="eyebrow">Ready Brief</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">还没有最终 Prompt</h2>
        <p className="mt-3 text-sm leading-6 text-ink/62">
          先完成需求输入和澄清问题，再生成可复制给 Agent 的任务书。
        </p>
        <button type="button" onClick={onGoClarify} className="primary-button mt-5">
          前往澄清问题
        </button>
      </div>
    </section>
  );
}

function HistoryStage({
  items,
  onOpen,
  onDelete,
}: {
  items: HistorySummary[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <p className="eyebrow">Local Sessions</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">本地历史会话</h2>
      <div className="mt-5 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-ink/8 bg-white/60 p-4"
            >
              <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 text-left">
                <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {new Date(item.updatedAt).toLocaleString()}
                  {item.providerHint ? ` / ${item.providerHint}` : ""}
                </p>
              </button>
              <button type="button" onClick={() => onDelete(item.id)} className="ghost-button">
                删除
              </button>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/16 bg-white/45 p-8 text-sm leading-6 text-ink/60">
            还没有历史记录。生成最终 Prompt 后，桌面端会自动保存一份本地会话。
          </div>
        )}
      </div>
    </section>
  );
}

export default App;
