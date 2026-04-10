import crypto from "crypto";

/** 注册 / OAuth 等场景默认展示名：游客 + 8 位十六进制 */
export function generateVisitorDisplayName(): string {
  const suffix = crypto.randomBytes(4).toString("hex");
  return `游客${suffix}`;
}
