"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "作品列表", href: "/novels" },
  { title: "创建作品", href: "/create" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>作品</SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={pathname === item.href}
              className="h-[40px] rounded-xl p-3 data-active:bg-white data-active:text-red-500 data-active:shadow-xs data-active:hover:bg-white data-active:hover:text-red-500"
            >
              <Link href={item.href} className="flex items-center">
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
