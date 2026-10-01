"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Popconfirm, Tag } from "antd";
import { DeleteOutlined, RedoOutlined } from "@ant-design/icons";
import { CHAPTERS, chapterLabel, swotSetById } from "@/lib/bank";
import { MCQ_POINTS, toPoints } from "@/lib/exam-meta";
import { SESSION_KIND_LABEL, scoreMcq, sessionHref, type Session, type SessionKind } from "@/lib/session";

const KIND_COLOR: Record<SessionKind, string> = {
  mock: "blue",
  practice: "cyan",
  review: "volcano",
  short: "purple",
  swot: "gold",
};

function chaptersText(v: unknown): string {
  const ids = Array.isArray(v) ? (v as string[]) : [];
  if (ids.length === 0 || ids.length === CHAPTERS.length) return "ทุกบท";
  if (ids.length > 3) return `${ids.length} บท`;
  return ids.map((id) => chapterLabel(id).replace("บทที่ ", "บท ")).join(", ");
}

function describe(s: Session): { title: string; status: string; done: boolean } {
  const done = s.finishedAt !== null;
  if (s.mcq) {
    const sc = scoreMcq(s);
    const title =
      s.kind === "mock"
        ? `${sc.total} ข้อ · ${s.options.scope === "after" ? "หลังกลางภาค" : "ทุกบท"}`
        : s.kind === "review"
          ? `${sc.total} ข้อที่เคยผิด`
          : `${sc.total} ข้อ · ${chaptersText(s.options.chapterIds)}`;
    const status = done
      ? `ถูก ${sc.correct}/${sc.total}${s.kind === "mock" ? ` · ${toPoints(sc.correct, sc.total)}/${MCQ_POINTS} คะแนน` : ""}`
      : `ตอบแล้ว ${sc.answered}/${sc.total}`;
    return { title, status, done };
  }
  if (s.short) {
    const n = s.short.ids.length;
    return {
      title: `${n} ข้อ · ${chaptersText(s.options.chapterIds)}`,
      status: done ? "ทำเสร็จแล้ว" : `เขียนแล้ว ${Object.values(s.short.responses).filter((v) => v.trim()).length}/${n}`,
      done,
    };
  }
  if (s.swot) {
    const set = swotSetById(s.swot.setId);
    const total = set?.items.length ?? 0;
    const correct = set ? set.items.filter((it) => s.swot!.answers[it.id] === it.answer).length : 0;
    return {
      // ชื่อโรงเรียนอย่างเดียว (ตัดวงเล็บท้าย) ให้แถวยาวเท่ากับรายการอื่น
      title: set ? set.title.replace(/\s*\(.*\)\s*$/, "") : "ไม่พบชุดข้อมูล",
      status: s.swot.checked ? `ถูก ${correct}/${total}` : `จัดแล้ว ${Object.keys(s.swot.answers).length}/${total}`,
      done: done || s.swot.checked,
    };
  }
  return { title: "", status: "", done };
}

function timeText(t: number): string {
  return new Date(t).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ปุ่มทบทวนข้อที่เคยตอบผิด แสดงเฉพาะเมื่อมีข้อผิด
export function ReviewButton({ count, busy, onClick }: { count: number; busy: boolean; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <Button size="large" block icon={<RedoOutlined />} disabled={busy} onClick={onClick}>
      ฝึกข้อที่เคยตอบผิด ({count} ข้อ)
    </Button>
  );
}

// รายการประวัติ แสดงทีละ limit รายการ กด "ดูทั้งหมด" เพื่อขยาย
export function HistoryList({
  sessions,
  onRemove,
  limit,
}: {
  sessions: Session[];
  onRemove: (id: string) => void;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = limit && !all ? sessions.slice(0, limit) : sessions;
  return (
    <div>
      <ul className="m-0 list-none divide-y divide-slate-100 p-0" data-testid="history">
        {shown.map((s) => {
          const d = describe(s);
          const isMcq = !!s.mcq;
          const href = d.done && isMcq ? `/exam/${s.id}/result` : sessionHref(s);
          return (
            <li key={s.id} className="flex items-center gap-2 py-3" data-kind={s.kind}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Tag color={KIND_COLOR[s.kind]} className="m-0 shrink-0 text-sm">
                    {SESSION_KIND_LABEL[s.kind]}
                  </Tag>
                  <span className="text-base text-slate-800">{d.title}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {timeText(s.createdAt)} · {d.status}
                </div>
              </div>
              <Link href={href} className="shrink-0">
                <Button size="large">
                  {d.done ? (isMcq ? "ดูผล" : "ดูอีกครั้ง") : "ทำต่อ"}
                </Button>
              </Link>
              <Popconfirm title="ลบรายการนี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => onRemove(s.id)}>
                <Button size="large" type="text" icon={<DeleteOutlined />} aria-label="ลบ" className="shrink-0 text-slate-400" />
              </Popconfirm>
            </li>
          );
        })}
      </ul>
      {limit && sessions.length > limit && (
        <Button type="link" size="large" block onClick={() => setAll((v) => !v)}>
          {all ? "ย่อรายการ" : `ดูทั้งหมด (${sessions.length} รายการ)`}
        </Button>
      )}
    </div>
  );
}
