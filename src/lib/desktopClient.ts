import { ApiRequestError } from "../types/app";
import type { ApiCallResult } from "../types/app";
import type {
  DesktopApiConfig,
  DesktopSettings,
  HistorySession,
  LlmGenerateRequest,
} from "../types/desktop";

function requireDesktopApi() {
  if (!window.desktopApi) {
    throw new Error("当前运行环境不是桌面端，无法使用桌面能力。");
  }
  return window.desktopApi;
}

export function isDesktopRuntime() {
  return Boolean(window.desktopApi);
}

export async function loadDesktopSettings() {
  return requireDesktopApi().settings.load();
}

export async function saveDesktopSettings(settings: DesktopSettings) {
  await requireDesktopApi().settings.save(settings);
}

export async function clearDesktopSettings() {
  await requireDesktopApi().settings.clear();
}

export async function hasSavedApiKey() {
  return requireDesktopApi().secrets.hasSavedApiKey();
}

export async function saveApiKey(apiKey: string) {
  await requireDesktopApi().secrets.saveApiKey(apiKey);
}

export async function deleteSavedApiKey() {
  await requireDesktopApi().secrets.deleteApiKey();
}

export async function testDesktopConnection(config: DesktopApiConfig): Promise<ApiCallResult> {
  try {
    return await requireDesktopApi().connection.test(config);
  } catch (error) {
    throw normalizeDesktopError(error);
  }
}

export async function generateDesktopChatCompletion(
  request: LlmGenerateRequest,
): Promise<ApiCallResult> {
  try {
    return await requireDesktopApi().llm.generate(request);
  } catch (error) {
    throw normalizeDesktopError(error);
  }
}

export async function listHistory() {
  return requireDesktopApi().history.list();
}

export async function getHistorySession(id: string) {
  return requireDesktopApi().history.get(id);
}

export async function saveHistorySession(
  session: Omit<HistorySession, "id" | "createdAt" | "updatedAt"> & { id?: string },
) {
  return requireDesktopApi().history.save(session);
}

export async function deleteHistorySession(id: string) {
  await requireDesktopApi().history.delete(id);
}

export async function exportHistoryMarkdown(id: string) {
  return requireDesktopApi().history.exportMarkdown(id);
}

function normalizeDesktopError(error: unknown) {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "diagnostics" in error &&
    "message" in error
  ) {
    return new ApiRequestError(
      String((error as { message: unknown }).message),
      (error as ApiRequestError).diagnostics,
    );
  }

  return error;
}
