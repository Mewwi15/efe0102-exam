import SwotClient from "@/components/swot/SwotClient";

export default async function SwotPage({ params }: PageProps<"/swot/[id]">) {
  const { id } = await params;
  return <SwotClient id={id} />;
}
