// รอบการทำข้อสอบ/ฝึก เก็บใน localStorage ของเบราว์เซอร์นี้เท่านั้น (ไม่มีฐานข้อมูล)
// การสุ่มทั้งหมดอยู่ในฟังก์ชัน create* เท่านั้น ห้ามสุ่มระหว่าง render
import { CHAPTERS, MCQS, SHORTS, SWOT_SETS, mcqById, shortById, swotSetById } from "./bank";
import { MOCK_SIZE } from "./exam-meta";
import { load, remove, save } from "./storage";
import type { Mcq, SwotLetter } from "./types";

export type SessionKind = "mock" | "practice" | "review" | "short" | "swot";

export type Session = {
  id: string;
  kind: SessionKind;
  name: string;
  createdAt: number;
  deadline: number | null;
  finishedAt: number | null;
  options: Record<string, unknown>;
  current?: number;
  mcq?: {
    ids: string[];
    // order[qid] = ดัชนีตัวเลือกเดิม เรียงตามลำดับที่แสดง
    order: Record<string, number[]>;
    // เก็บดัชนีตัวเลือกเดิมเสมอ ตรวจได้ด้วย answers[id] === mcq.answer
    answers: Record<string, number>;
    flags: string[];
  };
  short?: {
    ids: string[];
    responses: Record<string, string>;
    ticks: Record<string, number[]>;
    revealed: string[];
    // ประเด็นที่ระบบติ๊กให้จากคำสำคัญตอนดูแนวคำตอบ (ไว้แสดงป้าย "เจอคำว่า" หลังรีเฟรช)
    auto?: Record<string, number[]>;
  };
  swot?: { setId: string; answers: Record<string, SwotLetter>; checked: boolean };
};

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  mock: "จำลองสอบ",
  practice: "ฝึกรายบท",
  review: "ทบทวนข้อที่ผิด",
  short: "เขียนตอบสั้น",
  swot: "SWOT",
};

// ลิงก์ของแต่ละรอบ: ปรนัย /exam/<id>, เขียนตอบ /short/<id>, SWOT /swot/<id>
export function sessionHref(s: Pick<Session, "id" | "kind">): string {
  if (s.kind === "short") return `/short/${s.id}`;
  if (s.kind === "swot") return `/swot/${s.id}`;
  return `/exam/${s.id}`;
}

const NAME_KEY = "name";
const INDEX_KEY = "sessions";
const MAX_SESSIONS = 50;
const sessionKey = (id: string) => `session:${id}`;

export function getName(): string {
  const v = load<unknown>(NAME_KEY, "");
  return typeof v === "string" ? v : "";
}

export function setName(name: string): void {
  save(NAME_KEY, name.trim());
}

// ---------- ตัวช่วยสุ่ม ----------

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ลำดับตัวเลือกที่แสดง: สลับเมื่อ shuffle = true
function choiceOrder(q: Mcq): number[] {
  const idx = q.choices.map((_, i) => i);
  return q.shuffle ? shuffle(idx) : idx;
}

// เลือกข้อในบท: ข้อสำคัญ (core) ก่อน แล้วค่อยข้ออื่น สุ่มภายในกลุ่ม
function pickPreferCore(pool: Mcq[], n: number): Mcq[] {
  const core = shuffle(pool.filter((q) => q.core));
  const rest = shuffle(pool.filter((q) => !q.core));
  return [...core, ...rest].slice(0, n);
}

// แบ่งจำนวนข้อตามสัดส่วนจำนวนข้อของแต่ละบท (largest remainder) ไม่เกินจำนวนที่มี
function allocate(sizes: number[], total: number): number[] {
  const sum = sizes.reduce((a, b) => a + b, 0);
  if (sum <= total) return [...sizes];
  const exact = sizes.map((s) => (s / sum) * total);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    if (out[i] < sizes[i]) {
      out[i]++;
      left--;
    }
  }
  return out;
}

function chapterIndex(chapterId: string): number {
  return CHAPTERS.findIndex((c) => c.id === chapterId);
}

function mcqPart(qs: Mcq[]): NonNullable<Session["mcq"]> {
  return {
    ids: qs.map((q) => q.id),
    order: Object.fromEntries(qs.map((q) => [q.id, choiceOrder(q)])),
    answers: {},
    flags: [],
  };
}

function base(kind: SessionKind, name: string, options: Record<string, unknown>): Session {
  return { id: newId(), kind, name: name.trim(), createdAt: Date.now(), deadline: null, finishedAt: null, options, current: 0 };
}

function store(s: Session): Session {
  saveSession(s);
  return s;
}

// ---------- สร้างรอบ ----------

// จำลองสอบ 60 ข้อ เรียงตามบท จับเวลา
export function createMockSession({
  name,
  scope,
  minutes,
}: {
  name: string;
  scope: "all" | "after";
  minutes: number;
}): Session {
  const chapters = CHAPTERS.filter((c) => scope === "all" || c.period === "หลังกลางภาค");
  const pools = chapters.map((c) => MCQS.filter((q) => q.chapterId === c.id)).filter((p) => p.length > 0);
  const counts = allocate(
    pools.map((p) => p.length),
    MOCK_SIZE,
  );
  const qs = pools.flatMap((p, i) => pickPreferCore(p, counts[i]));
  const s = base("mock", name, { scope, minutes });
  s.deadline = s.createdAt + minutes * 60_000;
  s.mcq = mcqPart(qs);
  return store(s);
}

// ฝึกรายบท: สุ่มจากบทที่เลือก มีเฉลยทันทีหลังตอบแต่ละข้อ
export function createPracticeSession({
  name,
  chapterIds,
  count,
  coreOnly,
}: {
  name: string;
  chapterIds: string[];
  count: number | "all";
  coreOnly: boolean;
}): Session {
  const pool = MCQS.filter((q) => chapterIds.includes(q.chapterId) && (!coreOnly || q.core));
  const picked = count === "all" ? shuffle(pool) : shuffle(pool).slice(0, count);
  // เรียงตามบท แต่สุ่มภายในบท
  const qs = picked.sort((a, b) => chapterIndex(a.chapterId) - chapterIndex(b.chapterId));
  const s = base("practice", name, { chapterIds, count, coreOnly });
  s.mcq = mcqPart(qs);
  return store(s);
}

// ทบทวนข้อที่เคยตอบผิด ทำงานเหมือนฝึกรายบท
export function createReviewSession({ name, ids }: { name: string; ids: string[] }): Session {
  const qs = shuffle(ids.map((id) => mcqById(id)).filter((q): q is Mcq => !!q));
  const s = base("review", name, { count: qs.length });
  s.mcq = mcqPart(qs);
  return store(s);
}

// เขียนตอบสั้น: กระจายข้อให้ครบทุกบทที่เลือกก่อน (วนทีละบท) แล้วเรียงตามบท
export function createShortSession({
  name,
  chapterIds,
  count,
}: {
  name: string;
  chapterIds: string[];
  count: number;
}): Session {
  const pools = CHAPTERS.filter((c) => chapterIds.includes(c.id))
    .map((c) => shuffle(SHORTS.filter((q) => q.chapterId === c.id)))
    .filter((p) => p.length > 0);
  const picked: string[] = [];
  const order = shuffle(pools); // ลำดับบทที่ได้ข้อก่อนเป็นแบบสุ่ม
  for (let round = 0; picked.length < count && order.some((p) => p.length > round); round++) {
    for (const p of order) {
      if (picked.length >= count) break;
      if (p[round]) picked.push(p[round].id);
    }
  }
  const ids = picked.sort((a, b) => chapterIndex(shortById(a)!.chapterId) - chapterIndex(shortById(b)!.chapterId));
  const s = base("short", name, { chapterIds, count });
  s.short = { ids, responses: {}, ticks: {}, revealed: [] };
  return store(s);
}

// SWOT: setId เป็นรหัสชุด หรือ "random" เพื่อสุ่มชุด
export function createSwotSession({ name, setId }: { name: string; setId: string }): Session {
  const set = swotSetById(setId) ?? (SWOT_SETS.length ? SWOT_SETS[Math.floor(Math.random() * SWOT_SETS.length)] : undefined);
  const s = base("swot", name, { setId: set?.id ?? "", random: !swotSetById(setId) });
  s.swot = { setId: set?.id ?? "", answers: {}, checked: false };
  return store(s);
}

// ---------- อ่าน/เขียน ----------

const KINDS: SessionKind[] = ["mock", "practice", "review", "short", "swot"];
const LETTERS: SwotLetter[] = ["S", "W", "O", "T"];

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const intArr = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0) : [];

// เก็บเฉพาะค่าที่ชนิดถูก (record ของค่าใดๆ)
function pick<T>(v: unknown, ok: (x: unknown) => x is T): Record<string, T> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => ok(x))) as Record<string, T>;
}

// ข้อมูลใน localStorage อาจเสีย/ถูกแก้ด้วยมือ/มาจากเวอร์ชันเก่า: ตรวจและเติมโครงสร้างให้ครบก่อนส่งให้หน้าเว็บ
export function normalizeSession(raw: unknown, id?: string): Session | null {
  if (!isObj(raw)) return null;
  const kind = raw.kind as SessionKind;
  if (!KINDS.includes(kind)) return null;
  const sid = typeof raw.id === "string" && raw.id ? raw.id : id;
  if (!sid || (id && sid !== id)) return null;
  const s: Session = {
    id: sid,
    kind,
    name: typeof raw.name === "string" ? raw.name : "",
    createdAt: numOrNull(raw.createdAt) ?? 0,
    deadline: numOrNull(raw.deadline),
    finishedAt: numOrNull(raw.finishedAt),
    options: isObj(raw.options) ? raw.options : {},
    current: Math.max(0, Math.floor(numOrNull(raw.current) ?? 0)),
  };
  if (isObj(raw.mcq)) {
    const m = raw.mcq;
    s.mcq = {
      ids: strArr(m.ids),
      order: Object.fromEntries(
        Object.entries(isObj(m.order) ? m.order : {}).map(([k, v]) => [k, intArr(v)]),
      ),
      answers: pick(m.answers, (x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x <= 3),
      flags: strArr(m.flags),
    };
  }
  if (isObj(raw.short)) {
    const sh = raw.short;
    s.short = {
      ids: strArr(sh.ids),
      responses: pick(sh.responses, (x): x is string => typeof x === "string"),
      ticks: Object.fromEntries(Object.entries(isObj(sh.ticks) ? sh.ticks : {}).map(([k, v]) => [k, intArr(v)])),
      revealed: strArr(sh.revealed),
    };
    if (isObj(sh.auto)) s.short.auto = Object.fromEntries(Object.entries(sh.auto).map(([k, v]) => [k, intArr(v)]));
  }
  if (isObj(raw.swot)) {
    const sw = raw.swot;
    s.swot = {
      setId: typeof sw.setId === "string" ? sw.setId : "",
      answers: pick(sw.answers, (x): x is SwotLetter => LETTERS.includes(x as SwotLetter)),
      checked: sw.checked === true,
    };
  }
  return s;
}

export function loadSession(id: string): Session | null {
  return normalizeSession(load<unknown>(sessionKey(id), null), id);
}

function loadIndex(): string[] {
  return strArr(load<unknown>(INDEX_KEY, []));
}

export function saveSession(s: Session): void {
  save(sessionKey(s.id), s);
  const ids = loadIndex();
  if (ids[0] === s.id) return;
  const next = [s.id, ...ids.filter((x) => x !== s.id)];
  // เก็บแค่ 50 รอบล่าสุด
  for (const old of next.slice(MAX_SESSIONS)) remove(sessionKey(old));
  save(INDEX_KEY, next.slice(0, MAX_SESSIONS));
}

// ใหม่สุดก่อน (ตามเวลาที่สร้าง)
export function listSessions(): Session[] {
  return loadIndex()
    .map((id) => loadSession(id))
    .filter((s): s is Session => !!s)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteSession(id: string): void {
  remove(sessionKey(id));
  save(
    INDEX_KEY,
    loadIndex().filter((x) => x !== id),
  );
}

// ---------- คะแนน ----------

export function scoreMcq(s: Session): {
  correct: number;
  answered: number;
  total: number;
  byChapter: Record<string, { correct: number; total: number }>;
} {
  const ids = s.mcq?.ids ?? [];
  const answers = s.mcq?.answers ?? {};
  let correct = 0;
  let answered = 0;
  const byChapter: Record<string, { correct: number; total: number }> = {};
  for (const id of ids) {
    const q = mcqById(id);
    if (!q) continue;
    const row = (byChapter[q.chapterId] ??= { correct: 0, total: 0 });
    row.total++;
    const a = answers[id];
    if (a === undefined) continue;
    answered++;
    if (a === q.answer) {
      correct++;
      row.correct++;
    }
  }
  return { correct, answered, total: ids.length, byChapter };
}
