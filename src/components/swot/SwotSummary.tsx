"use client";

import { Tag, Tooltip } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { LETTER_META, TOWS_KEYS, TOWS_META } from "@/lib/swot-meta";
import type { SwotLetter, SwotSet } from "@/lib/types";
import { SwotMatrix } from "./SwotMatrix";

// ตาราง SWOT ที่ถูกต้อง: จัดกลุ่มข้อความตามเฉลย พร้อมเครื่องหมายว่าเราตอบถูกหรือไม่
export function SwotAnswerMatrix({ set, answers }: { set: SwotSet; answers: Record<string, SwotLetter> }) {
  return (
    <div data-testid="swot-matrix">
      <SwotMatrix
        renderCell={(l) => (
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {set.items.map((it, i) =>
              it.answer !== l ? null : (
                <li key={it.id} className="flex gap-2 text-base leading-relaxed text-slate-700">
                  <span className="w-6 shrink-0 text-right font-semibold text-slate-500">{i + 1}.</span>
                  <span className="min-w-0 flex-1">
                    {it.text}
                    {answers[it.id] !== l && (
                      <span className="ml-1 text-sm whitespace-nowrap text-rose-600">(ตอบ {answers[it.id] ?? "–"})</span>
                    )}
                  </span>
                  {answers[it.id] === l ? (
                    <CheckOutlined className="mt-1.5 text-emerald-600" aria-label="ถูก" />
                  ) : (
                    <CloseOutlined className="mt-1.5 text-rose-600" aria-label="ผิด" />
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      />
    </div>
  );
}

// กลยุทธ์ TOWS: จับคู่ปัจจัยจาก SWOT มาสร้างกลยุทธ์ (สไลด์บทที่ 7 หน้า 44)
export function SwotTows({ set }: { set: SwotSet }) {
  const index = new Map(set.items.map((it, i) => [it.id, { n: i + 1, item: it }]));
  return (
    <div className="flex flex-col gap-6" data-testid="swot-tows">
      <p className="m-0 text-base leading-relaxed text-slate-600">
        นำผล SWOT มาจับคู่สร้างกลยุทธ์ ตัวเลขคือข้อที่กลยุทธ์นั้นนำมาใช้
      </p>
      {TOWS_KEYS.map((k) => {
        const list = set.tows[k] ?? [];
        return (
          <section key={k} data-testid="swot-tows-group">
            <h3 className="m-0 text-base font-semibold text-slate-900">
              <span className={LETTER_META[k[0] as SwotLetter].text}>{k[0]}</span>
              <span className={LETTER_META[k[1] as SwotLetter].text}>{k[1]}</span> กลยุทธ์{TOWS_META[k].th}
            </h3>
            <p className="m-0 text-sm text-slate-500">{TOWS_META[k].hint}</p>
            <ol className="m-0 mt-3 flex flex-col gap-3 pl-5 text-base text-slate-700">
              {list.map((s, i) => (
                <li key={i}>
                  <p className="m-0 leading-relaxed">{s.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-slate-500">ใช้ข้อ</span>
                    {s.uses.map((id) => {
                      const hit = index.get(id);
                      if (!hit) return null;
                      return (
                        <Tooltip key={id} title={hit.item.text}>
                          <Tag color={LETTER_META[hit.item.answer].color} className="m-0 cursor-help">
                            {hit.n} · {hit.item.answer}
                          </Tag>
                        </Tooltip>
                      );
                    })}
                  </div>
                </li>
              ))}
              {list.length === 0 && <li className="list-none text-slate-400">ไม่มีตัวอย่างในโจทย์นี้</li>}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
