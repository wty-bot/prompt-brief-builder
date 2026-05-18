import { app, BrowserWindow, ipcMain, safeStorage } from "electron";
import { mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import type {
  ApiCallResult,
  ApiConfig,
  ApiDiagnostics,
} from "../src/types/app.js";
import { ApiRequestError as ApiRequestErrorClass } from "../src/types/app.js";
import type {
  DesktopApiConfig,
  DesktopSettings,
  HistorySession,
  HistorySummary,
  LlmGenerateRequest,
} from "../src/types/desktop.js";
import {
  buildEndpoint,
  buildRequestBody,
  createDiagnostics,
  createSuggestion,
  isCapabilityIssue,
  type ChatCompletionResponse,
  type ChatMessage,
} from "../src/shared/openaiCore.js";
import { createHistoryMarkdown } from "../src/shared/historyExport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

type RequestOptions = {
  context: LlmGenerateRequest["context"] | "connection-test";
  systemPrompt: string;
  userPrompt: string;
};

type HistorySaveInput = Omit<HistorySession, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

type IpcSuccess<T> = {
  ok: true;
  data: T;
};

type IpcFailure = {
  ok: false;
  error: {
    name: string;
    message: string;
    diagnostics?: ApiDiagnostics;
  };
};

function getDataPaths() {
  const root = app.getPath("userData");
  return {
    root,
    settingsPath: path.join(root, "settings.json"),
    secretsPath: path.join(root, "secrets.json"),
    historyDir: path.join(root, "history"),
  };
}

async function ensureDataDirs() {
  const paths = getDataPaths();
  await mkdir(paths.historyDir, { recursive: true });
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function encryptApiKey(apiKey: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("当前系统不可用安全凭据加密，无法保存 API Key。");
  }
  return safeStorage.encryptString(apiKey).toString("base64");
}

function decryptApiKey(encrypted: string) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("当前系统不可用安全凭据解密，无法读取已保存 API Key。");
  }
  return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
}

async function loadSavedApiKey() {
  const paths = getDataPaths();
  const saved = await readJson<{ apiKey: string }>(paths.secretsPath);
  if (!saved?.apiKey) return "";
  return decryptApiKey(saved.apiKey);
}

async function resolveApiConfig(config: DesktopApiConfig): Promise<ApiConfig> {
  const apiKey = config.apiKey.trim() || (await loadSavedApiKey());
  if (!apiKey) {
    const diagnostics = createDiagnostics({
      context: "connection-test",
      baseUrl: config.baseUrl,
      elapsedMs: 0,
      transport: "http",
      usedJsonMode: false,
      status: 401,
      statusText: "Missing API Key",
    });
    throw new ApiRequestErrorClass("请先输入 API Key，或在设置中保存一个 API Key。", diagnostics);
  }

  return {
    baseUrl: config.baseUrl,
    apiKey,
    model: config.model,
    temperature: config.temperature,
    rememberConfig: config.rememberConfig,
  };
}

function createTransportError(message: string, diagnostics: ApiDiagnostics) {
  return new ApiRequestErrorClass(message, diagnostics);
}

async function requestOnce(
  config: ApiConfig,
  options: RequestOptions,
  expectJson: boolean,
): Promise<ApiCallResult> {
  const endpoint = buildEndpoint(config.baseUrl);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: options.systemPrompt,
    },
    {
      role: "user",
      content: options.userPrompt,
    },
  ];

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(config, messages, expectJson)),
      signal: controller.signal,
    });

    const text = await response.text();
    const elapsedMs = Math.round(performance.now() - start);
    const preview = text.slice(0, 500);

    let payload: ChatCompletionResponse | null = null;
    try {
      payload = JSON.parse(text) as ChatCompletionResponse;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "http",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      });
      const message =
        payload?.error?.message ??
        `${response.status} ${response.statusText || "请求失败"}`.trim();
      throw createTransportError(message, diagnostics);
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "parse",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      });
      throw createTransportError("模型返回了空内容。", diagnostics);
    }

    return {
      content,
      diagnostics: createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "ok",
        usedJsonMode: expectJson,
        status: response.status,
        statusText: response.statusText,
        responsePreview: preview,
      }),
    };
  } catch (error) {
    const elapsedMs = Math.round(performance.now() - start);

    if (error instanceof Error && error.name === "AbortError") {
      const diagnostics = createDiagnostics({
        context: options.context,
        baseUrl: config.baseUrl,
        elapsedMs,
        transport: "timeout",
        usedJsonMode: expectJson,
      });
      throw createTransportError("请求超时。", diagnostics);
    }

    if (error instanceof ApiRequestErrorClass) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "请求失败";
    const diagnostics = createDiagnostics({
      context: options.context,
      baseUrl: config.baseUrl,
      elapsedMs,
      transport: "network",
      usedJsonMode: expectJson,
    });
    throw createTransportError(message, diagnostics);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestWithFallback(
  config: ApiConfig,
  options: RequestOptions,
): Promise<ApiCallResult> {
  try {
    return await requestOnce(config, options, true);
  } catch (caught) {
    if (!(caught instanceof ApiRequestErrorClass)) {
      throw caught;
    }

    if (
      caught.diagnostics.transport !== "http" ||
      !isCapabilityIssue(caught.diagnostics.status, caught.diagnostics.responsePreview)
    ) {
      throw caught;
    }

    const fallback = await requestOnce(config, options, false);
    return {
      ...fallback,
      diagnostics: {
        ...fallback.diagnostics,
        transport: "capability",
        suggestion: createSuggestion("capability"),
      },
    };
  }
}

function historyPath(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(getDataPaths().historyDir, `${safeId}.json`);
}

function createSessionTitle(session: Pick<HistorySession, "requirementInput">) {
  const raw = session.requirementInput.rawRequirement.trim();
  return raw ? raw.slice(0, 42) : "未命名需求";
}

async function withIpcResult<T>(handler: () => Promise<T>): Promise<IpcSuccess<T> | IpcFailure> {
  try {
    return {
      ok: true,
      data: await handler(),
    };
  } catch (error) {
    if (error instanceof ApiRequestErrorClass) {
      return {
        ok: false,
        error: {
          name: error.name,
          message: error.message,
          diagnostics: error.diagnostics,
        },
      };
    }

    return {
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : "请求失败",
      },
    };
  }
}

async function registerIpc() {
  ipcMain.handle("connection:test", async (_event, config: DesktopApiConfig) => {
    return withIpcResult(async () => {
      const resolved = await resolveApiConfig(config);
      return requestWithFallback(resolved, {
        context: "connection-test",
        systemPrompt: "你是一个 API 连通性测试助手。只返回一个简短 JSON。",
        userPrompt: "请确认当前模型可以正常响应。",
      });
    });
  });

  ipcMain.handle("llm:generate", async (_event, request: LlmGenerateRequest) => {
    return withIpcResult(async () => {
      const resolved = await resolveApiConfig(request.config);
      return requestWithFallback(resolved, {
        context: request.context,
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
      });
    });
  });

  ipcMain.handle("settings:load", async () => {
    return readJson<DesktopSettings>(getDataPaths().settingsPath);
  });

  ipcMain.handle("settings:save", async (_event, settings: DesktopSettings) => {
    await writeJson(getDataPaths().settingsPath, settings);
  });

  ipcMain.handle("settings:clear", async () => {
    await rm(getDataPaths().settingsPath, { force: true });
  });

  ipcMain.handle("secrets:save-api-key", async (_event, apiKey: string) => {
    await writeJson(getDataPaths().secretsPath, {
      apiKey: encryptApiKey(apiKey),
      updatedAt: new Date().toISOString(),
    });
  });

  ipcMain.handle("secrets:delete-api-key", async () => {
    await rm(getDataPaths().secretsPath, { force: true });
  });

  ipcMain.handle("secrets:has-saved-api-key", async () => {
    const saved = await readJson<{ apiKey: string }>(getDataPaths().secretsPath);
    return Boolean(saved?.apiKey);
  });

  ipcMain.handle("history:list", async () => {
    await ensureDataDirs();
    const files = await readdir(getDataPaths().historyDir);
    const sessions = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) => readJson<HistorySession>(path.join(getDataPaths().historyDir, file))),
    );
    return sessions
      .filter((session): session is HistorySession => Boolean(session))
      .map<HistorySummary>((session: HistorySession) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        providerHint: session.providerHint,
      }))
      .sort((a: HistorySummary, b: HistorySummary) => b.updatedAt.localeCompare(a.updatedAt));
  });

  ipcMain.handle("history:get", async (_event, id: string) => {
    return readJson<HistorySession>(historyPath(id));
  });

  ipcMain.handle(
    "history:save",
    async (
      _event,
      session: HistorySaveInput,
    ) => {
      await ensureDataDirs();
      const now = new Date().toISOString();
      const existing = session.id ? await readJson<HistorySession>(historyPath(session.id)) : null;
      const next: HistorySession = {
        ...session,
        id: session.id ?? crypto.randomUUID(),
        title: session.title || createSessionTitle(session),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await writeJson(historyPath(next.id), next);
      return next;
    },
  );

  ipcMain.handle("history:delete", async (_event, id: string) => {
    await rm(historyPath(id), { force: true });
  });

  ipcMain.handle("history:export-markdown", async (_event, id: string) => {
    const session = await readJson<HistorySession>(historyPath(id));
    if (!session) {
      throw new Error("历史记录不存在。");
    }
    return createHistoryMarkdown(session);
  });
}

async function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 720,
    title: "Prompt Brief Builder",
    backgroundColor: "#f4eee2",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
}

async function bootstrap() {
  await app.whenReady();
  await ensureDataDirs();
  await registerIpc();
  await createWindow();
}

void bootstrap();

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
