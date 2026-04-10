import { Skeleton } from "@/components/ui/skeleton";

export function WritePageSkeleton() {
  return (
    <div className="flex h-full w-full relative">
      <div className="absolute z-20 h-3 -top-3 inset-x-0 shadow-xl shadow-red-500/50" />
      <div className="w-[320px] bg-slate-50 p-4 border-r">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="mt-2 space-y-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-[7fr_3fr]">
        <div className="bg-white border-r px-12 py-8 flex flex-col gap-6">
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="bg-slate-50 p-6 flex flex-col gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-20 w-4/5 rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl mt-auto" />
        </div>
      </div>
    </div>
  );
}
