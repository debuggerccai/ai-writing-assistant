import CreateNovel from "@/components/create/createNovel";

export default function createPage({ params }: {
  params: Promise<{ slug: string }>
}) {
  return (
    <CreateNovel />
  )
}