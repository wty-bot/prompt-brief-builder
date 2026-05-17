import { AlertTriangle, ClipboardCopy } from "lucide-react";

import type { ApiDiagnostics } from "../types/app";

type DiagnosticsPanelProps = {
  diagnostics: ApiDiagnostics | null;
  onCopy?: () => void;
};

export function DiagnosticsPanel({ diagnostics, onCopy }: DiagnosticsPanelProps) {
  if (!diagnostics) {
    return null;
  }

  const isError = diagnostics.transport !== "ok" && diagnostics.transport !== "capability";

  return (
    <section
      className={`panel overflow-hidden border ${
        isError ? "border-oxblood/20" : "border-moss/20"
      }`}
    >
      <div className={`flex items-center justify-between gap-4 px-5 py-4 ${isError ? "bg-oxblood/8" : "bg-moss/8"}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`h-5 w-5 ${isError ? "text-oxblood" : "text-moss"}`} />
          <div>
            <p className="eyebrow">Diagnostics</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">请求诊断</h3>
          </div>
        </div>
        {onCopy ? (
          <button type="button" onClick={onCopy} className="ghost-button gap-2">
            <ClipboardCopy className="h-4 w-4" />
            复制诊断
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        <Info label="Provider" value={diagnostics.providerHint} />
        <Info label="Endpoint" value={diagnostics.endpoint} mono />
        <Info label="Context" value={diagnostics.context} />
        <Info label="Status" value={diagnostics.status ? `${diagnostics.status} ${diagnostics.statusText ?? ""}`.trim() : diagnostics.transport} />
        <Info label="Latency" value={`${diagnostics.elapsedMs} ms`} />
        <Info label="JSON Mode" value={diagnostics.usedJsonMode ? "enabled" : "off"} />
      </div>

      <div className="border-t border-ink/8 px-5 py-4">
        <p className="text-sm font-semibold text-ink">建议</p>
        <p className="mt-2 text-sm leading-6 text-ink/68">{diagnostics.suggestion}</p>
      </div>

      {diagnostics.responsePreview ? (
        <details className="border-t border-ink/8 px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            响应预览
          </summary>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-ink px-4 py-3 text-xs leading-6 text-vellum/78">
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
    <div className="rounded-2xl border border-ink/8 bg-white/55 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
        {label}
      </p>
      <p className={`mt-2 text-sm leading-6 text-ink ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}
