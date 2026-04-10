"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import { useContext, useState } from "react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { WritingContext } from "@/contexts/writing-context";
import { cn } from "@/lib/utils"

const itemActiveClassName = cn('bg-[#e4edfd] text-[#3964fe] hover:bg-[#e4edfd] hover:text-[#3964fe]');
const itemBaseClassName = cn('pl-[10px] pr-[6px] h-[40px]');

export default function ChapterList() {
  const { selectedItem, chapters, onSelectChapter, onDeleteChapter } = useContext(WritingContext);

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>章节目录</SidebarGroupLabel>
      <SidebarMenu>
        {chapters.map((chapter) => (
          <SidebarMenuItem key={chapter.id}>
            <SidebarMenuButton
              isActive={selectedItem?.id === chapter.id}
              onClick={() => onSelectChapter?.(chapter)}
              className="h-[40px] p-3 rounded-xl data-active:text-red-500 data-active:hover:bg-white data-active:hover:text-red-500  data-active:shadow-xs data-active:bg-white"
            >
              {chapter.name}
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="!top-[50%] transform -translate-y-1/2">
                <SidebarMenuAction>
                  <MoreHorizontal />
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
              >
                {/* <DropdownMenuItem>
                  <span>Open</span>
                </DropdownMenuItem> */}
                <DropdownMenuItem variant="destructive" onClick={() => onDeleteChapter?.(chapter.id)}>
                  <Trash2 />
                  <span>删除</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

