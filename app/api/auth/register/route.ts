import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateVisitorDisplayName } from "@/lib/auth/generateDisplayName";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const input = registerSchema.safeParse(json);
    if (!input.success) {
      return NextResponse.json(
        { error: "参数校验失败", issues: input.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = input.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    const displayName = generateVisitorDisplayName();
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    console.error("[AUTH_REGISTER_ERROR]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

