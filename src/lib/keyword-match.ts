// ช่วยติ๊กจากคำสำคัญ: หาว่าคำตอบที่นักเรียนพิมพ์มีคำสำคัญของประเด็นไหนบ้าง (ฟังก์ชันล้วน ไม่มี import)
// การทำให้เป็นมาตรฐานต้องตรงกับ norm_kw ใน bank/validate.py ทุกตัวอักษร:
//   แทน "ํา" (นิคหิต + สระอา) ด้วย "ำ" → ตัวพิมพ์เล็ก → ลบช่องว่างทุกชนิดและอักขระความกว้างศูนย์
// คำสำคัญตรงกับประเด็นเมื่อเป็นสตริงย่อยของคำตอบหลังทำให้เป็นมาตรฐานแล้ว

export type Range = [start: number, end: number];

export type PointMatch = {
  index: number;
  // คำสำคัญที่พบ ตามที่เขียนในคลัง (เรียงตามลำดับในคลัง ไม่ซ้ำ)
  matched: string[];
  // ตำแหน่ง [start, end) ในคำตอบต้นฉบับ (ไม่ใช่ข้อความที่ทำให้เป็นมาตรฐาน)
  ranges: Range[];
};

// Python \s (str) = ช่องว่างของ Unicode ทั้งหมด รวม \x1c-\x1f และ \x85 ซึ่ง \s ของ JS ไม่มี
// ตามด้วยอักขระความกว้างศูนย์ U+200B U+200C U+200D U+FEFF แบบเดียวกับ validate.py
const DROP = /^[\s\x1c-\x1f\x85​‌‍﻿]$/u;
const NIKHAHIT_AA = "ํา"; // ํา
const SARA_AM = "ำ"; // ำ
const MARK = /^\p{M}$/u;

type Normalised = { text: string; from: number[]; to: number[] };

// ทำให้เป็นมาตรฐานพร้อมจำว่าอักขระแต่ละตัวของผลลัพธ์มาจากช่วงใดของต้นฉบับ
function normaliseWithMap(src: string): Normalised {
  let text = "";
  const from: number[] = [];
  const to: number[] = [];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith(NIKHAHIT_AA, i)) {
      text += SARA_AM;
      from.push(i);
      to.push(i + NIKHAHIT_AA.length);
      i += NIKHAHIT_AA.length;
      continue;
    }
    const ch = String.fromCodePoint(src.codePointAt(i)!);
    if (!DROP.test(ch)) {
      // ตัวพิมพ์เล็กบางตัวยาวกว่าเดิม (เช่น "İ") ทุกหน่วยของผลลัพธ์ชี้กลับไปที่อักขระเดิมตัวเดียวกัน
      const low = ch.toLowerCase();
      for (let k = 0; k < low.length; k++) {
        text += low[k];
        from.push(i);
        to.push(i + ch.length);
      }
    }
    i += ch.length;
  }
  return { text, from, to };
}

export function normaliseKeyword(text: string): string {
  return normaliseWithMap(text).text;
}

// ไม่ตัดกลางสระ/วรรณยุกต์ที่ซ้อนอยู่ (ไฮไลต์ "กร" ใน "กร้าว" ต้องรวม "้" ด้วย ไม่งั้นจะเห็นวงกลมประ)
function extendOverMarks(src: string, end: number): number {
  let e = end;
  while (e < src.length && MARK.test(src[e])) e++;
  return e;
}

// ผลต่อประเด็น (ยาวเท่า keywords) ประเด็นที่ไม่มีคำสำคัญหรือไม่พบ: matched = [] และ ranges = []
export function matchKeywords(answer: string, keywords: readonly (readonly string[])[] | undefined): PointMatch[] {
  if (!keywords) return [];
  const ans = normaliseWithMap(answer);
  return keywords.map((group, index) => {
    const matched: string[] = [];
    const ranges: Range[] = [];
    const seen = new Set<string>();
    for (const kw of group ?? []) {
      if (typeof kw !== "string") continue;
      const nk = normaliseKeyword(kw);
      if (!nk || seen.has(nk)) continue;
      seen.add(nk);
      let found = false;
      // ทีละตำแหน่ง เพื่อให้เจอทุกครั้งรวมถึงที่ซ้อนทับกัน
      for (let at = ans.text.indexOf(nk); at !== -1; at = ans.text.indexOf(nk, at + 1)) {
        found = true;
        ranges.push([ans.from[at], extendOverMarks(answer, ans.to[at + nk.length - 1])]);
      }
      if (found) matched.push(kw);
    }
    return { index, matched, ranges: mergeRanges(ranges) };
  });
}

// รวมช่วงที่ทับหรือชิดกันเป็นช่วงเดียว เรียงจากซ้ายไปขวา
export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Range[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

// ตัดคำตอบเป็นช่วงๆ สำหรับแสดงผล: hit = อยู่ในคำสำคัญที่พบ
export function highlightSegments(text: string, ranges: readonly Range[]): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = [];
  let pos = 0;
  for (const [s, e] of mergeRanges(ranges)) {
    if (s > pos) out.push({ text: text.slice(pos, s), hit: false });
    if (e > Math.max(s, pos)) out.push({ text: text.slice(Math.max(s, pos), e), hit: true });
    pos = Math.max(pos, e);
  }
  if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
  return out;
}

// ดัชนีประเด็นที่พบคำสำคัญอย่างน้อยหนึ่งคำ
export function matchedPoints(matches: readonly PointMatch[]): number[] {
  return matches.filter((m) => m.matched.length > 0).map((m) => m.index);
}
