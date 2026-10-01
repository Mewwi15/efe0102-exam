"use client";

import { useState } from "react";
import { Button, Card, Collapse, Drawer, Grid, Progress, Segmented, Tag } from "antd";
import { AppstoreOutlined, AimOutlined, ReloadOutlined, SwapOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { BigNumber } from "@/components/BigNumber";
import { SWOT_SETS } from "@/lib/bank";
import type { SwotProgress } from "@/lib/progress";
import type { SwotLetter, SwotSet } from "@/lib/types";
import { SwotReviewBody, SwotReviewLabel } from "./SwotRow";
import { SwotAnswerMatrix, SwotTows } from "./SwotSummary";

export type SwotScore = { correct: number; total: number; side: number; effect: number; tricky: number; trickyOk: number };

function verdict(correct: number): { text: string; color: string } {
  if (correct >= 12) return { text: "แยกปัจจัยได้แม่นมาก", color: "#059669" };
  if (correct >= 8) return { text: "ใกล้แล้ว ลองดูข้อที่ผิดอีกครั้ง", color: "#1e3a8a" };
  return { text: "กดดูคำอธิบายของข้อที่ผิด แล้วลองโจทย์ใหม่", color: "#e11d48" };
}

// หน้าเฉลย: คะแนนก่อน → เฉลยรายข้อ (ยุบไว้ กดดูคำอธิบาย) → ตาราง SWOT / TOWS ใน Collapse
export function SwotReview({
  set,
  answers,
  score,
  progress,
  allProgress,
  busy,
  onStart,
}: {
  set: SwotSet;
  answers: Record<string, SwotLetter>;
  score: SwotScore;
  progress?: SwotProgress;
  allProgress: Record<string, SwotProgress>;
  busy: boolean;
  onStart: (setId?: string) => void;
}) {
  const screens = Grid.useBreakpoint();
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [pickerOpen, setPickerOpen] = useState(false);
  const { correct, total } = score;
  const v = verdict(correct);
  const wrongCount = total - correct;

  const rows = set.items
    .map((item, i) => ({ item, n: i + 1 }))
    .filter(({ item }) => filter === "all" || answers[item.id] !== item.answer);

  const randomButton = (
    <Button type="primary" size="large" block icon={<ReloadOutlined />} loading={busy} onClick={() => onStart()} data-testid="swot-new" className="h-12">
      สุ่มโจทย์ใหม่
    </Button>
  );
  const pickButton = (
    <Button size="large" block icon={<SwapOutlined />} onClick={() => setPickerOpen(true)} data-testid="swot-pick" className="h-12">
      เลือกโจทย์เอง
    </Button>
  );

  const stat = (label: string, value: number, of: number) => (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <span className="shrink-0 font-semibold text-slate-900">
        {value}/{of}
      </span>
    </div>
  );

  return (
    <>
      <main className="mx-auto w-full max-w-7xl px-4 pt-4 lg:px-6 pb-28 sm:pt-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-6 lg:pb-6">
        <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
          <Card className="shadow-sm" classNames={{ body: "p-5 sm:p-6" }} data-testid="swot-score">
            <BigNumber label="คะแนน SWOT" tone="text-blue-900" suffix={`/ ${total}`} testId="swot-score-value">
              {correct}
            </BigNumber>
            <Progress percent={Math.round((correct / total) * 100)} strokeColor={v.color} className="m-0 mt-3" />
            <p className="m-0 mt-1 text-base text-slate-700">{v.text}</p>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-base">
              {stat("แยกภายใน/ภายนอกถูก", score.side, total)}
              {stat("แยกช่วย/ขัดขวางถูก", score.effect, total)}
              {score.tricky > 0 && stat("ข้อหลอกตอบถูก", score.trickyOk, score.tricky)}
            </div>
            {progress && progress.tries > 1 && (
              <p className="m-0 mt-3 text-sm text-slate-500">
                ทำโจทย์นี้ {progress.tries} ครั้ง · ดีสุด {progress.best}/{progress.total}
              </p>
            )}
            <div className="mt-5 hidden flex-col gap-3 lg:flex">
              {randomButton}
              {pickButton}
            </div>
          </Card>
        </aside>

        <Card
          className="mt-4 shadow-sm lg:mt-0 lg:flex lg:max-h-full lg:min-h-0 lg:flex-col lg:self-start"
          classNames={{ header: "shrink-0", body: "p-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" }}
          title={<span className="text-base">เฉลยรายข้อ</span>}
          extra={
            wrongCount > 0 && wrongCount < total ? (
              <Segmented<"all" | "wrong">
                value={filter}
                onChange={setFilter}
                data-testid="swot-filter"
                options={[
                  { value: "all", label: "ทั้งหมด" },
                  { value: "wrong", label: `ข้อที่ผิด ${wrongCount}` },
                ]}
              />
            ) : undefined
          }
          data-testid="swot-review"
        >
          <div data-testid="swot-scroll">
            <Collapse
              ghost
              expandIconPlacement="end"
              className="divide-y divide-slate-100"
              classNames={{ header: "px-5 py-4", body: "px-5 pt-0 pb-5" }}
              data-testid="swot-board"
              items={rows.map(({ item, n }) => ({
                key: item.id,
                label: <SwotReviewLabel n={n} item={item} value={answers[item.id]} />,
                children: <SwotReviewBody item={item} />,
              }))}
            />
            {rows.length === 0 && <p className="m-0 px-5 py-8 text-center text-slate-500">ถูกทุกข้อ เยี่ยมมาก</p>}

            <div className="border-t border-slate-200 p-4 sm:p-5">
              <Collapse
                data-testid="swot-more"
                items={[
                  {
                    key: "context",
                    label: (
                      <span className="font-semibold">
                        <AimOutlined className="mr-2 text-blue-900" />
                        อ่านโจทย์อีกครั้ง
                      </span>
                    ),
                    children: (
                      <div className="text-base leading-[1.7] text-slate-700">
                        <h2 className="m-0 text-base font-bold text-slate-900">{set.title}</h2>
                        <p className="m-0 mt-2">{set.context}</p>
                      </div>
                    ),
                  },
                  {
                    key: "matrix",
                    label: (
                      <span className="font-semibold">
                        <AppstoreOutlined className="mr-2 text-blue-900" />
                        ตาราง SWOT ที่ถูกต้อง
                      </span>
                    ),
                    children: <SwotAnswerMatrix set={set} answers={answers} />,
                  },
                  {
                    key: "tows",
                    label: (
                      <span className="font-semibold">
                        <ThunderboltOutlined className="mr-2 text-blue-900" />
                        กลยุทธ์ TOWS จากโจทย์นี้
                      </span>
                    ),
                    children: <SwotTows set={set} />,
                  },
                ]}
              />
            </div>
          </div>
        </Card>
      </main>

      {/* มือถือ: ปุ่มหลักติดขอบล่าง */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3">
          {pickButton}
          {randomButton}
        </div>
      </div>

      <Drawer
        title="เลือกโจทย์"
        placement={screens.lg ? "right" : "bottom"}
        size={screens.lg ? 480 : "85%"}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      >
        <div className="flex flex-col gap-3" data-testid="swot-sets">
          {SWOT_SETS.map((s, i) => {
            const p = allProgress[s.id];
            const isThis = s.id === set.id;
            return (
              <Button
                key={s.id}
                block
                size="large"
                disabled={busy}
                onClick={() => onStart(s.id)}
                data-testid="swot-set"
                data-set={s.id}
                className="h-auto flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal"
              >
                <span className="text-sm text-slate-500">
                  โจทย์ที่ {i + 1}
                  {isThis ? " · โจทย์นี้" : ""}
                </span>
                <span className="text-base leading-snug font-semibold text-slate-900">{s.title}</span>
                {p && (
                  <Tag color={p.best >= 12 ? "success" : "default"} className="m-0 mt-1">
                    ดีสุด {p.best}/{p.total}
                  </Tag>
                )}
              </Button>
            );
          })}
        </div>
      </Drawer>
    </>
  );
}
