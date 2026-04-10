"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GithubIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";



const loginSchema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center px-4 py-8" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirectUrl") ?? "/novels";

  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const { formState } = form;

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in-or-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "登录失败，请稍后重试");
        return;
      }

      const signInRes = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl: redirectUrl,
      });

      if (signInRes?.error) {
        setError("登录失败：请稍后重试");
        return;
      }

      router.push(redirectUrl);
    } catch {
      setError("登录失败，请稍后重试");
    }
  }

  async function onGitHub() {
    setError(null);
    await signIn("github", { callbackUrl: redirectUrl });
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>登录 / 注册</CardTitle>
          <CardDescription>
            如果你还未注册账号，将会在登录时自动为你创建账号
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="login-email">
                        <span aria-hidden="true" className="text-red-500">*</span>
                        邮箱
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="username"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </FieldContent>
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="login-password">
                        <span aria-hidden="true" className="text-red-500">*</span>
                        密码
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="new-password"
                          aria-invalid={fieldState.invalid}
                          {...field}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </FieldContent>
                    </Field>
                  )}
                />
              </FieldGroup>

              {error ? (
                <div className="text-sm font-normal text-destructive" role="alert">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={!formState.isValid || formState.isSubmitting}
              >
                {formState.isSubmitting ? "处理中..." : "登录"}
              </Button>

              {(
                <>
                  <FieldSeparator>或</FieldSeparator>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    data-icon="inline-start"
                    onClick={onGitHub}
                  >
                    <GithubIcon />
                    使用 GitHub 登录
                  </Button>
                </>
              )}
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
