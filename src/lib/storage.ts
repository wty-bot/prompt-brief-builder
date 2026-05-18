import type { ApiConfig } from "../types/app";
import { getTemperaturePreset } from "../shared/temperature";

const STORAGE_KEY = "ai-requirement-optimizer-config";

type StoredConfig = Pick<
  ApiConfig,
  "baseUrl" | "model" | "temperature" | "temperaturePreset" | "rememberConfig"
>;

export function loadStoredConfig(): StoredConfig | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredConfig>;
    if (!parsed.baseUrl || !parsed.model || typeof parsed.temperature !== "number") {
      return null;
    }

    return {
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      temperature: parsed.temperature,
      temperaturePreset:
        parsed.temperaturePreset ?? getTemperaturePreset(parsed.temperature),
      rememberConfig: Boolean(parsed.rememberConfig),
    };
  } catch {
    return null;
  }
}

export function saveStoredConfig(config: ApiConfig) {
  const safeConfig: StoredConfig = {
    baseUrl: config.baseUrl,
    model: config.model,
    temperature: config.temperature,
    temperaturePreset: config.temperaturePreset,
    rememberConfig: config.rememberConfig,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
}

export function clearStoredConfig() {
  window.localStorage.removeItem(STORAGE_KEY);
}
