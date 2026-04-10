import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateVisitorDisplayName } from "@/lib/auth/generateDisplayName";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * 邮箱 + 密码：已注册则校验密码，未注册则自动创建账号后再由客户端 signIn("credentials")。
 */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "参数校验失败", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      const passwordHash = await hashPassword(password);
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: generateVisitorDisplayName(),
        },
      });
      return NextResponse.json({ success: true, created: true });
    }

    if (!existing.passwordHash) {
      return NextResponse.json(
        { error: "该邮箱已通过第三方登录绑定，请使用 GitHub 等方式登录" },
        { status: 409 }
      );
    }

    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    return NextResponse.json({ success: true, created: false });
  } catch (error) {
    console.error("[AUTH_SIGN_IN_OR_UP_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
