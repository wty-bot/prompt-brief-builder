import { describe, expect, it } from "vitest";

import { normalizeErrorMessage } from "./errors";

describe("normalizeErrorMessage", () => {
  it("maps auth errors", () => {
    expect(normalizeErrorMessage(new Error("401 unauthorized"))).toContain("认证失败");
  });

  it("maps not found errors", () => {
    expect(normalizeErrorMessage(new Error("404 not found"))).toContain("请求路径不存在");
  });

  it("maps cors errors", () => {
    expect(normalizeErrorMessage(new Error("cors blocked"))).toContain("CORS");
  });
});
