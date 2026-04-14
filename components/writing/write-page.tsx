"use client";

import { ArrowLeft, Inbox, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { useDefaultLayout } from "react-resizable-panels";

import NavLogo from "@/components/common/nav-logo";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { WritingContext } from "@/contexts/writing-context";
import { Chapter } from "@/types/writing";

import ChapterList from "./chapter-list";
import Editor from "./editor";
import WritingAssistant from "./writing-assistant";


export default function WritePage() {

  const {
    work,
    chapters,
    selectedItem,
    onCreateChapter,
    onSelectChapter,
    onDeleteChapter,
    onChangeChapterName,
    onChangeChapterContent
  } = useContext(WritingContext);

  const router = useRouter();

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "writing-page-layout-v1",
    panelIds: ["writing-editor-panel", "writing-assistant-panel"],
  });


  return (
    <div className="flex h-full w-full relative">
      <div className="absolute z-20 h-3 -top-3 inset-x-0 shadow-xl shadow-red-500/50"></div>
      <SidebarProvider>
        <Sidebar collapsible="offcanvas" variant="inset" className="bg-slate-50 p-4">
          <SidebarHeader className="gap-4">
            <NavLogo />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="flex items-center gap-2 text-slate-500" onClick={() => router.push("/novels")}>
                  <ArrowLeft /> 返回作品列表
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Button className="text-red-500 border border-red-100 shadow-sm hover:bg-white hover:text-red-500" variant="outline" size="lg" onClick={() => onCreateChapter?.()}>
              <Plus />新建章节
            </Button>
          </SidebarHeader>
          <SidebarContent>
            <ChapterList />
          </SidebarContent>
          <SidebarFooter>
            <div className="box-border flex flex-col items-start p-4 gap-1 bg-white border border-slate-100 rounded-xl">
              <p className="text-xs text-slate-500">当前作品</p>
              <p className="truncate text-sm font-medium text-slate-800">
                {work?.title || "未命名作品"}
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="!m-0 !rounded-none">
          <SidebarTrigger className="absolute z-10 top-2 left-0" />
          <ResizablePanelGroup
            orientation="horizontal"
            id="writing-page-layout-v1"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
            className="w-full h-full"
          >
            <ResizablePanel id="writing-editor-panel" defaultSize="70%" minSize="50%">
              {
                selectedItem?.id ? <Editor /> : <div className="w-full h-full flex items-center justify-center">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Inbox className="size-12" />
                      </EmptyMedia>
                      <EmptyTitle>暂无章节</EmptyTitle>
                      <EmptyDescription>
                        请点击创建章节～
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" onClick={onCreateChapter}>新建章节</Button>
                    </EmptyContent>
                  </Empty>
                </div>
              }
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel id="writing-assistant-panel" defaultSize="30%" minSize="30%">
              <WritingAssistant className="w-full h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

