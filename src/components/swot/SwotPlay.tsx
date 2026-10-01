"use client";

import { useEffect, useState } from "react";
import { Button, Card, Drawer, Grid, Typography } from "antd";
import { BulbOutlined, CheckSquareOutlined, LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { SwotLetter, SwotSet } from "@/lib/types";
import { SwotChips } from "./SwotChips";
import { SwotChoice } from "./SwotChoice";
import { SwotHint } from "./SwotHint";

const KEY_LETTER: Record<string, SwotLetter> = { s: "S", w: "W", o: "O", t: "T", "1": "S", "2": "W", "3": "O", "4": "T" };

// หน้าตอบ: สถานการณ์ (ย่อไว้) → ข้อความทีละข้อ + ปุ่ม 2×2 → เลขข้อ 15 ปุ่ม → ตรวจคำตอบ
export function SwotPlay({
  set,
  answers,
  current,
  answered,
  onChoose,
  onJump,
  onCheck,
}: {
  set: SwotSet;
  answers: Record<string, SwotLetter>;
  current: number;
  answered: number;
  onChoose: (letter: SwotLetter) => void;
  onJump: (index: number) => void;
  onCheck: () => void;
}) {
  const screens = Grid.useBreakpoint();
  const [hintOpen, setHintOpen] = useState(false);
  const total = set.items.length;
  const item = set.items[current];
  const done = answered === total;

  // คีย์ลัดบนคอม: S W O T หรือ 1–4 เลือกคำตอบ · ลูกศรซ้าย/ขวาเปลี่ยนข้อ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hintOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable=true], .ant-modal")) return;
      const letter = KEY_LETTER[e.key.toLowerCase()];
      if (letter) onChoose(letter);
      else if (e.key === "ArrowLeft") onJump(current - 1);
      else if (e.key === "ArrowRight") onJump(current + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, hintOpen, onChoose, onJump]);

  const checkButton = (
    <Button
      type="primary"
      size="large"
      block
      icon={<CheckSquareOutlined />}
      onClick={onCheck}
      data-testid="swot-check"
      className="h-12"
    >
      ตรวจคำตอบ
    </Button>
  );

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 pt-4 lg:px-6 pb-28 sm:pt-6 lg:pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6 lg:pb-8">
        <div className="flex flex-col gap-4 lg:gap-5">
          {/* สถานการณ์ของโจทย์ แสดง 2 บรรทัดแรก กดอ่านต่อได้ */}
          <Card className="shadow-sm" classNames={{ body: "p-5 sm:p-6" }} data-testid="swot-context">
            {/* มือถือ: ป้าย + ปุ่มวิธีคิดแถวบน ชื่อโจทย์เต็มแถวล่าง · จอกว้าง: ปุ่มอยู่ขวาของชื่อโจทย์ */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
              <span className="col-start-1 row-start-1 self-center text-sm font-semibold text-blue-900">โจทย์</span>
              <Button
                icon={<BulbOutlined className="text-amber-500" />}
                onClick={() => setHintOpen(true)}
                data-testid="swot-hint-open"
                className="col-start-2 row-start-1 h-11 lg:row-span-2"
              >
                วิธีคิด
              </Button>
              <h1 className="col-span-2 row-start-2 m-0 mt-2 text-lg leading-snug font-bold text-slate-900 lg:col-span-1 lg:mt-0.5">
                {set.title}
              </h1>
            </div>
            <Typography.Paragraph
              className="m-0 mt-2 text-base leading-[1.7] text-slate-600"
              ellipsis={{ rows: 2, expandable: "collapsible", symbol: (open) => (open ? "ย่อ" : "อ่านต่อ") }}
            >
              {set.context}
            </Typography.Paragraph>
          </Card>

          {/* ข้อความทีละข้อ */}
          <Card className="shadow-sm" classNames={{ body: "p-5 sm:p-6" }} data-testid="swot-question">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-blue-900" data-testid="swot-pos">
                ข้อ {current + 1} <span className="text-base font-normal text-slate-400">/ {total}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  aria-label="ข้อก่อนหน้า"
                  icon={<LeftOutlined />}
                  disabled={current === 0}
                  onClick={() => onJump(current - 1)}
                  className="size-11"
                />
                <Button
                  aria-label="ข้อถัดไป"
                  icon={<RightOutlined />}
                  disabled={current === total - 1}
                  onClick={() => onJump(current + 1)}
                  className="size-11"
                  data-testid="swot-next"
                />
              </div>
            </div>
            <p
              className="m-0 mt-4 mb-6 text-lg leading-[1.7] font-medium text-slate-900 sm:text-xl"
              data-testid="swot-statement"
              data-id={item.id}
            >
              {item.text}
            </p>
            <SwotChoice key={item.id} value={answers[item.id]} onChange={onChoose} label={`คำตอบข้อ ${current + 1}`} />
          </Card>
        </div>

        {/* เลขข้อทั้งหมด: สีตามคำตอบ กดย้อนไปแก้ได้ */}
        <aside className="mt-4 lg:mt-0">
          <Card className="shadow-sm" classNames={{ body: "p-5" }}>
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-900">ทุกข้อ</span>
              <span className={`text-sm ${done ? "font-semibold text-emerald-700" : "text-slate-500"}`} data-testid="swot-answered">
                {done ? "ตอบครบ 15/15 แล้ว" : `ตอบแล้ว ${answered}/${total}`}
              </span>
            </div>
            <SwotChips items={set.items} answers={answers} current={current} onJump={onJump} />
            <div className="mt-5 hidden lg:block">{checkButton}</div>
          </Card>
        </aside>
      </main>

      {/* มือถือ: ปุ่มหลักติดขอบล่าง */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl">{checkButton}</div>
      </div>

      <Drawer
        title="วิธีคิด SWOT"
        placement={screens.lg ? "right" : "bottom"}
        size={screens.lg ? 480 : "85%"}
        open={hintOpen}
        onClose={() => setHintOpen(false)}
      >
        <SwotHint />
      </Drawer>
    </>
  );
}
