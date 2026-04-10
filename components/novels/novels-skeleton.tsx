import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NovelsSkeletonProps = {
  count?: number;
  className?: string;
};

export function NovelsSkeleton({ count = 3, className }: NovelsSkeletonProps) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="relative w-68 m-0 pt-0 pb-0 gap-0 rounded-xl border bg-card"
          key={index}
        >
          <Skeleton className="w-full h-92 rounded-t-xl rounded-b-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-6 w-1/2" />
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="flex items-center pt-2 gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-full ml-auto" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
