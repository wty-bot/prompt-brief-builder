export function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (/401|403|认证|unauthorized|forbidden/i.test(message)) {
      return "认证失败：请检查 API Key 是否正确，以及当前服务商是否允许该模型访问。";
    }

    if (/404|not found/i.test(message)) {
      return "请求路径不存在：请检查 Base URL 是否正确，或该服务商是否兼容 /chat/completions 路径。";
    }

    if (/cors/i.test(message)) {
      return "浏览器被 CORS 阻止：当前服务商可能不允许前端直连。可以更换支持浏览器请求的服务，或后续接入代理模式。";
    }

    if (/timeout/i.test(message)) {
      return "请求超时：请稍后重试，或更换响应更快的模型。";
    }

    return message;
  }

  return "发生未知错误，请稍后重试。";
}
