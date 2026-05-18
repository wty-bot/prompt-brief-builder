import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Square,
} from "lucide-react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";
import type { ApiDiagnostics, ApiCallContext } from "../types/app";

export type GenerationTaskView = {
  taskId: string;
  context: Exclude<ApiCallContext, "connection-test">;
  status: "starting" | "connecting" | "waiting" | "streaming" | "parsing" | "completed" | "error" | "canceled";
  title: string;
  message: string;
  elapsedMs: number;
  partialContent: string;
  streamEnabled: boolean;
  usedJsonMode: boolean;
  diagnostics: ApiDiagnostics | null;
  errorMessage?: string;
};

type GenerationTaskPanelProps = {
  task: GenerationTaskView | null;
  onCancel: () => void;
  onRetry: () => void;
  onCopyRaw: CopyAction;
  onCopyDiagnostics: CopyAction;
};

export function GenerationTaskPanel({
  task,
  onCancel,
  onRetry,
  onCopyRaw,
  onCopyDiagnostics,
}: GenerationTaskPanelProps) {
  if (!task) return null;

  const isRunning = ["starting", "connecting", "waiting", "streaming", "parsing"].includes(
    task.status,
  );
  const isError = task.status === "error";
  const canShowTechnicalDetails =
    task.status === "error" || task.status === "canceled" || isRunning;

  return (
    <section
      className={`relative isolate overflow-hidden rounded-2xl border bg-white/96 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-xl ${
        isError
          ? "border-oxblood/25"
          : task.status === "completed"
            ? "border-moss/20"
            : "border-amberline/25"
      }`}
    >
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isError
                ? "bg-oxblood text-white"
                : task.status === "completed"
                  ? "bg-moss text-white"
                  : "bg-amberline text-white"
            }`}
          >
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isError ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
              Generation Task
            </p>
            <h3 className="mt-1 text-base font-semibold text-ink">{task.title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/66">
              {isError ? task.errorMessage ?? task.message : task.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/52">
              <span className="rounded-full border border-ink/10 bg-white/55 px-2.5 py-1">
                {(task.elapsedMs / 1000).toFixed(1)}s
              </span>
              <span className="rounded-full border border-ink/10 bg-white/55 px-2.5 py-1">
                {task.streamEnabled ? "流式响应" : "普通响应"}
              </span>
              <span className="rounded-full border border-ink/10 bg-white/55 px-2.5 py-1">
                {task.usedJsonMode ? "JSON 模式" : "普通模式"}
              </span>
              {task.partialContent && isRunning ? (
                <span className="rounded-full border border-ink/10 bg-white/55 px-2.5 py-1">
                  已接收 {task.partialContent.length} 字
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {isRunning ? (
            <button type="button" onClick={onCancel} className="ghost-button min-h-9 gap-2 px-3 text-xs">
              <Square className="h-4 w-4" />
              取消
            </button>
          ) : null}
          {isError || task.status === "canceled" ? (
            <button type="button" onClick={onRetry} className="primary-button min-h-9 gap-2 px-3 text-xs">
              <RotateCcw className="h-4 w-4" />
              重试
            </button>
          ) : null}
        </div>
      </div>

      {canShowTechnicalDetails ? (
        <details className="border-t border-ink/8 bg-white/92 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink/72">
            查看技术详情
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyFeedbackButton
              onCopy={onCopyRaw}
              label="复制原始响应"
              className="min-h-9 gap-2 px-3 text-xs"
            />
            {task.diagnostics ? (
              <CopyFeedbackButton
                onCopy={onCopyDiagnostics}
                label="复制诊断"
                className="min-h-9 gap-2 px-3 text-xs"
              />
            ) : null}
          </div>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink px-4 py-3 text-xs leading-6 text-vellum/82">
            {task.partialContent || "尚未收到模型内容。"}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
