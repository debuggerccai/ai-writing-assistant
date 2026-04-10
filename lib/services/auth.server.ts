import "server-only";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/requireUser";

export async function requireCurrentUserOrRedirect() {
  const user = await requireUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
