import { auth } from "@/lib/auth";

export async function requireUser(): Promise<
  { id: string; displayName: string } | null
> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    displayName: user.displayName,
  };
}

export async function requireUserId(): Promise<string | null> {
  const user = await requireUser();
  return user?.id ?? null;
}

