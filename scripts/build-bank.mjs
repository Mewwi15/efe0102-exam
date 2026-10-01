// รวมคลังข้อสอบ bank/*.json + sources/manifest.json เป็น src/data/bank.json ที่แอปอ่าน
// ไฟล์ใน bank/ อาจกำลังถูกเขียนอยู่ ไฟล์ที่ parse ไม่ผ่านจะถูกข้ามและรายงาน (ไม่ทำให้ build ล้ม)
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bankDir = join(root, "bank");
const outFile = join(root, "src", "data", "bank.json");

function readJson(file) {
  try {
    return { ok: true, data: JSON.parse(readFileSync(file, "utf8")) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const skipped = [];

const manifestRes = readJson(join(root, "sources", "manifest.json"));
const manifestChapters = manifestRes.ok ? (manifestRes.data.chapters ?? []) : [];
if (!manifestRes.ok) skipped.push(`sources/manifest.json (${manifestRes.error})`);
const metaById = new Map(manifestChapters.map((c) => [c.id, c]));

const chapterFiles = existsSync(bankDir)
  ? readdirSync(bankDir)
      .filter((f) => /^ch\d+\.json$/.test(f))
      .sort()
  : [];

const chapters = [];
const mcq = [];
const short = [];

for (const f of chapterFiles) {
  const res = readJson(join(bankDir, f));
  if (!res.ok) {
    skipped.push(`bank/${f} (${res.error})`);
    continue;
  }
  const d = res.data;
  const ch = d.chapter;
  if (!ch?.id) {
    skipped.push(`bank/${f} (ไม่มี chapter.id)`);
    continue;
  }
  const meta = metaById.get(ch.id) ?? {};
  const qs = Array.isArray(d.mcq) ? d.mcq : [];
  const ss = Array.isArray(d.short) ? d.short : [];
  chapters.push({
    id: ch.id,
    no: String(ch.no ?? meta.no ?? ""),
    title: ch.title ?? meta.title ?? "",
    file: ch.file ?? meta.file ?? "",
    pages: ch.pages ?? meta.pages ?? 0,
    period: ch.period ?? meta.period ?? "หลังกลางภาค",
    driveId: ch.driveId ?? meta.driveId ?? "",
    week: String(meta.week ?? ""),
    topics: meta.topics ?? "",
    mcqCount: qs.length,
    shortCount: ss.length,
  });
  for (const q of qs) mcq.push({ ...q, chapterId: ch.id });
  for (const s of ss) short.push({ ...s, chapterId: ch.id });
}

// บทที่มีใน manifest แต่ยังไม่มีไฟล์คลัง ให้แสดงในหน้าแรกได้ (จำนวนข้อ 0)
for (const meta of manifestChapters) {
  if (chapters.some((c) => c.id === meta.id)) continue;
  chapters.push({
    id: meta.id,
    no: String(meta.no),
    title: meta.title,
    file: meta.file,
    pages: meta.pages,
    period: meta.period,
    driveId: meta.driveId,
    week: String(meta.week ?? ""),
    topics: meta.topics ?? "",
    mcqCount: 0,
    shortCount: 0,
  });
}
chapters.sort((a, b) => a.id.localeCompare(b.id));

let swot = null;
const swotFile = join(bankDir, "swot.json");
if (existsSync(swotFile)) {
  const res = readJson(swotFile);
  if (res.ok && res.data && Array.isArray(res.data.sets)) {
    swot = { framework: res.data.framework ?? null, sets: res.data.sets };
  } else {
    skipped.push(`bank/swot.json (${res.ok ? "ไม่มี sets" : res.error})`);
  }
}

const out = { generatedAt: new Date().toISOString(), chapters, mcq, short, swot };
const tmp = `${outFile}.tmp-${process.pid}`;
writeFileSync(tmp, JSON.stringify(out) + "\n");
renameSync(tmp, outFile);

console.log(
  `[build-bank] ${chapters.length} บท · ปรนัย ${mcq.length} ข้อ · เขียนตอบสั้น ${short.length} ข้อ · SWOT ${
    swot ? `${swot.sets.length} ชุด` : "ไม่มี"
  }`,
);
for (const c of chapters) console.log(`  ${c.id} บทที่ ${c.no}: ปรนัย ${c.mcqCount} · สั้น ${c.shortCount}`);
if (skipped.length) console.warn(`[build-bank] ข้าม ${skipped.length} ไฟล์:\n  ${skipped.join("\n  ")}`);
