import type { ApiConfig } from "../types/app";

const STORAGE_KEY = "ai-requirement-optimizer-config";

type StoredConfig = Pick<ApiConfig, "baseUrl" | "model" | "temperature" | "rememberConfig">;

export function loadStoredConfig(): StoredConfig | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return null;
  }
}

export function saveStoredConfig(config: ApiConfig) {
  const safeConfig: StoredConfig = {
    baseUrl: config.baseUrl,
    model: config.model,
    temperature: config.temperature,
    rememberConfig: config.rememberConfig,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
}

export function clearStoredConfig() {
  window.localStorage.removeItem(STORAGE_KEY);
}
