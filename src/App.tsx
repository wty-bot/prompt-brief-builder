import { useEffect, useMemo, useState } from "react";

import { ApiConfigPanel } from "./components/ApiConfigPanel";
import { AppHeader } from "./components/AppHeader";
import { ClarifyingQuestionsPanel } from "./components/ClarifyingQuestionsPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { RequirementForm } from "./components/RequirementForm";
import { ResultPanel } from "./components/ResultPanel";
import { StatusCallout } from "./components/StatusCallout";
import { normalizeErrorMessage } from "./lib/errors";
import {
  buildClarifyingQuestionsUserPrompt,
  buildFinalPromptUserPrompt,
  clarifyingQuestionsSystemPrompt,
  finalPromptSystemPrompt,
} from "./lib/promptTemplates";
import {
  generateChatCompletion,
  testConnection,
} from "./lib/openaiCompatibleClient";
import {
  parseClarifyingQuestions,
  parseOptimizedPromptResult,
} from "./lib/responseParsers";
import {
  clearStoredConfig,
  loadStoredConfig,
  saveStoredConfig,
} from "./lib/storage";
import type {
  ApiConfig,
  AppPhase,
  ClarifyingAnswer,
  ClarifyingQuestion,
  OptimizedPromptResult,
  RequirementInput,
} from "./types/app";

const defaultApiConfig: ApiConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.4,
  rememberConfig: false,
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
  const storedConfig = useMemo(() => loadStoredConfig(), []);

  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    ...defaultApiConfig,
    ...storedConfig,
  });
  const [requirementInput, setRequirementInput] =
    useState<RequirementInput>(defaultRequirementInput);
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<ClarifyingAnswer[]>([]);
  const [result, setResult] = useState<OptimizedPromptResult>(defaultResult);
  const [connectionMessage, setConnectionMessage] = useState(
    "请先填写 Base URL、API Key 和 Model，再测试连接。",
  );
  const [connectionTone, setConnectionTone] = useState<NoticeTone>("neutral");
  const [globalMessage, setGlobalMessage] = useState<{
    tone: NoticeTone;
    title: string;
    description: string;
  } | null>({
    tone: "warning",
    title: "浏览器直连限制",
    description:
      "当前版本完全在前端运行，适合快速验证思路；如果你的服务商不允许浏览器跨域访问，页面会提示 CORS 相关错误。",
  });

  useEffect(() => {
    if (apiConfig.rememberConfig) {
      saveStoredConfig(apiConfig);
      return;
    }

    clearStoredConfig();
  }, [apiConfig]);

  const hasConfig = Boolean(
    apiConfig.baseUrl.trim() && apiConfig.apiKey.trim() && apiConfig.model.trim(),
  );

  async function handleTestConnection() {
    if (!hasConfig) {
      setConnectionTone("warning");
      setConnectionMessage("请先完整填写 Base URL、API Key 和 Model。");
      return;
    }

    try {
      setPhase("testingConnection");
      setConnectionTone("neutral");
      setConnectionMessage("正在测试连接，请稍候...");
      await testConnection(apiConfig);
      setPhase("ready");
      setConnectionTone("success");
      setConnectionMessage("连接成功：当前配置可以正常拿到模型响应。");
      setGlobalMessage({
        tone: "success",
        title: "连接已就绪",
        description: "现在可以生成澄清问题，开始把原始需求整理成结构化 Prompt。",
      });
    } catch (error) {
      setPhase("error");
      setConnectionTone("error");
      setConnectionMessage(normalizeErrorMessage(error));
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
        description: "至少先输入一句你现在的想法，AI 才能判断应该追问什么。",
      });
      return;
    }

    if (!hasConfig) {
      setGlobalMessage({
        tone: "warning",
        title: "还缺模型配置",
        description: "请先填写 Base URL、API Key 和 Model。你可以先测试连接，也可以直接尝试生成问题。",
      });
      return;
    }

    try {
      setPhase("generatingQuestions");
      setGlobalMessage({
        tone: "neutral",
        title: "正在生成澄清问题",
        description: "AI 正在找出最影响执行质量的信息缺口。",
      });

      const content = await generateChatCompletion(
        apiConfig,
        clarifyingQuestionsSystemPrompt(),
        buildClarifyingQuestionsUserPrompt(requirementInput),
      );

      const payload = parseClarifyingQuestions(content);
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
        description: "把能回答的先补上，跳过也没关系；系统会在最终 Prompt 中明确哪些信息仍未确认。",
      });
    } catch (error) {
      setPhase("error");
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
      setGlobalMessage({
        tone: "neutral",
        title: "正在整理最终 Prompt",
        description: "AI 正在把原始需求与补充回答整合成可直接执行的 Markdown。",
      });

      const content = await generateChatCompletion(
        apiConfig,
        finalPromptSystemPrompt(),
        buildFinalPromptUserPrompt(requirementInput, answers),
      );

      const parsed = parseOptimizedPromptResult(content);
      setResult(parsed);
      setPhase("completed");
      setGlobalMessage({
        tone: "success",
        title: "最终 Prompt 已生成",
        description: "你现在可以直接复制结果交给 Agent，也可以再修改回答后重新生成。",
      });
    } catch (error) {
      setPhase("error");
      setGlobalMessage({
        tone: "error",
        title: "生成最终 Prompt 失败",
        description: normalizeErrorMessage(error),
      });
    }
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
        description: "浏览器未能写入剪贴板。你可以手动选中文本复制。",
      });
    }
  }

  function clearSession() {
    setRequirementInput(defaultRequirementInput);
    setQuestions([]);
    setAnswers([]);
    setResult(defaultResult);
    setPhase(hasConfig ? "ready" : "idle");
    setGlobalMessage({
      tone: "neutral",
      title: "会话已清空",
      description: "模型配置仍然保留在当前页面状态中，需求输入和结果已经清空。",
    });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AppHeader />

        {globalMessage ? (
          <StatusCallout
            tone={globalMessage.tone}
            title={globalMessage.title}
            description={globalMessage.description}
          />
        ) : null}

        <main className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="grid gap-6">
            <ApiConfigPanel
              value={apiConfig}
              disabled={phase === "testingConnection"}
              connectionMessage={connectionMessage}
              connectionTone={connectionTone}
              onChange={setApiConfig}
              onTestConnection={handleTestConnection}
            />

            <RequirementForm
              value={requirementInput}
              disabled={phase === "generatingQuestions" || phase === "generatingPrompt"}
              onChange={setRequirementInput}
              onGenerateQuestions={handleGenerateQuestions}
            />
          </div>

          <div className="grid gap-6">
            <ClarifyingQuestionsPanel
              questions={questions}
              answers={answers}
              disabled={phase === "generatingPrompt"}
              onChange={setAnswers}
              onGeneratePrompt={handleGeneratePrompt}
            />

            {result.finalPromptMarkdown ? (
              <ResultPanel
                finalPromptMarkdown={result.finalPromptMarkdown}
                improvementNotesMarkdown={result.improvementNotesMarkdown}
                onCopyPrompt={() =>
                  copyText(result.finalPromptMarkdown, "Prompt 已复制")
                }
                onCopyNotes={() =>
                  copyText(result.improvementNotesMarkdown, "优化说明已复制")
                }
                onClear={clearSession}
              />
            ) : null}
          </div>
        </main>

        <ComparisonPanel
          rawRequirement={requirementInput.rawRequirement}
          finalPromptMarkdown={result.finalPromptMarkdown}
        />

        <footer className="grid gap-4 rounded-[28px] border border-black/5 bg-white/60 p-6 text-sm leading-6 text-ink/70 shadow-soft backdrop-blur md:grid-cols-3">
          <div>
            <p className="font-semibold text-ink">隐私与安全</p>
            <p className="mt-2">
              API Key 默认不写入 localStorage；只有非敏感配置会在你主动勾选后保存到本地浏览器。
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">兼容说明</p>
            <p className="mt-2">
              当前版本按 OpenAI-compatible `/chat/completions` 协议请求，部分服务商可能需要你调整
              Base URL 或更换模型名。
            </p>
          </div>
          <div>
            <p className="font-semibold text-ink">部署方式</p>
            <p className="mt-2">
              项目适合直接部署到 GitHub Pages；如果后续想解决 CORS 或隐藏调用细节，可以再加代理层。
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
