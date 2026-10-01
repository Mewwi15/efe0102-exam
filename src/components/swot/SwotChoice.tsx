"use client";

import { Button } from "antd";
import { LETTER_META } from "@/lib/swot-meta";
import type { SwotLetter } from "@/lib/types";

const ROWS: { side: string; letters: [SwotLetter, SwotLetter] }[] = [
  { side: "ปัจจัยภายใน", letters: ["S", "W"] },
  { side: "ปัจจัยภายนอก", letters: ["O", "T"] },
];

// ปุ่มตอบ 2×2 ขนาดใหญ่ วางแบบตารางในสไลด์: แถวบน = ภายใน (S W), แถวล่าง = ภายนอก (O T)
export function SwotChoice({
  value,
  onChange,
  label,
}: {
  value?: SwotLetter;
  onChange: (letter: SwotLetter) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-4" data-testid="swot-choice">
      {ROWS.map((row) => (
        <div key={row.side}>
          <div className="mb-2 text-sm font-medium text-slate-500">{row.side}</div>
          <div className="grid grid-cols-2 gap-3">
            {row.letters.map((l) => {
              const meta = LETTER_META[l];
              const picked = value === l;
              return (
                <Button
                  key={l}
                  color={picked ? meta.color : "default"}
                  variant={picked ? "solid" : "outlined"}
                  aria-pressed={picked}
                  aria-label={`${l} ${meta.th}`}
                  data-letter={l}
                  onClick={() => onChange(l)}
                  className="h-16 justify-start gap-3 px-4"
                >
                  <span className={`text-2xl leading-none font-bold ${picked ? "text-white" : meta.text}`}>{l}</span>
                  <span className="text-base">{meta.th}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
