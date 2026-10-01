// ข้อมูลการสอบปลายภาค EFE0102 ภาคเรียนที่ 1/2569

export const EXAM = {
  start: "2026-10-02T09:00:00+07:00",
  end: "2026-10-02T11:00:00+07:00",
  dateLabel: "ศุกร์ 2 ต.ค. 2569",
  timeLabel: "09.00–11.00 น.",
} as const;

export const MOCK_SIZE = 60;
export const MCQ_POINTS = 25;
export const CHOICE_LABELS = ["ก", "ข", "ค", "ง"] as const;

// แปลงจำนวนข้อที่ถูกเป็นคะแนนเต็ม 25 (ทศนิยม 1 ตำแหน่ง)
export function toPoints(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * MCQ_POINTS * 10) / 10;
}

// 3725 -> "1:02:05", 125 -> "02:05"
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

// ระยะเวลาที่ใช้ เช่น "1 ชม. 5 นาที"
export function formatUsed(sec: number | null | undefined): string {
  if (sec == null) return "-";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} ชม. ${m} นาที`;
  if (m > 0) return `${m} นาที`;
  return `${s} วินาที`;
}
