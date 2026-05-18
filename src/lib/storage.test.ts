import { beforeEach, describe, expect, it } from "vitest";

import { clearStoredConfig, loadStoredConfig, saveStoredConfig } from "./storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores only safe config fields", () => {
    saveStoredConfig({
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret-key",
      model: "test-model",
      temperature: 0.4,
      temperaturePreset: "medium",
      rememberConfig: true,
    });

    const stored = loadStoredConfig();
    expect(stored).toEqual({
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
      temperature: 0.4,
      temperaturePreset: "medium",
      rememberConfig: true,
    });

    expect(JSON.stringify(stored)).not.toContain("secret-key");
  });

  it("clears stored config", () => {
    saveStoredConfig({
      baseUrl: "https://api.example.com/v1",
      apiKey: "secret-key",
      model: "test-model",
      temperature: 0.4,
      temperaturePreset: "medium",
      rememberConfig: true,
    });

    clearStoredConfig();
    expect(loadStoredConfig()).toBeNull();
  });
});
