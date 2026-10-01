"use client";

import { Tag } from "antd";
import { ArrowRightOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { LETTER_META, factorLabel } from "@/lib/swot-meta";
import type { SwotItem, SwotLetter } from "@/lib/types";

function LetterTag({ letter, wrong = false }: { letter: SwotLetter; wrong?: boolean }) {
  const m = LETTER_META[letter];
  return (
    <Tag color={wrong ? "default" : m.color} className={`m-0 text-sm ${wrong ? "text-slate-500 line-through" : "font-semibold"}`}>
      {letter} {m.th}
    </Tag>
  );
}

// หัวแถวเฉลยที่ยุบไว้: เลขข้อ + ข้อความ + ✓/✗ + ตัวที่ตอบ → เฉลย
export function SwotReviewLabel({ n, item, value }: { n: number; item: SwotItem; value?: SwotLetter }) {
  const ok = value === item.answer;
  return (
    <div className="flex gap-3" data-testid="swot-row" data-id={item.id} data-result={ok ? "correct" : "wrong"}>
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
          ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
        }`}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-base leading-relaxed text-slate-800">{item.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ok ? (
            <>
              <CheckCircleFilled className="text-lg text-emerald-600" aria-label="ถูก" />
              <LetterTag letter={item.answer} />
            </>
          ) : (
            <>
              <CloseCircleFilled className="text-lg text-rose-600" aria-label="ผิด" />
              {value ? <LetterTag letter={value} wrong /> : <span className="text-sm text-slate-500">ไม่ได้ตอบ</span>}
              <ArrowRightOutlined className="text-slate-400" aria-label="เฉลย" />
              <LetterTag letter={item.answer} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// เนื้อหาที่กางออก: ปัจจัย + ข้อหลอก + คำอธิบาย
export function SwotReviewBody({ item }: { item: SwotItem }) {
  return (
    <div className="flex flex-col gap-2 pl-11" data-testid="swot-explain">
      <div className="flex flex-wrap gap-1.5">
        <Tag className="m-0 text-sm whitespace-normal">{factorLabel(item)}</Tag>
        {item.tricky && (
          <Tag color="gold" className="m-0 text-sm">
            ข้อหลอก
          </Tag>
        )}
      </div>
      <p className="m-0 text-base leading-[1.7] text-slate-700">{item.explain}</p>
    </div>
  );
}
