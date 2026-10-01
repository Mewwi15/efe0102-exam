"use client";

import { useEffect, useState } from "react";
import { EditOutlined, FileTextOutlined, TableOutlined } from "@ant-design/icons";
import { EXAM, MCQ_POINTS, MOCK_SIZE } from "@/lib/exam-meta";

// สามส่วนของข้อสอบจริง (แสดงในส่วน "ข้อมูลการสอบ" ที่พับไว้)
export const EXAM_PARTS = [
  { key: "mcq", icon: <FileTextOutlined />, title: "ปรนัย", main: `${MOCK_SIZE} ข้อ`, sub: `${MCQ_POINTS} คะแนน` },
  { key: "short", icon: <EditOutlined />, title: "เขียนตอบสั้น", main: "6 ข้อ", sub: "ทำในกระดาษ" },
  { key: "swot", icon: <TableOutlined />, title: "SWOT", main: "15 ข้อ", sub: "ทำในกระดาษ" },
] as const;

type Phase = { kind: "wait"; d: number; h: number; m: number; s: number } | { kind: "live" } | { kind: "done" } | null;

function usePhase(): Phase {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (now === null) return null;
  const start = Date.parse(EXAM.start);
  const end = Date.parse(EXAM.end);
  if (now >= end) return { kind: "done" };
  if (now >= start) return { kind: "live" };
  const t = Math.floor((start - now) / 1000);
  return { kind: "wait", d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

function Num({ value, unit }: { value: number | string; unit: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-4xl leading-none font-bold text-blue-900 tabular-nums lg:text-5xl">{value}</span>
      <span className="ml-1.5 text-base text-blue-900">{unit}</span>
    </span>
  );
}

// นับถอยหลังแบบเรียบ: แผงเดียว ตัวเลขใหญ่ วินาทีแสดงเฉพาะชั่วโมงสุดท้าย
function Countdown() {
  const p = usePhase();
  let body: React.ReactNode;
  if (p === null || p.kind === "wait") {
    body =
      p === null ? (
        <Num value="--" unit="ชม." />
      ) : (
        <>
          {p.d > 0 && <Num value={p.d} unit="วัน" />}
          {(p.d > 0 || p.h > 0) && <Num value={p.h} unit="ชม." />}
          <Num value={p.m} unit="นาที" />
          {p.d === 0 && p.h === 0 && <Num value={p.s} unit="วินาที" />}
        </>
      );
  } else {
    body = (
      <span className={`text-3xl font-bold ${p.kind === "live" ? "text-amber-700" : "text-slate-500"}`}>
        {p.kind === "live" ? "กำลังสอบ" : "สอบเสร็จแล้ว"}
      </span>
    );
  }
  const head = p === null || p.kind === "wait" ? "เหลือเวลาก่อนสอบ" : p.kind === "live" ? "ขณะนี้" : "การสอบปลายภาค";
  return (
    <section
      className={`flex flex-col gap-3 rounded-2xl px-5 py-5 ${p?.kind === "live" ? "bg-amber-50" : "bg-blue-50"}`}
      aria-label="นับถอยหลังถึงวันสอบ"
    >
      <p className="m-0 text-base font-medium text-blue-900">{head}</p>
      <p className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-2">{body}</p>
      <p className="m-0 text-base text-slate-700">
        {EXAM.dateLabel} · {EXAM.timeLabel}
      </p>
    </section>
  );
}

// ส่วนหัวของหน้า: ชื่อวิชา + นับถอยหลัง (ชื่อเว็บอยู่ที่แถบบนแล้ว จึงไม่ซ้ำ)
// ตัดบรรทัดชื่อวิชาที่ "...ศึกษา | และ..." เท่านั้น
export function ExamHero() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 text-xl leading-snug font-bold text-slate-900 lg:text-2xl">
        <span className="inline-block">การบริหารสถานศึกษา</span>
        <span className="inline-block">และการประกันคุณภาพการศึกษา</span>
      </h1>
      <Countdown />
    </div>
  );
}
