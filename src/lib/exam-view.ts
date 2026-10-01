// ตัวช่วยสำหรับหน้าทำข้อสอบปรนัยและหน้าผล (ไม่มีการสุ่มในไฟล์นี้)
import { mcqById } from "./bank";
import type { Session } from "./session";
import type { Mcq } from "./types";

export const MCQ_KINDS = ["mock", "practice", "review"] as const;

export function isMcqSession(s: Session | null): s is Session & { mcq: NonNullable<Session["mcq"]> } {
  return !!s && !!s.mcq && (MCQ_KINDS as readonly string[]).includes(s.kind);
}

// ข้อในรอบที่ยังมีอยู่ในคลัง (คลังอาจถูกแก้ไขหลังสร้างรอบ)
export function sessionQuestions(s: Session): Mcq[] {
  return (s.mcq?.ids ?? []).map((id) => mcqById(id)).filter((q): q is Mcq => !!q);
}

// ลำดับตัวเลือกที่แสดง (ดัชนีเดิม) ถ้าข้อมูลไม่ตรงกับจำนวนตัวเลือกให้ใช้ลำดับเดิม
export function displayOrder(s: Session, q: Mcq): number[] {
  const o = s.mcq?.order[q.id];
  const n = q.choices.length;
  if (o && o.length === n && [...o].sort((a, b) => a - b).every((v, i) => v === i)) return o;
  return q.choices.map((_, i) => i);
}

export type AnswerStatus = "right" | "wrong" | "blank";

export function answerStatus(q: Mcq, answer: number | undefined): AnswerStatus {
  if (answer === undefined) return "blank";
  return answer === q.answer ? "right" : "wrong";
}

// เวลาที่ใช้เป็นวินาที (null ถ้ายังไม่จบ)
export function usedSeconds(s: Session): number | null {
  return s.finishedAt === null ? null : Math.max(0, (s.finishedAt - s.createdAt) / 1000);
}
