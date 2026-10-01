// ข้อมูลประกอบหน้า SWOT: ชื่อภาษาไทยของ S/W/O/T, สีปุ่ม/แท็ก และป้ายปัจจัย 2S4M / STEP
// อ้างอิงสไลด์บทที่ 7 (ch07.pdf) หน้า 37–42
import { SWOT_FRAMEWORK } from "./bank";
import type { SwotItem, SwotLetter, TowsKey } from "./types";

export const SWOT_LETTERS: SwotLetter[] = ["S", "W", "O", "T"];

// สี preset ของ antd (ใช้ได้ทั้ง Button color และ Tag color)
export type SwotColor = "green" | "volcano" | "blue" | "purple";

// text = คลาสสีตัวอักษรของ Tailwind ให้เข้าชุดกับสี preset
export const LETTER_META: Record<
  SwotLetter,
  { th: string; en: string; color: SwotColor; text: string; internal: boolean; helps: boolean }
> = {
  S: { th: "จุดแข็ง", en: "Strengths", color: "green", text: "text-green-700", internal: true, helps: true },
  W: { th: "จุดอ่อน", en: "Weaknesses", color: "volcano", text: "text-orange-700", internal: true, helps: false },
  O: { th: "โอกาส", en: "Opportunities", color: "blue", text: "text-blue-700", internal: false, helps: true },
  T: { th: "อุปสรรค", en: "Threats", color: "purple", text: "text-purple-700", internal: false, helps: false },
};

export const TOWS_META: Record<TowsKey, { th: string; hint: string }> = {
  SO: { th: "เชิงรุก", hint: "ใช้จุดแข็งฉวยโอกาส" },
  ST: { th: "เชิงป้องกัน", hint: "ใช้จุดแข็งรับมืออุปสรรค" },
  WO: { th: "เชิงแก้ไข", hint: "อาศัยโอกาสแก้จุดอ่อน" },
  WT: { th: "เชิงรับ", hint: "ลดจุดอ่อนและหลีกเลี่ยงอุปสรรค" },
};

export const TOWS_KEYS: TowsKey[] = ["SO", "ST", "WO", "WT"];

// ป้ายปัจจัย เช่น "ภายใน · บุคลากร (Man)" / "ภายนอก · เศรษฐกิจ (Economic)"
export function factorLabel(item: Pick<SwotItem, "factor" | "factorTh" | "answer">): string {
  const inner = SWOT_FRAMEWORK?.internal.find((f) => f.code === item.factor);
  const outer = SWOT_FRAMEWORK?.external.find((f) => f.code === item.factor);
  const f = inner ?? outer;
  const side = inner ? "ภายใน" : outer ? "ภายนอก" : LETTER_META[item.answer].internal ? "ภายใน" : "ภายนอก";
  return `${side} · ${f?.th ?? item.factorTh}${f ? ` (${f.en})` : ""}`;
}

// [35,37,38,39,40] -> "35, 37–40"
export function formatPages(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    out.push(i === j ? `${sorted[i]}` : `${sorted[i]}–${sorted[j]}`);
    i = j;
  }
  return out.join(", ");
}

// "ch07.pdf" -> "ch07"
export function chapterIdFromFile(file: string): string {
  return file.replace(/\.pdf$/i, "");
}
