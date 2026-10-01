// แยกแนวคำตอบที่เขียนเป็นย่อหน้าเดียว ให้แสดงเป็นรายการตามเลขข้อ เช่น "1) … 2) …" หรือ "(1) … (2) …"
// รับเฉพาะเลขที่เรียงต่อกัน (เริ่ม 1 หรือ ต่อจากข้อก่อน) เพื่อไม่ให้ตัดผิดที่ เช่น "(23 ประเด็น)"

export type AnswerBlock = { kind: "text"; text: string } | { kind: "item"; label: string; text: string };

const MARKER = /(^|\s)(\(?)(\d{1,2})\)\s/g;

function splitLine(line: string): AnswerBlock[] {
  const cuts: { at: number; end: number; label: string }[] = [];
  let prev = 0;
  for (const m of line.matchAll(MARKER)) {
    const n = Number(m[3]);
    if (n !== 1 && n !== prev + 1) continue;
    const at = (m.index ?? 0) + m[1].length;
    cuts.push({ at, end: at + m[2].length + m[3].length + 1, label: `${m[2]}${n})` });
    prev = n;
  }
  // ต้องมีอย่างน้อย 2 ข้อ จึงถือเป็นรายการ
  if (cuts.length < 2) return line.trim() ? [{ kind: "text", text: line.trim() }] : [];
  const out: AnswerBlock[] = [];
  const lead = line.slice(0, cuts[0].at).trim();
  if (lead) out.push({ kind: "text", text: lead });
  cuts.forEach((c, i) => {
    const text = line.slice(c.end, cuts[i + 1]?.at ?? line.length).trim();
    out.push({ kind: "item", label: c.label, text });
  });
  return out;
}

export function splitAnswer(answer: string): AnswerBlock[] {
  return answer.split(/\n+/).flatMap(splitLine);
}

// คะแนนของหนึ่งข้อ: จำนวนประเด็นที่ติ๊ก / จำนวนประเด็นทั้งหมด
export function tickedCount(ticks: number[] | undefined, total: number): number {
  return new Set((ticks ?? []).filter((i) => i >= 0 && i < total)).size;
}
