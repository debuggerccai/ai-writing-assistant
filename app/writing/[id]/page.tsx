import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WritePageSkeleton } from "@/components/writing/write-page-skeleton";
import WritingPageClient from "@/components/writing/writing-page-client";
import { getMyWritingPageData } from "@/lib/services/writing.server";

import { createChapterAction, deleteChapterAction, updateChapterAction } from "./actions";

async function WritingPageContent({ workId }: { workId: string }) {
  const data = await getMyWritingPageData(workId);
  if (data.type === "not_found") {
    notFound();
  }

  return (
    <WritingPageClient
      workId={workId}
      initialWork={data.work}
      initialChapters={data.chapters}
      onCreateChapterAction={createChapterAction}
      onUpdateChapterAction={updateChapterAction}
      onDeleteChapterAction={deleteChapterAction}
    />
  );
}

export default async function WritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <Suspense fallback={<WritePageSkeleton />}>
      <WritingPageContent workId={id} />
    </Suspense>
  );
}
