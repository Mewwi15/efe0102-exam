import ExamClient from "@/components/exam/ExamClient";

// ทำข้อสอบปรนัย (จำลองสอบ / ฝึกรายบท / ทบทวน) ข้อมูลรอบอยู่ใน localStorage จึงเป็น client component
export default async function ExamPage({ params }: PageProps<"/exam/[id]">) {
  const { id } = await params;
  return <ExamClient id={id} />;
}
