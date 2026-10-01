"use client";

import { Collapse, Drawer } from "antd";
import { FilePdfOutlined, ReadOutlined, RightOutlined } from "@ant-design/icons";
import { CHAPTERS, MCQS, chapterLabel, slideUrl } from "@/lib/bank";
import { EXAM_PARTS } from "./ExamHero";

type Stats = Record<string, { seen: number; correct: number }>;

function Accuracy({ st }: { st?: { seen: number; correct: number } }) {
  if (!st || st.seen === 0) return <span className="text-slate-400">ยังไม่ได้ฝึก</span>;
  const pct = Math.round((st.correct / st.seen) * 100);
  const tone = pct >= 70 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-600";
  return (
    <span className={`font-semibold ${tone}`} title={`ตอบถูก ${st.correct} จาก ${st.seen} ครั้ง`}>
      ถูก {pct}%
    </span>
  );
}

function ChapterList({ stats }: { stats: Stats }) {
  return (
    <ul className="m-0 list-none divide-y divide-slate-100 p-0">
      {CHAPTERS.map((c) => {
        const url = slideUrl(c.id);
        return (
          <li key={c.id} className="flex items-center gap-3 py-3" data-chapter={c.id}>
            <div className="min-w-0 flex-1">
              <div className="text-base text-slate-900">
                <span className="mr-2 font-semibold text-blue-900">{chapterLabel(c)}</span>
                {c.title}
              </div>
              <div className="text-sm text-slate-500">
                {c.period} · {c.mcqCount} ข้อ · <Accuracy st={stats[c.id]} />
              </div>
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-base"
                aria-label={`สไลด์${chapterLabel(c)}`}
              >
                <FilePdfOutlined /> สไลด์
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// เนื้อหาเดียวกันทั้งมือถือและเดสก์ท็อป: 3 ส่วนของข้อสอบจริง + รายชื่อบทพร้อมสไลด์
function InfoBody({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-1 text-sm font-medium text-slate-500">ข้อสอบจริงมี 3 ส่วน</p>
        <ul className="m-0 list-none divide-y divide-slate-100 p-0">
          {EXAM_PARTS.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-3 py-3 text-base">
              <span>
                <span className="mr-2 text-blue-900">{p.icon}</span>
                {p.title}
              </span>
              <span className="text-slate-600">
                {p.main} · {p.sub}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-500">
          เนื้อหา {CHAPTERS.length} บท · ปรนัยในคลัง {MCQS.length} ข้อ
        </p>
        <ChapterList stats={stats} />
      </div>
    </div>
  );
}

const TITLE = "ข้อมูลการสอบและสไลด์";

// ข้อมูลการสอบ (พับไว้ทั้งสองขนาด)
// มือถือ: Collapse / เดสก์ท็อป: แถบเดียว กดแล้วเปิด Drawer หน้าจึงไม่ต้องเลื่อน
export function ExamInfo({ stats, open, onOpenChange }: { stats: Stats; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <>
      <Collapse
        size="large"
        className="bg-white lg:hidden"
        activeKey={open ? ["info"] : []}
        onChange={(keys) => onOpenChange(keys.length > 0)}
        items={[
          {
            key: "info",
            label: <span className="text-base font-medium">{TITLE}</span>,
            children: <InfoBody stats={stats} />,
          },
        ]}
      />

      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="hidden min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] border border-slate-200 bg-white px-6 text-left text-base transition-colors hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 lg:flex"
      >
        <ReadOutlined className="text-blue-900" />
        <span className="font-medium text-slate-900">{TITLE}</span>
        <span className="ml-auto text-base text-slate-500">{CHAPTERS.length} บท</span>
        <RightOutlined className="text-slate-400" />
      </button>
      <Drawer title={TITLE} placement="left" size={560} open={open && isDesktop()} onClose={() => onOpenChange(false)}>
        <InfoBody stats={stats} />
      </Drawer>
    </>
  );
}

function isDesktop(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}
