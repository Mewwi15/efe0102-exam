// สถิติการฝึกของผู้ใช้ในเบราว์เซอร์นี้ (localStorage) ใช้ทำ "ข้อที่เคยตอบผิด" และความแม่นยำรายบท
import { mcqById } from "./bank";
import { load, save } from "./storage";

// last = ครั้งล่าสุดตอบถูกหรือไม่, at = เวลาที่ตอบครั้งล่าสุด
export type McqProgress = { seen: number; correct: number; last: boolean; at: number };
export type SwotProgress = { tries: number; best: number; last: number; total: number; at: number };
export type ShortProgress = { tries: number; best: number; last: number; total: number; at: number };

const MCQ_KEY = "progress:mcq";
const SWOT_KEY = "progress:swot";
const SHORT_KEY = "progress:short";

// ข้อมูลเสีย (ไม่ใช่ object) ให้ถือว่าว่าง และกรองรายการที่โครงสร้างไม่ถูกออก
function loadRecord<T>(key: string, ok: (v: Record<string, unknown>) => boolean): Record<string, T> {
  const raw = load<unknown>(key, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([, v]) => !!v && typeof v === "object" && ok(v as Record<string, unknown>)),
  ) as Record<string, T>;
}
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);

export function getMcqProgress(): Record<string, McqProgress> {
  return loadRecord<McqProgress>(MCQ_KEY, (p) => isNum(p.seen) && isNum(p.correct) && typeof p.last === "boolean");
}

// บันทึกผลการตอบหนึ่งครั้ง (เรียกครั้งเดียวต่อข้อต่อรอบ)
export function recordMcq(qid: string, correct: boolean): void {
  const all = getMcqProgress();
  const p = all[qid] ?? { seen: 0, correct: 0, last: false, at: 0 };
  all[qid] = { seen: p.seen + 1, correct: p.correct + (correct ? 1 : 0), last: correct, at: Date.now() };
  save(MCQ_KEY, all);
}

// ข้อที่ครั้งล่าสุดตอบผิด (ล่าสุดก่อน) เฉพาะข้อที่ยังมีในคลัง
export function getWrongIds(): string[] {
  return Object.entries(getMcqProgress())
    .filter(([id, p]) => !p.last && mcqById(id))
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id]) => id);
}

// รวมจำนวนครั้งที่ตอบ/ตอบถูก แยกตามบท
export function getChapterStats(): Record<string, { seen: number; correct: number }> {
  const out: Record<string, { seen: number; correct: number }> = {};
  for (const [id, p] of Object.entries(getMcqProgress())) {
    const q = mcqById(id);
    if (!q) continue;
    const row = (out[q.chapterId] ??= { seen: 0, correct: 0 });
    row.seen += p.seen;
    row.correct += p.correct;
  }
  return out;
}

function bump(prev: SwotProgress | undefined, score: number, total: number): SwotProgress {
  return {
    tries: (prev?.tries ?? 0) + 1,
    best: Math.max(prev?.best ?? 0, score),
    last: score,
    total,
    at: Date.now(),
  };
}

export function recordSwot(setId: string, score: number, total: number): void {
  const all = getSwotProgress();
  all[setId] = bump(all[setId], score, total);
  save(SWOT_KEY, all);
}

export function getSwotProgress(): Record<string, SwotProgress> {
  return loadRecord<SwotProgress>(SWOT_KEY, (p) => isNum(p.tries) && isNum(p.best) && isNum(p.total));
}

// got = จำนวนประเด็นที่ติ๊กว่าเขียนได้, total = จำนวนประเด็นทั้งหมดของข้อ
export function recordShort(qid: string, got: number, total: number): void {
  const all = getShortProgress();
  all[qid] = bump(all[qid], got, total);
  save(SHORT_KEY, all);
}

export function getShortProgress(): Record<string, ShortProgress> {
  return loadRecord<ShortProgress>(SHORT_KEY, (p) => isNum(p.tries) && isNum(p.best) && isNum(p.total));
}
