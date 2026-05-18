import { contextBridge, ipcRenderer } from "electron";

import type {
  ApiDiagnostics,
} from "../src/types/app.js";
import {
  ApiRequestError as ApiRequestErrorClass,
} from "../src/types/app.js";
import type {
  DesktopApi,
  DesktopApiConfig,
  DesktopSettings,
  HistorySession,
  LlmGenerateRequest,
  LlmStreamEvent,
  LlmStreamRequest,
} from "../src/types/desktop.js";

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

async function invokeResult<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcSuccess<T> | IpcFailure;
  if (result.ok) {
    return result.data;
  }

  if (result.error.diagnostics) {
    throw new ApiRequestErrorClass(result.error.message, result.error.diagnostics);
  }

  throw new Error(result.error.message);
}

const desktopApi: DesktopApi = {
  connection: {
    test: (config: DesktopApiConfig) => invokeResult("connection:test", config),
  },
  llm: {
    generate: (request: LlmGenerateRequest) => invokeResult("llm:generate", request),
    startStream: (request: LlmStreamRequest) => invokeResult("llm:stream-start", request),
    cancelStream: (taskId: string) => ipcRenderer.invoke("llm:stream-cancel", taskId),
    onStreamEvent: (listener: (event: LlmStreamEvent) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, streamEvent: LlmStreamEvent) => {
        listener(streamEvent);
      };
      ipcRenderer.on("llm:stream-event", handler);
      return () => ipcRenderer.removeListener("llm:stream-event", handler);
    },
  },
  settings: {
    load: () => ipcRenderer.invoke("settings:load"),
    save: (settings: DesktopSettings) => ipcRenderer.invoke("settings:save", settings),
    clear: () => ipcRenderer.invoke("settings:clear"),
  },
  secrets: {
    saveApiKey: (apiKey: string) => ipcRenderer.invoke("secrets:save-api-key", apiKey),
    deleteApiKey: () => ipcRenderer.invoke("secrets:delete-api-key"),
    hasSavedApiKey: () => ipcRenderer.invoke("secrets:has-saved-api-key"),
  },
  history: {
    list: () => ipcRenderer.invoke("history:list"),
    get: (id: string) => ipcRenderer.invoke("history:get", id),
    save: (session: Omit<HistorySession, "id" | "createdAt" | "updatedAt"> & { id?: string }) =>
      ipcRenderer.invoke("history:save", session),
    delete: (id: string) => ipcRenderer.invoke("history:delete", id),
    exportMarkdown: (id: string) => ipcRenderer.invoke("history:export-markdown", id),
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
