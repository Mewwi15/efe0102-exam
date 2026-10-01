"use client";

import { memo, useMemo } from "react";
import { chapterLabel, mcqById } from "@/lib/bank";

export type QuestionStatus = "correct" | "wrong";

type Props = {
  ids: string[];
  current: number;
  answers: Record<string, number>;
  flags: string[];
  // โหมดฝึก: สีเขียว/แดงตามผลตรวจของข้อนั้น
  status?: Record<string, QuestionStatus>;
  onJump: (index: number) => void;
};

// ตารางเลือกข้อ แบ่งกลุ่มตามบท ปุ่มสูง 44px บนมือถือ (ปุ่ม HTML ธรรมดา render หลายสิบปุ่มได้เร็ว)
export const ExamNavigator = memo(function ExamNavigator({ ids, current, answers, flags, status, onJump }: Props) {
  const flagSet = useMemo(() => new Set(flags), [flags]);
  const groups = useMemo(() => {
    const out: { chapterId: string; items: { id: string; i: number }[] }[] = [];
    ids.forEach((id, i) => {
      const chapterId = mcqById(id)?.chapterId ?? "";
      const last = out[out.length - 1];
      if (last && last.chapterId === chapterId) last.items.push({ id, i });
      else out.push({ chapterId, items: [{ id, i }] });
    });
    return out;
  }, [ids]);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={`${g.chapterId}-${g.items[0].i}`}>
          {groups.length > 1 && <div className="mb-2 text-sm font-medium text-slate-500">{chapterLabel(g.chapterId)}</div>}
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-6 xl:grid-cols-7">
            {g.items.map(({ id, i }) => {
              const answered = answers[id] !== undefined;
              const flagged = flagSet.has(id);
              const st = status?.[id];
              const isCurrent = i === current;
              const color =
                st === "correct"
                  ? "border-green-600 bg-green-600 text-white hover:bg-green-500"
                  : st === "wrong"
                    ? "border-red-500 bg-red-500 text-white hover:bg-red-400"
                    : answered
                      ? "border-blue-900 bg-blue-900 text-white hover:bg-blue-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-700";
              const stText = st === "correct" ? " ตอบถูก" : st === "wrong" ? " ตอบผิด" : answered ? " ตอบแล้ว" : "";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onJump(i)}
                  aria-label={`ข้อ ${i + 1}${stText}${flagged ? " ทำเครื่องหมายไว้" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`relative h-11 cursor-pointer rounded-lg border text-sm font-medium transition-colors lg:h-9 ${color} ${
                    isCurrent ? "ring-2 ring-amber-400 ring-offset-2" : ""
                  }`}
                >
                  {i + 1}
                  {flagged && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
        {status ? (
          <>
            <Legend className="bg-green-600" label="ถูก" />
            <Legend className="bg-red-500" label="ผิด" />
          </>
        ) : (
          <Legend className="bg-blue-900" label="ตอบแล้ว" />
        )}
        <Legend className="border border-slate-300 bg-white" label="ยังไม่ตอบ" />
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-400" /> ทำเครื่องหมาย
        </span>
      </div>
    </div>
  );
});

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded ${className}`} /> {label}
    </span>
  );
}
