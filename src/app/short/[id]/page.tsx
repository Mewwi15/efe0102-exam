import ShortClient from "@/components/short/ShortClient";

// เขียนตอบสั้น: ข้อมูลรอบอยู่ใน localStorage จึงทำงานฝั่ง client ทั้งหมด
export default async function ShortPage({ params }: PageProps<"/short/[id]">) {
  const { id } = await params;
  return <ShortClient id={id} />;
}
