import type { ChangeEvent } from "react";
import { ChevronDown, KeyRound, PlugZap } from "lucide-react";

import type { ApiConfig } from "../types/app";

type ApiConfigPanelProps = {
  value: ApiConfig;
  disabled?: boolean;
  connectionMessage: string;
  connectionTone: "neutral" | "success" | "warning" | "error";
  onChange: (value: ApiConfig) => void;
  onTestConnection: () => void;
};

function updateStringField(
  config: ApiConfig,
  key: keyof Pick<ApiConfig, "baseUrl" | "apiKey" | "model">,
  event: ChangeEvent<HTMLInputElement>,
) {
  return {
    ...config,
    [key]: event.target.value,
  };
}

export function ApiConfigPanel({
  value,
  disabled,
  connectionMessage,
  connectionTone,
  onChange,
  onTestConnection,
}: ApiConfigPanelProps) {
  return (
    <details className="panel group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-vellum shadow-soft">
            <PlugZap className="h-5 w-5" />
          </span>
          <div>
            <p className="eyebrow">Connection</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">
              连接模型
            </h2>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 text-ink/40 transition group-open:rotate-180" />
      </summary>

      <div className="border-t border-ink/8 px-5 pb-5 pt-1">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-3xl border border-ink/8 bg-paper/55 p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 text-moss" />
            <p className="text-sm leading-6 text-ink/68">
              默认不保存 API Key。勾选记住配置时，也只保存 Base URL、Model 和温度。
            </p>
          </div>
          <button
            type="button"
            onClick={onTestConnection}
            disabled={disabled}
            className="ghost-button shrink-0"
          >
            测试连接
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">Base URL</span>
            <input
              type="url"
              value={value.baseUrl}
              onChange={(event) => onChange(updateStringField(value, "baseUrl", event))}
              placeholder="https://api.openai.com/v1"
              className="field"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-ink">API Key</span>
            <input
              type="password"
              value={value.apiKey}
              onChange={(event) => onChange(updateStringField(value, "apiKey", event))}
              placeholder="sk-..."
              className="field"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Model</span>
              <input
                type="text"
                value={value.model}
                onChange={(event) => onChange(updateStringField(value, "model", event))}
                placeholder="gpt-4o-mini"
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
                  onChange({
                    ...value,
                    temperature: Number(event.target.value || 0),
                  })
                }
                className="field"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-ink/8 bg-white/55 p-4">
            <input
              type="checkbox"
              checked={value.rememberConfig}
              onChange={(event) =>
                onChange({
                  ...value,
                  rememberConfig: event.target.checked,
                })
              }
              className="mt-1 h-4 w-4 rounded border-ink/20 text-moss focus:ring-moss"
            />
            <span className="text-sm leading-6 text-ink/68">
              记住非敏感配置到当前浏览器。不会保存 API Key。
            </span>
          </label>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
              connectionTone === "success"
                ? "border-moss/20 bg-moss/8 text-ink"
                : connectionTone === "error"
                  ? "border-oxblood/20 bg-oxblood/8 text-oxblood"
                  : connectionTone === "warning"
                    ? "border-amberline/20 bg-amberline/10 text-ink"
                    : "border-ink/10 bg-white/55 text-ink/68"
            }`}
          >
            {connectionMessage}
          </div>
        </div>
      </div>
    </details>
  );
}
