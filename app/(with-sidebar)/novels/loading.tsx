import { Plus } from "lucide-react";
import Link from "next/link";

import { NovelsSkeleton } from "@/components/novels";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="w-full h-full relative px-4 py-8 overflow-y-auto">
      <div className="flex items-center">
        <h1 className="text-xl font-medium">我的作品</h1>
        <Link href="/create" className="ml-auto">
          <Button className="ml-2">
            <Plus /> 新建作品
          </Button>
        </Link>
      </div>
      <NovelsSkeleton className="mt-8" count={3} />
    </div>
  );
}
