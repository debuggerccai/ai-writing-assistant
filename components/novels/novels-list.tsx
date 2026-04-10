"use client";

import { Clock, Ellipsis, Inbox, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatRelativeTime, thousandSeparator } from "@/lib/utils";
import { Work } from "@/types";

type WorkWithStats = Work & { totalWords?: number; chapterCount?: number };

type NovelsListProps = {
  works: WorkWithStats[];
  onDeleteNovelAction: (workId: string) => Promise<void>;
};

export function NovelsList({ works: initialWorks, onDeleteNovelAction }: NovelsListProps) {
  const [works, setWorks] = useState<WorkWithStats[]>(initialWorks);

  useEffect(() => {
    setWorks(initialWorks);
  }, [initialWorks]);

  const handleDelete = useCallback(
    async (workId: string) => {
      try {
        await onDeleteNovelAction(workId);
        setWorks((current) => current.filter((item) => item.id !== workId));
      } catch (error) {
        console.error("[NOVEL_DELETE_ERROR]", error);
      }
    }, [onDeleteNovelAction]);

  if (works.length === 0) {
    return (
      <Empty className="mt-8 min-h-64">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>还没有作品</EmptyTitle>
          <EmptyDescription>先创建你的第一部小说，再回来继续创作。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 mt-8">
      {works.map((work) => (
        <Card
          className="relative w-68 m-0 pt-0 pb-0 gap-0 cursor-pointer hover:shadow-md transition-shadow"
          key={work.id}
        >
          <div className="relative w-full h-92 bg-slate-100 bg-[url('/stars.svg')] bg-center bg-no-repeat bg-[length:40px_40px]">
            <Badge className="absolute bottom-4 left-4">{work.category}</Badge>
          </div>
          <CardContent className="flex flex-col gap-3 p-5 divide-y-1">
            <div className="pb-3">
              <p className="text-lg font-bold">{work.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 py-3">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-medium">总字数</span>
                <span className="text-sm font-bold">{thousandSeparator(work.totalWords ?? 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs font-medium">章节数</span>
                <span className="text-sm font-bold">{thousandSeparator(work.chapterCount ?? 0)} 章</span>
              </div>
            </div>
            <div className="flex items-center pt-3">
              <div className="flex gap-1 items-center text-xs text-slate-400">
                <Clock size={12} />
                <span>{formatRelativeTime(work.updatedAt as unknown as string)}更新</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-xs" className="ml-auto rounded-full" variant="outline">
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => handleDelete(work.id)}
                  >
                    <Trash2 />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href={`/writing/${work.id}`}>
                <Button size="lg" className="ml-2">
                  继续创作
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
