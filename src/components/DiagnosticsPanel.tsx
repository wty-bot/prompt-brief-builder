import { AlertTriangle } from "lucide-react";

import { CopyFeedbackButton, type CopyAction } from "./CopyFeedbackButton";
import type { ApiDiagnostics } from "../types/app";

type DiagnosticsPanelProps = {
  diagnostics: ApiDiagnostics | null;
  onCopy?: CopyAction;
};

export function DiagnosticsPanel({ diagnostics, onCopy }: DiagnosticsPanelProps) {
  if (!diagnostics) {
    return (
      <section className="rounded-2xl border border-dashed border-black/12 bg-white p-4 text-sm leading-6 text-ink/58">
        还没有请求诊断。测试连接或生成内容后，这里会显示状态、耗时和修复建议。
      </section>
    );
  }

  const isError = diagnostics.transport !== "ok" && diagnostics.transport !== "capability";
  const fields = [
    ["服务商", diagnostics.providerHint],
    ["请求地址", diagnostics.endpoint],
    ["当前步骤", formatContext(diagnostics.context)],
    [
      "请求状态",
      diagnostics.status
        ? `${diagnostics.status} ${diagnostics.statusText ?? ""}`.trim()
        : formatTransport(diagnostics.transport),
    ],
    ["耗时", formatElapsed(diagnostics.elapsedMs)],
    ["JSON 模式", diagnostics.usedJsonMode ? "已启用" : "未启用"],
  ] as const;

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
        isError ? "border-oxblood/20" : "border-moss/20"
      }`}
    >
      <div className={`flex items-center justify-between gap-3 px-4 py-3 ${isError ? "bg-oxblood/8" : "bg-[#0071e3]/8"}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${isError ? "text-oxblood" : "text-moss"}`} />
          <div>
            <p className="eyebrow">Diagnostics</p>
            <h3 className="mt-1 text-base font-semibold text-ink">请求诊断</h3>
          </div>
        </div>
        {onCopy ? (
          <CopyFeedbackButton onCopy={onCopy} className="min-h-9 gap-2 px-3 text-xs" />
        ) : null}
      </div>

      <div className="grid gap-2 p-4">
        {fields.map(([label, value]) => (
          <Info key={label} label={label} value={value} mono={label === "请求地址"} />
        ))}
      </div>

      <div className="border-t border-black/8 px-4 py-3">
        <p className="text-sm font-semibold text-ink">建议</p>
        <p className="mt-2 text-sm leading-6 text-ink/68">{diagnostics.suggestion}</p>
      </div>

      {diagnostics.responsePreview ? (
        <details className="border-t border-black/8 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink/72">
            查看技术响应
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink px-3 py-3 text-xs leading-5 text-vellum/78">
            {diagnostics.responsePreview}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/8 bg-[#f5f5f7] px-3 py-2.5">
      <p className="text-xs font-semibold text-ink/48">
        {label}
      </p>
      <p className={`mt-1 text-sm leading-5 text-ink ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function formatContext(context: ApiDiagnostics["context"]) {
  const labels: Record<ApiDiagnostics["context"], string> = {
    "connection-test": "测试连接",
    "format-optimization": "格式优化",
    "clarify-questions": "生成澄清问题",
    "brainstorm-turn": "头脑风暴",
    "brainstorm-finalize": "收束需求",
    "compose-brief": "生成最终 Prompt",
  };
  return labels[context];
}

function formatTransport(transport: ApiDiagnostics["transport"]) {
  const labels: Record<ApiDiagnostics["transport"], string> = {
    ok: "请求成功",
    capability: "兼容模式成功",
    network: "网络错误",
    timeout: "请求超时",
    http: "服务端拒绝",
    parse: "解析失败",
    cors: "浏览器跨域限制",
  };
  return labels[transport];
}

function formatElapsed(ms: number) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)} 秒`;
  }
  return `${ms} 毫秒`;
}
