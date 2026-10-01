"use client";

import { useMemo } from "react";
import { splitAnswer } from "@/lib/short-format";

// แนวคำตอบ: ย่อหน้านำ + รายการตามเลขข้อ (ถ้ามี) คงการขึ้นบรรทัดใหม่ของต้นฉบับ
export function AnswerText({ answer }: { answer: string }) {
  const blocks = useMemo(() => splitAnswer(answer), [answer]);
  return (
    <div className="space-y-2 text-base leading-[1.7] text-slate-800" data-testid="model-answer">
      {blocks.map((b, i) =>
        b.kind === "text" ? (
          <p key={i} className="m-0 whitespace-pre-line">
            {b.text}
          </p>
        ) : (
          <div key={i} className="flex gap-3">
            <span className="min-w-7 shrink-0 font-semibold text-blue-900">{b.label}</span>
            <span className="min-w-0 whitespace-pre-line">{b.text}</span>
          </div>
        ),
      )}
    </div>
  );
}
