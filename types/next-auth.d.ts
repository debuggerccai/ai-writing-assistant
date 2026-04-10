import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      displayName: string;
      /** 登录方式，用于区分 GitHub OAuth 与邮箱密码 */
      provider?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    displayName?: string;
    provider?: string;
  }
}

