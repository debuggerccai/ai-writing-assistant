import CreateNovel from "@/components/create/create-novel";

export default function createPage({ params }: {
  params: Promise<{ slug: string }>
}) {
  return (
    <CreateNovel />
  )
}