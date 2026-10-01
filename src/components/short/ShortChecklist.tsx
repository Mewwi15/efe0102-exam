"use client";

import { Checkbox } from "antd";
import type { PointMatch } from "@/lib/keyword-match";

// ประเด็นให้คะแนนของหนึ่งข้อ: สร้างจาก array เดียว สถานะต่อประเด็นอยู่ที่ pointItems() ที่เดียว
// found = คำสำคัญที่พบในคำตอบที่พิมพ์ (ตามที่เขียนในคลัง) · auto = ระบบติ๊กให้ตอนดูแนวคำตอบ
export type PointItem = { index: number; text: string; ticked: boolean; auto: boolean; found: string[] };

export function pointItems(
  points: string[],
  ticks: number[],
  { auto = [], matches = [] }: { auto?: number[]; matches?: PointMatch[] } = {},
): PointItem[] {
  const on = new Set(ticks);
  const byAuto = new Set(auto);
  return points.map((text, index) => ({
    index,
    text,
    ticked: on.has(index),
    auto: byAuto.has(index),
    found: matches[index]?.matched ?? [],
  }));
}

export function ShortChecklist({
  items,
  onToggle,
}: {
  items: PointItem[];
  onToggle: (index: number, on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <PointRow key={it.index} item={it} onToggle={onToggle} />
      ))}
    </div>
  );
}

function PointRow({ item, onToggle }: { item: PointItem; onToggle: (index: number, on: boolean) => void }) {
  // ป้ายแสดงเฉพาะประเด็นที่ระบบติ๊กให้และยังติ๊กอยู่ (ถ้านักเรียนเอาออกเอง ป้ายก็หายไปด้วย)
  const showFound = item.auto && item.ticked && item.found.length > 0;
  return (
    <Checkbox
      checked={item.ticked}
      onChange={(e) => onToggle(item.index, e.target.checked)}
      className={`m-0 flex min-h-11 w-full items-start rounded-xl border px-4 py-3 transition-colors ${
        item.ticked ? "border-green-200 bg-green-50" : "border-slate-200 bg-white hover:border-blue-300"
      }`}
      classNames={{ icon: "mt-[5px] self-start", label: "min-w-0 flex-1 pe-0 ps-3" }}
      data-testid="point"
      data-auto={showFound ? "1" : undefined}
    >
      <span className="block text-base leading-[1.7] text-slate-800">{item.text}</span>
      {showFound && (
        <span className="mt-1 block text-sm leading-[1.6] text-slate-500" data-testid="kw-found">
          เจอคำว่า {item.found.map((k) => `“${k}”`).join(" ")}
        </span>
      )}
    </Checkbox>
  );
}
