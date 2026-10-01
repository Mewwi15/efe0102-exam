"use client";

import { Fragment, useMemo } from "react";
import { ConfigProvider, Segmented, Select, Switch, Tag } from "antd";
import { ClockCircleOutlined, EditOutlined, ExperimentOutlined, TableOutlined } from "@ant-design/icons";
import { CHAPTERS, MCQS, SHORTS, SWOT_SETS, chapterLabel } from "@/lib/bank";

export type Mode = "mock" | "practice" | "short" | "swot";

export type ModeOpts = {
  scope: "all" | "after";
  minutes: number;
  pChapters: string[];
  pCount: number | "all";
  coreOnly: boolean;
  sChapters: string[];
  sCount: number;
  swotSet: string;
};

export const DEFAULT_OPTS: ModeOpts = {
  scope: "all",
  minutes: 60,
  pChapters: [],
  pCount: 10,
  coreOnly: false,
  sChapters: [],
  sCount: 6,
  swotSet: "random",
};

export const MODES: { value: Mode; icon: React.ReactNode; title: string; line: string }[] = [
  { value: "mock", icon: <ClockCircleOutlined />, title: "จำลองสอบ", line: "60\u00a0ข้อ จับเวลา" },
  { value: "practice", icon: <ExperimentOutlined />, title: "ฝึกรายบท", line: "เฉลยทันทีทุกข้อ" },
  { value: "short", icon: <EditOutlined />, title: "เขียนตอบ", line: "ซ้อมเขียน 6\u00a0ข้อ" },
  { value: "swot", icon: <TableOutlined />, title: "SWOT", line: "จัด 15\u00a0ข้อความ" },
];

const allChapterIds = CHAPTERS.map((c) => c.id);

// ตัวเลือกใน Segmented ขนาด large สูง 44px (48 − ขอบราง 2×2) ให้กดง่ายบนมือถือ
// เฉพาะ Segmented ส่วนอื่นใช้ธีมกลางจาก Providers เหมือนทุกหน้า
const SEGMENTED_44 = { components: { Segmented: { controlHeightLG: 48 } } };

const chapterOptions = CHAPTERS.map((c) => ({ value: c.id, label: `${chapterLabel(c)} ${c.title}` }));

// การ์ดเลือกโหมด 2×2 (radiogroup)
export function ModeCards({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const move = (dir: number) => {
    const i = MODES.findIndex((m) => m.value === value);
    onChange(MODES[(i + dir + MODES.length) % MODES.length].value);
  };
  return (
    <div
      role="radiogroup"
      aria-label="เลือกโหมด"
      className="grid grid-cols-2 gap-3"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {MODES.map((m) => {
        const on = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-mode={m.value}
            onClick={() => onChange(m.value)}
            className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border-2 px-4 py-3.5 text-left lg:py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 ${
              on ? "border-blue-900 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <span className={`text-xl leading-none lg:hidden ${on ? "text-blue-900" : "text-slate-500"}`}>{m.icon}</span>
            <span className={`flex items-center gap-2 text-lg font-semibold ${on ? "text-blue-900" : "text-slate-800"}`}>
              <span className={`hidden lg:inline ${on ? "text-blue-900" : "text-slate-500"}`}>{m.icon}</span>
              {m.title}
            </span>
            <span className={`text-sm leading-snug ${on ? "text-blue-900" : "text-slate-500"}`}>
              {/* ตัดบรรทัดที่ช่องว่างเท่านั้น ไม่ให้ตัดกลางคำ เช่น "จับ|เวลา" */}
              {m.line.split(" ").map((w, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  <span className="whitespace-nowrap">{w}</span>
                </Fragment>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// แถวตัวเลือก: มือถือป้ายอยู่บน เดสก์ท็อปป้ายอยู่ซ้าย
function Row({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex items-baseline justify-between gap-2 lg:w-24 lg:shrink-0 lg:flex-col lg:gap-0">
        <span className="text-base font-medium text-slate-700">{label}</span>
        {meta && <span className="text-sm text-slate-500">{meta}</span>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ตัดวงเล็บท้ายชื่อโจทย์ SWOT ออกเมื่อแสดงในช่องที่เลือก (ชื่อเต็มอยู่ในรายการ)
function swotShort(title: string): string {
  return title.replace(/\s*\(.*\)\s*$/, "");
}

export function ModeOptions({ mode, opts, set }: { mode: Mode; opts: ModeOpts; set: (patch: Partial<ModeOpts>) => void }) {
  const practicePool = useMemo(() => {
    const ids = opts.pChapters.length ? opts.pChapters : allChapterIds;
    return MCQS.filter((q) => ids.includes(q.chapterId) && (!opts.coreOnly || q.core)).length;
  }, [opts.pChapters, opts.coreOnly]);
  const shortPool = useMemo(() => {
    const ids = opts.sChapters.length ? opts.sChapters : allChapterIds;
    return SHORTS.filter((q) => ids.includes(q.chapterId)).length;
  }, [opts.sChapters]);

  const chapterSelect = (value: string[], onChange: (v: string[]) => void) => (
    <Select
      mode="multiple"
      size="large"
      allowClear
      showSearch={false}
      className="w-full"
      placeholder="ทุกบท"
      maxTagCount="responsive"
      value={value}
      onChange={onChange}
      options={chapterOptions}
      aria-label="เลือกบท"
      tagRender={({ value: id, closable, onClose }) => (
        <Tag
          closable={closable}
          onClose={onClose}
          onMouseDown={(e) => e.preventDefault()}
          className="my-0.5 me-1 py-0.5 text-sm"
        >
          {chapterLabel(String(id))}
        </Tag>
      )}
    />
  );

  return (
    <ConfigProvider theme={SEGMENTED_44}>
      <div className="flex flex-col gap-4" data-options={mode}>
        {mode === "mock" && (
          <>
            <Row label="ขอบเขต">
              <Segmented
                block
                size="large"
                value={opts.scope}
                onChange={(v) => set({ scope: v as ModeOpts["scope"] })}
                options={[
                  { label: "ทุกบท", value: "all" },
                  { label: "หลังกลางภาค", value: "after" },
                ]}
              />
            </Row>
            <Row label="เวลา">
              <Segmented
                block
                size="large"
                value={opts.minutes}
                onChange={(v) => set({ minutes: Number(v) })}
                options={[60, 90, 120].map((m) => ({ label: `${m} นาที`, value: m }))}
              />
            </Row>
          </>
        )}
        {mode === "practice" && (
          <>
            <Row label="บท">{chapterSelect(opts.pChapters, (v) => set({ pChapters: v }))}</Row>
            <Row label="จำนวน" meta={`มี ${practicePool} ข้อ`}>
              <Segmented
                block
                size="large"
                value={opts.pCount}
                onChange={(v) => set({ pCount: v as ModeOpts["pCount"] })}
                options={[
                  { label: "10 ข้อ", value: 10 },
                  { label: "20 ข้อ", value: 20 },
                  { label: "ทั้งหมด", value: "all" },
                ]}
              />
            </Row>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base text-slate-700 lg:justify-start lg:pl-28">
              เฉพาะข้อสำคัญ
              <Switch checked={opts.coreOnly} onChange={(v) => set({ coreOnly: v })} />
            </label>
          </>
        )}
        {mode === "short" && (
          <>
            <Row label="บท">{chapterSelect(opts.sChapters, (v) => set({ sChapters: v }))}</Row>
            <Row label="จำนวน" meta={`มี ${shortPool} ข้อ`}>
              <Segmented
                block
                size="large"
                value={opts.sCount}
                onChange={(v) => set({ sCount: Number(v) })}
                options={[3, 6, 10].map((n) => ({ label: `${n} ข้อ`, value: n }))}
              />
            </Row>
          </>
        )}
        {mode === "swot" && (
          <Row label="โจทย์">
            <Select
              size="large"
              className="w-full"
              value={opts.swotSet}
              onChange={(v) => set({ swotSet: v })}
              disabled={SWOT_SETS.length === 0}
              aria-label="โจทย์"
              labelRender={({ value, label }) =>
                value === "random" ? label : swotShort(SWOT_SETS.find((s) => s.id === value)?.title ?? String(label))
              }
              optionRender={(o) => <span className="block py-1 leading-snug whitespace-normal">{o.label}</span>}
              options={[{ value: "random", label: "สุ่มโจทย์" }, ...SWOT_SETS.map((s) => ({ value: s.id, label: s.title }))]}
            />
          </Row>
        )}
      </div>
    </ConfigProvider>
  );
}
