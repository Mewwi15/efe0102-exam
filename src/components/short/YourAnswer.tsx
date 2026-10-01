"use client";

import { useMemo } from "react";
import { highlightSegments, type Range } from "@/lib/keyword-match";

// คำตอบที่นักเรียนพิมพ์ (อ่านอย่างเดียว) ไฮไลต์คำสำคัญที่ระบบพบ วางไว้เหนือรายการประเด็นให้คะแนน
export function YourAnswer({ text, ranges }: { text: string; ranges: Range[] }) {
  // ตัดบรรทัดว่างหัวท้ายออกตอนแสดง (ช่วงไฮไลต์ยังอ้างตำแหน่งในข้อความเดิม)
  const segments = useMemo(() => {
    const segs = highlightSegments(text, ranges);
    if (segs.length && !segs[0].hit) segs[0] = { ...segs[0], text: segs[0].text.trimStart() };
    const l = segs.length - 1;
    if (l >= 0 && !segs[l].hit) segs[l] = { ...segs[l], text: segs[l].text.trimEnd() };
    return segs;
  }, [text, ranges]);
  return (
    <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3" data-testid="your-answer">
      <div className="mb-1 text-sm text-slate-500">คำตอบของคุณ</div>
      <p className="m-0 text-base leading-[1.7] break-words whitespace-pre-wrap text-slate-800">
        {segments.map((s, i) =>
          s.hit ? (
            <mark key={i} className="box-decoration-clone rounded bg-amber-100 p-0 text-inherit" data-testid="kw-hit">
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  );
}
