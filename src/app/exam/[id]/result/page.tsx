import ResultClient from "@/components/exam/ResultClient";

export default async function ResultPage({ params }: PageProps<"/exam/[id]/result">) {
  const { id } = await params;
  return <ResultClient id={id} />;
}
