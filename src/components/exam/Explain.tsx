"use client";

import { Button } from "antd";
import { BulbOutlined, CheckCircleFilled, CloseCircleFilled, ExportOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { chapterLabel, slideUrl } from "@/lib/bank";
import { CHOICE_LABELS } from "@/lib/exam-meta";
import type { AnswerStatus } from "@/lib/exam-view";
import type { Mcq } from "@/lib/types";

// แถวตัวเลือกแบบอ่านอย่างเดียว (หน้าผล) เรียงตามลำดับที่แสดงตอนทำ
export function ChoiceList({ q, order, answer }: { q: Mcq; order: number[]; answer: number | undefined }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {order.map((orig, i) => {
        const isKey = orig === q.answer;
        const isMine = orig === answer;
        return (
          <li
            key={orig}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 leading-[1.7] ${
              isKey ? "border-green-600 bg-green-50" : isMine ? "border-red-400 bg-red-50" : "border-slate-200 text-slate-600"
            }`}
          >
            <b className="shrink-0">{CHOICE_LABELS[i]}.</b>
            <span className="min-w-0 flex-1">
              {q.choices[orig]}
              {isKey && (
                <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-green-700">
                  <CheckCircleFilled /> {isMine ? "คุณตอบข้อนี้ ถูกต้อง" : "คำตอบที่ถูก"}
                </span>
              )}
              {isMine && !isKey && (
                <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-red-600">
                  <CloseCircleFilled /> คุณตอบข้อนี้
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// คำอธิบายก่อน แล้วตามด้วย "ที่มา" บรรทัดเดียวพร้อมปุ่มเปิดสไลด์ ใช้ทั้งตอนฝึก (หลังตอบ) และหน้าผล
export function ExplainPanel({
  q,
  order,
  status,
  showQuote = false,
  className = "rounded-xl border border-slate-200 bg-slate-50 p-5",
}: {
  q: Mcq;
  order: number[];
  status?: AnswerStatus;
  // หน้าผลเปิดดูทีละข้อจึงมีที่ให้ข้อความอ้างอิงจากสไลด์
  showQuote?: boolean;
  // กรอบและพื้นหลังของกล่อง
  className?: string;
}) {
  const keyPos = order.indexOf(q.answer);
  const url = slideUrl(q.chapterId);
  const keyText = `ข้อที่ถูกคือ ${CHOICE_LABELS[keyPos] ?? ""}.`;
  const head =
    status === "right" ? (
      <span className="flex items-center gap-2 text-green-700">
        <CheckCircleFilled /> ตอบถูก
      </span>
    ) : status === "wrong" ? (
      <span className="flex flex-wrap items-center gap-x-2 text-red-600">
        <CloseCircleFilled /> ตอบผิด
        <span className="font-normal text-slate-600">· {keyText}</span>
      </span>
    ) : status === "blank" ? (
      <span className="flex flex-wrap items-center gap-x-2 text-slate-600">
        <MinusCircleOutlined /> ไม่ได้ตอบ
        <span className="font-normal">· {keyText}</span>
      </span>
    ) : (
      <span className="flex items-center gap-2 text-blue-900">
        <BulbOutlined /> คำอธิบาย
      </span>
    );

  return (
    <section className={className} data-testid="explain">
      <div className="mb-2 text-base font-semibold">{head}</div>
      <p className="m-0 text-base leading-[1.75] text-slate-700">{q.explain}</p>
      {showQuote && q.source.quote && (
        <blockquote className="m-0 mt-3 border-l-4 border-slate-300 pl-3 leading-[1.7] text-slate-500 italic">
          “{q.source.quote}”
        </blockquote>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <span className="min-w-0 text-sm text-slate-500">
          ที่มา: <span className="whitespace-nowrap">{chapterLabel(q.chapterId)}</span> ·{" "}
          <span className="whitespace-nowrap">สไลด์หน้า {q.source.page}</span>
        </span>
        {url && (
          <Button href={url} target="_blank" rel="noreferrer" icon={<ExportOutlined />} className="h-11 shrink-0 lg:h-8">
            เปิดสไลด์
          </Button>
        )}
      </div>
    </section>
  );
}
