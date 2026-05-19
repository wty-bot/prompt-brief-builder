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
  LlmStreamEvent,
  LlmStreamRequest,
} from "../src/types/desktop.js";
import {
  buildEndpoint,
  buildRequestBody,
  createDiagnostics,
  createSuggestion,
  extractResponseContent,
  isCapabilityIssue,
  suggestVersionedBaseUrl,
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

const activeStreamControllers = new Map<
  string,
  {
    controller: AbortController;
    startedAt: number;
    partialContent: string;
    abortReason: "canceled" | "timeout" | "idle-timeout" | null;
  }
>();

let mainWindow: BrowserWindow | null = null;

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
    temperaturePreset: config.temperaturePreset,
    rememberConfig: config.rememberConfig,
  };
}

function createTransportError(message: string, diagnostics: ApiDiagnostics) {
  return new ApiRequestErrorClass(message, diagnostics);
}

function getElapsedMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}

function sendStreamEvent(sender: Electron.WebContents, event: LlmStreamEvent) {
  if (!sender.isDestroyed()) {
    sender.send("llm:stream-event", event);
  }
}

function extractStreamDelta(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const payload = value as {
    choices?: Array<{
      delta?: {
        content?: string | Array<{ text?: string; content?: string }>;
      };
      message?: {
        content?: string;
      };
      text?: string;
    }>;
    output_text?: string;
    text?: string;
  };
  const choice = payload.choices?.[0];
  const deltaContent = choice?.delta?.content;
  if (typeof deltaContent === "string") return deltaContent;
  if (Array.isArray(deltaContent)) {
    return deltaContent.map((part) => part.text ?? part.content ?? "").join("");
  }
  return choice?.message?.content ?? choice?.text ?? payload.output_text ?? payload.text ?? "";
}

function parseSseBuffer(buffer: string) {
  const events: string[] = [];
  const blocks = buffer.split(/\r?\n\r?\n/);
  const rest = blocks.pop() ?? "";

  for (const block of blocks) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (data) {
      events.push(data);
    }
  }

  return { events, rest };
}

function normalizeStreamContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return "";

  try {
    const payload = JSON.parse(trimmed) as ChatCompletionResponse;
    const extracted = extractResponseContent(payload);
    return extracted || trimmed;
  } catch {
    return trimmed;
  }
}

function isHtmlResponse(contentType: string, text: string) {
  return (
    contentType.includes("text/html") ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html[\s>]/i.test(text)
  );
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

    const content = extractResponseContent(payload);
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

    if (caught.diagnostics.transport === "parse") {
      const versionedBaseUrl = suggestVersionedBaseUrl(config.baseUrl);
      if (versionedBaseUrl) {
        return requestWithFallback(
          {
            ...config,
            baseUrl: versionedBaseUrl,
          },
          options,
        );
      }
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

async function runStreamingRequest(
  sender: Electron.WebContents,
  request: LlmStreamRequest,
  config: ApiConfig,
) {
  const startedAt = performance.now();
  let activeBaseUrl = config.baseUrl;
  const controller = new AbortController();
  const streamState = {
    controller,
    startedAt,
    partialContent: "",
    abortReason: null as "canceled" | "timeout" | "idle-timeout" | null,
  };
  activeStreamControllers.set(request.taskId, streamState);

  let idleTimer: NodeJS.Timeout | null = null;
  const totalTimer = setTimeout(() => {
    streamState.abortReason = "timeout";
    controller.abort();
  }, request.timeoutMs);
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      streamState.abortReason = "idle-timeout";
      controller.abort();
    }, request.idleTimeoutMs);
  };

  try {
    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "started",
      context: request.context,
      startedAt: new Date().toISOString(),
      streamEnabled: true,
      usedJsonMode: false,
    });
    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "phase",
      phase: "connecting",
      message: "正在连接模型服务...",
      elapsedMs: getElapsedMs(startedAt),
    });

    const fetchStream = (baseUrl: string) =>
      fetch(buildEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        ...buildRequestBody(
          config,
          [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          false,
        ),
        stream: true,
      }),
      signal: controller.signal,
      });

    resetIdleTimer();
    let response = await fetchStream(activeBaseUrl);

    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "phase",
      phase: "waiting",
      message: "模型已响应，正在等待内容...",
      elapsedMs: getElapsedMs(startedAt),
    });

    const initialContentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (response.ok && initialContentType.includes("text/html")) {
      const text = await response.text();
      const versionedBaseUrl = suggestVersionedBaseUrl(activeBaseUrl);
      if (versionedBaseUrl) {
        activeBaseUrl = versionedBaseUrl;
        sendStreamEvent(sender, {
          taskId: request.taskId,
          type: "phase",
          phase: "connecting",
          message: "当前 Base URL 返回网页，正在自动尝试 /v1 路径...",
          elapsedMs: getElapsedMs(startedAt),
        });
        response = await fetchStream(activeBaseUrl);
      } else {
        const diagnostics = createDiagnostics({
          context: request.context,
          baseUrl: activeBaseUrl,
          elapsedMs: getElapsedMs(startedAt),
          transport: "parse",
          usedJsonMode: false,
          status: response.status,
          statusText: response.statusText,
          responsePreview: text.slice(0, 500),
        });
        sendStreamEvent(sender, {
          taskId: request.taskId,
          type: "error",
          message: "服务返回的是网页，不是模型 API 响应。请检查 Base URL 是否应包含 /v1。",
          diagnostics,
          partialContent: streamState.partialContent,
          elapsedMs: getElapsedMs(startedAt),
        });
        return;
      }
    }

    if (!response.ok) {
      const text = await response.text();
      const versionedBaseUrl = suggestVersionedBaseUrl(activeBaseUrl);
      if ((response.status === 404 || isHtmlResponse(response.headers.get("content-type")?.toLowerCase() ?? "", text)) && versionedBaseUrl) {
        activeBaseUrl = versionedBaseUrl;
        sendStreamEvent(sender, {
          taskId: request.taskId,
          type: "phase",
          phase: "connecting",
          message: "当前路径不可用，正在自动尝试 /v1 路径...",
          elapsedMs: getElapsedMs(startedAt),
        });
        response = await fetchStream(activeBaseUrl);
      } else {
        const diagnostics = createDiagnostics({
          context: request.context,
          baseUrl: activeBaseUrl,
          elapsedMs: getElapsedMs(startedAt),
          transport: "http",
          usedJsonMode: false,
          status: response.status,
          statusText: response.statusText,
          responsePreview: text.slice(0, 500),
        });
        sendStreamEvent(sender, {
          taskId: request.taskId,
          type: "error",
          message: `${response.status} ${response.statusText || "请求失败"}`.trim(),
          diagnostics,
          partialContent: streamState.partialContent,
          elapsedMs: getElapsedMs(startedAt),
        });
        return;
      }
    }

    if (!response.ok) {
      const text = await response.text();
      const diagnostics = createDiagnostics({
        context: request.context,
        baseUrl: activeBaseUrl,
        elapsedMs: getElapsedMs(startedAt),
        transport: "http",
        usedJsonMode: false,
        status: response.status,
        statusText: response.statusText,
        responsePreview: text.slice(0, 500),
      });
      sendStreamEvent(sender, {
        taskId: request.taskId,
        type: "error",
        message: `${response.status} ${response.statusText || "请求失败"}`.trim(),
        diagnostics,
        partialContent: streamState.partialContent,
        elapsedMs: getElapsedMs(startedAt),
      });
      return;
    }

    const responseContentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (responseContentType.includes("text/html")) {
      const text = await response.text();
      const diagnostics = createDiagnostics({
        context: request.context,
        baseUrl: activeBaseUrl,
        elapsedMs: getElapsedMs(startedAt),
        transport: "parse",
        usedJsonMode: false,
        status: response.status,
        statusText: response.statusText,
        responsePreview: text.slice(0, 500),
      });
      sendStreamEvent(sender, {
        taskId: request.taskId,
        type: "error",
        message: "服务返回的是网页，不是模型 API 响应。请检查 Base URL。",
        diagnostics,
        partialContent: streamState.partialContent,
        elapsedMs: getElapsedMs(startedAt),
      });
      return;
    }

    if (!response.body) {
      const text = await response.text();
      streamState.partialContent = text;
      sendStreamEvent(sender, {
        taskId: request.taskId,
        type: "chunk",
        delta: text,
        content: text,
        elapsedMs: getElapsedMs(startedAt),
      });
    } else {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const isEventStream = contentType.includes("text/event-stream");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        resetIdleTimer();

        const raw = decoder.decode(value, { stream: true });
        buffer += raw;
        const { events, rest } = parseSseBuffer(buffer);
        buffer = rest;
        const looksLikeSse = isEventStream || buffer.trimStart().startsWith("data:");

        if (!looksLikeSse && !events.length && raw.trim()) {
          streamState.partialContent += raw;
          buffer = "";
          sendStreamEvent(sender, {
            taskId: request.taskId,
            type: "chunk",
            delta: raw,
            content: streamState.partialContent,
            elapsedMs: getElapsedMs(startedAt),
          });
          continue;
        }

        for (const eventText of events) {
          if (eventText === "[DONE]") continue;
          try {
            const payload = JSON.parse(eventText) as unknown;
            const delta = extractStreamDelta(payload);
            if (!delta) continue;
            streamState.partialContent += delta;
            sendStreamEvent(sender, {
              taskId: request.taskId,
              type: "chunk",
              delta,
              content: streamState.partialContent,
              elapsedMs: getElapsedMs(startedAt),
            });
          } catch {
            streamState.partialContent += eventText;
            sendStreamEvent(sender, {
              taskId: request.taskId,
              type: "chunk",
              delta: eventText,
              content: streamState.partialContent,
              elapsedMs: getElapsedMs(startedAt),
            });
          }
        }
      }

      if ((isEventStream || buffer.trimStart().startsWith("data:")) && buffer.trim()) {
        const { events } = parseSseBuffer(`${buffer}\n\n`);
        for (const eventText of events) {
          if (eventText === "[DONE]") continue;
          try {
            const payload = JSON.parse(eventText) as unknown;
            const delta = extractStreamDelta(payload);
            if (!delta) continue;
            streamState.partialContent += delta;
            sendStreamEvent(sender, {
              taskId: request.taskId,
              type: "chunk",
              delta,
              content: streamState.partialContent,
              elapsedMs: getElapsedMs(startedAt),
            });
          } catch {
            streamState.partialContent += eventText;
          }
        }
      } else if (buffer.trim()) {
        streamState.partialContent += buffer;
      }
    }

    streamState.partialContent = normalizeStreamContent(streamState.partialContent);

    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "phase",
      phase: "parsing",
      message: "内容接收完成，正在解析...",
      elapsedMs: getElapsedMs(startedAt),
    });

    const diagnostics = createDiagnostics({
      context: request.context,
      baseUrl: activeBaseUrl,
      elapsedMs: getElapsedMs(startedAt),
      transport: "ok",
      usedJsonMode: false,
      status: response.status,
      statusText: response.statusText,
      responsePreview: streamState.partialContent.slice(0, 500),
    });
    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "complete",
      content: streamState.partialContent,
      diagnostics,
      elapsedMs: getElapsedMs(startedAt),
    });
  } catch (error) {
    const reason = streamState.abortReason;
    if (reason === "canceled") {
      sendStreamEvent(sender, {
        taskId: request.taskId,
        type: "canceled",
        partialContent: streamState.partialContent,
        elapsedMs: getElapsedMs(startedAt),
      });
      return;
    }

    const diagnostics = createDiagnostics({
      context: request.context,
      baseUrl: activeBaseUrl,
      elapsedMs: getElapsedMs(startedAt),
      transport: reason ? "timeout" : "network",
      usedJsonMode: false,
      responsePreview: streamState.partialContent.slice(0, 500),
    });
    sendStreamEvent(sender, {
      taskId: request.taskId,
      type: "error",
      message:
        reason === "idle-timeout"
          ? "模型长时间没有继续返回内容。"
          : reason === "timeout"
            ? "请求超过最长等待时间。"
            : error instanceof Error
              ? error.message
              : "请求失败",
      diagnostics,
      partialContent: streamState.partialContent,
      elapsedMs: getElapsedMs(startedAt),
    });
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    clearTimeout(totalTimer);
    activeStreamControllers.delete(request.taskId);
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

  ipcMain.handle("llm:stream-start", async (event, request: LlmStreamRequest) => {
    return withIpcResult(async () => {
      const resolved = await resolveApiConfig(request.config);
      void runStreamingRequest(event.sender, request, resolved);
      return { taskId: request.taskId };
    });
  });

  ipcMain.handle("llm:stream-cancel", async (_event, taskId: string) => {
    const active = activeStreamControllers.get(taskId);
    if (active) {
      active.abortReason = "canceled";
      active.controller.abort();
    }
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
  mainWindow = new BrowserWindow({
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
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
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
