"use client";

import { Button } from "antd";
import { LETTER_META } from "@/lib/swot-meta";
import type { SwotItem, SwotLetter } from "@/lib/types";

// ปุ่มเลขข้อ 15 ปุ่ม สีตามตัวอักษรที่เลือก กดเพื่อย้อนไปข้อนั้น
export function SwotChips({
  items,
  answers,
  current,
  onJump,
}: {
  items: SwotItem[];
  answers: Record<string, SwotLetter>;
  current: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2" data-testid="swot-chips">
      {items.map((it, i) => {
        const a = answers[it.id];
        const cur = i === current;
        return (
          <Button
            key={it.id}
            color={a ? LETTER_META[a].color : "default"}
            variant={a ? "solid" : "outlined"}
            aria-current={cur ? "step" : undefined}
            aria-label={`ข้อ ${i + 1} ${a ? `ตอบ ${a} ${LETTER_META[a].th}` : "ยังไม่ตอบ"}`}
            data-testid="swot-chip"
            data-letter={a}
            onClick={() => onJump(i)}
            className={`h-11 w-full px-0 text-base font-semibold ${cur ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}
          >
            {i + 1}
          </Button>
        );
      })}
    </div>
  );
}
