// อ่านคลังข้อสอบที่รวมแล้ว (src/data/bank.json) ใช้ได้ทั้งฝั่ง client และ server
import raw from "@/data/bank.json";
import type { Chapter, Mcq, ShortQ, SwotFramework, SwotSet } from "./types";

type BankFile = {
  generatedAt: string;
  chapters: Chapter[];
  mcq: Mcq[];
  short: ShortQ[];
  swot: { framework: SwotFramework | null; sets: SwotSet[] } | null;
};

const bank = raw as unknown as BankFile;

export const BANK_GENERATED_AT: string = bank.generatedAt;

// เรียง ch01…ch11
export const CHAPTERS: Chapter[] = [...bank.chapters].sort((a, b) => a.id.localeCompare(b.id));
const chapterMap = new Map(CHAPTERS.map((c) => [c.id, c]));

export function chapterById(id: string): Chapter | undefined {
  return chapterMap.get(id);
}

// "บทที่ 7" / "บทที่ 10.1"
export function chapterLabel(ch: Chapter | string | undefined): string {
  const c = typeof ch === "string" ? chapterMap.get(ch) : ch;
  return c ? `บทที่ ${c.no}` : "";
}

export const MCQS: Mcq[] = bank.mcq;
const mcqMap = new Map(MCQS.map((q) => [q.id, q]));

export function mcqById(id: string): Mcq | undefined {
  return mcqMap.get(id);
}

export function mcqsByChapter(chapterId: string): Mcq[] {
  return MCQS.filter((q) => q.chapterId === chapterId);
}

export const SHORTS: ShortQ[] = bank.short;
const shortMap = new Map(SHORTS.map((q) => [q.id, q]));

export function shortById(id: string): ShortQ | undefined {
  return shortMap.get(id);
}

export const SWOT_FRAMEWORK: SwotFramework | null = bank.swot?.framework ?? null;
export const SWOT_SETS: SwotSet[] = bank.swot?.sets ?? [];

export function swotSetById(id: string): SwotSet | undefined {
  return SWOT_SETS.find((s) => s.id === id);
}

// ลิงก์สไลด์ของอาจารย์บน Google Drive (เว็บนี้ไม่เก็บไฟล์ PDF เอง)
export function slideUrl(chapterId: string): string {
  const c = chapterMap.get(chapterId);
  return c?.driveId ? `https://drive.google.com/file/d/${c.driveId}/view` : "";
}
