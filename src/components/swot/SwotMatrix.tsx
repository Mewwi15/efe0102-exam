"use client";

import { Tag } from "antd";
import { LETTER_META } from "@/lib/swot-meta";
import type { SwotLetter } from "@/lib/types";

// ตาราง 2×2 แบบสไลด์บทที่ 7 หน้า 37: แถว = ปัจจัยภายใน/ภายนอก, คอลัมน์ = ช่วย/ทำให้ไม่บรรลุวัตถุประสงค์
// compact = ตารางเล็กในวิธีคิด (2×2 ทุกขนาดจอ) · ไม่ compact = จอเล็กเรียง 4 ช่องเป็นแถวเดียว
export function SwotMatrix({
  renderCell,
  compact = false,
}: {
  renderCell?: (letter: SwotLetter) => React.ReactNode;
  compact?: boolean;
}) {
  const head = `text-center text-sm leading-snug font-semibold text-slate-500 ${compact ? "" : "hidden sm:block"}`;
  const side = `items-center justify-center rounded-lg bg-slate-50 px-2 text-sm font-semibold text-slate-600 ${
    compact ? "flex" : "hidden sm:flex"
  }`;
  const cell = (l: SwotLetter) => {
    const m = LETTER_META[l];
    return (
      <div key={l} className={`min-w-0 rounded-lg border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Tag color={m.color} className="m-0 font-bold">
            {l}
          </Tag>
          <span className="font-semibold text-slate-800">{m.th}</span>
          {!compact && (
            <span className="w-full text-sm text-slate-500 sm:hidden">
              ปัจจัย{m.internal ? "ภายใน" : "ภายนอก"} · {m.helps ? "ช่วยให้บรรลุ" : "ทำให้ไม่บรรลุ"}
            </span>
          )}
        </div>
        {renderCell?.(l)}
      </div>
    );
  };
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-[4rem_1fr_1fr]" : "grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr]"}`}>
      <div className={compact ? "" : "hidden sm:block"} />
      <div className={head}>ช่วยให้บรรลุวัตถุประสงค์</div>
      <div className={head}>ทำให้ไม่บรรลุวัตถุประสงค์</div>
      <div className={side}>ภายใน</div>
      {cell("S")}
      {cell("W")}
      <div className={side}>ภายนอก</div>
      {cell("O")}
      {cell("T")}
    </div>
  );
}
