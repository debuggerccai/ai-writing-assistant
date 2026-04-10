"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function initialsFromDisplayName(name: string): string {
    const t = name.trim();
    if (!t) return "用";
    const chars = [...t];
    if (chars.length === 1) return chars[0]!;
    return `${chars[0]!}${chars[1]!}`;
}

export default function NavUser() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        className="h-auto min-h-12 rounded-xl py-2"
                        disabled
                    >
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="grid min-w-0 flex-1 gap-1.5 text-left">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="ml-auto h-4 w-4 rounded" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    if (status !== "authenticated" || !session?.user) {
        return null;
    }

    const { user } = session;
    const displayName = user.displayName || user.name?.trim() || "用户";
    const email = user.email ?? "";
    const isEmailLogin = user.provider === "credentials";
    const avatarUrl =
        !isEmailLogin && user.image ? user.image : undefined;
    const fallback = initialsFromDisplayName(displayName);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="h-auto min-h-12 rounded-xl py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-9 w-9 rounded-lg">
                                {avatarUrl ? (
                                    <AvatarImage src={avatarUrl} alt={displayName} />
                                ) : null}
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                    {fallback}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {email || "—"}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56 rounded-xl"
                        style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}
                        side="right"
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                                <Avatar className="h-9 w-9 rounded-lg">
                                    {avatarUrl ? (
                                        <AvatarImage src={avatarUrl} alt={displayName} />
                                    ) : null}
                                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                                        {fallback}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid min-w-0 flex-1 leading-tight">
                                    <span className="truncate font-medium">{displayName}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {email || "—"}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="cursor-pointer gap-2 rounded-lg"
                            onSelect={(e) => {
                                e.preventDefault();
                                void signOut({ callbackUrl: "/login" });
                            }}
                        >
                            <LogOut className="size-4" />
                            退出登录
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
