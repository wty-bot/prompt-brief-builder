import type { ChangeEvent } from "react";

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
    <section className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-soft backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">模型配置</h2>
          <p className="mt-1 text-sm leading-6 text-ink/65">
            使用 OpenAI-compatible API。首版按 `/chat/completions` 协议请求。
          </p>
        </div>
        <button
          type="button"
          onClick={onTestConnection}
          disabled={disabled}
          className="rounded-full border border-moss/20 bg-moss px-4 py-2 text-sm font-medium text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          测试连接
        </button>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">Base URL</span>
          <input
            type="url"
            value={value.baseUrl}
            onChange={(event) => onChange(updateStringField(value, "baseUrl", event))}
            placeholder="https://api.openai.com/v1"
            className="rounded-2xl border border-black/10 bg-paper/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-ink">API Key</span>
          <input
            type="password"
            value={value.apiKey}
            onChange={(event) => onChange(updateStringField(value, "apiKey", event))}
            placeholder="sk-..."
            className="rounded-2xl border border-black/10 bg-paper/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">Model</span>
            <input
              type="text"
              value={value.model}
              onChange={(event) => onChange(updateStringField(value, "model", event))}
              placeholder="gpt-4o-mini"
              className="rounded-2xl border border-black/10 bg-paper/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">Temperature</span>
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
              className="rounded-2xl border border-black/10 bg-paper/60 px-4 py-3 text-sm text-ink outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            />
          </label>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-paper/40 p-4">
          <input
            type="checkbox"
            checked={value.rememberConfig}
            onChange={(event) =>
              onChange({
                ...value,
                rememberConfig: event.target.checked,
              })
            }
            className="mt-1 h-4 w-4 rounded border-black/20 text-moss focus:ring-moss"
          />
          <span className="text-sm leading-6 text-ink/75">
            记住非敏感配置到当前浏览器。首版不会保存 API Key，只会保存 Base URL、Model、Temperature
            和这个开关状态。
          </span>
        </label>

        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
            connectionTone === "success"
              ? "border-moss/20 bg-moss/5 text-ink"
              : connectionTone === "error"
                ? "border-red-500/20 bg-red-50 text-red-900"
                : connectionTone === "warning"
                  ? "border-amberline/20 bg-amberline/10 text-ink"
                  : "border-black/10 bg-white/60 text-ink/70"
          }`}
        >
          {connectionMessage}
        </div>
      </div>
    </section>
  );
}
