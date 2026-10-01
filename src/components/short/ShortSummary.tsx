"use client";

import { Button, Card, Collapse, Tag } from "antd";
import { CheckCircleFilled, ExportOutlined, ReloadOutlined, RightOutlined } from "@ant-design/icons";
import { BigNumber } from "@/components/BigNumber";
import { chapterById, chapterLabel, slideUrl } from "@/lib/bank";
import type { Session } from "@/lib/session";
import { tickedCount } from "@/lib/short-format";
import type { ShortQ } from "@/lib/types";

function advice(pct: number, unrevealed: number): string {
  if (unrevealed > 0) return "ยังมีข้อที่ไม่ได้ตรวจ เปิดข้อนั้นแล้วดูแนวคำตอบให้ครบ จะเห็นผลที่แท้จริง";
  if (pct >= 80) return "ครบประเด็นเกือบทั้งหมดแล้ว ตอนสอบเขียนเป็นข้อๆ ตามประเด็นแบบนี้ ใช้คำสำคัญจากสไลด์";
  if (pct >= 50) return "ได้เกินครึ่งแล้ว เปิดดูประเด็นที่ยังขาดในรายข้อ แล้วลองชุดใหม่อีกรอบ";
  return "ประเด็นยังขาดหลายข้อ เปิดรายข้อดูสไลด์ตามหน้าที่ระบุ อ่านแล้วลองเขียนใหม่";
}

// สรุปผลหลังจบชุด: คะแนนรวม รายข้อ และประเด็นที่ควรทบทวน
export function ShortSummary({
  session,
  questions,
  onOpen,
  onNew,
  busy,
}: {
  session: Session;
  questions: ShortQ[];
  onOpen: (index: number) => void;
  onNew: () => void;
  busy: boolean;
}) {
  const sh = session.short!;
  const revealed = new Set(sh.revealed);
  const rows = questions.map((q) => {
    const ticks = sh.ticks[q.id] ?? [];
    return {
      q,
      revealed: revealed.has(q.id),
      written: !!sh.responses[q.id]?.trim(),
      got: tickedCount(ticks, q.points.length),
      total: q.points.length,
      missed: q.points.filter((_, i) => !ticks.includes(i)),
    };
  });
  const got = rows.reduce((a, r) => a + r.got, 0);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const pct = total ? Math.round((got / total) * 100) : 0;
  const unrevealed = rows.filter((r) => !r.revealed).length;
  const written = rows.filter((r) => r.written).length;

  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[380px_1fr] lg:gap-6 lg:px-6 lg:py-6"
      data-testid="short-summary"
    >
      {/* ผลรวมก่อน */}
      <Card className="shadow-sm lg:min-h-0 lg:self-start lg:overflow-y-auto" classNames={{ body: "p-5 sm:p-6" }}>
        {/* หัวแบบเดียวกับหน้าผลปรนัย: ชื่อ + ชนิด → บรรทัดรอง → ตัวเลขใหญ่ */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="m-0 text-xl font-bold break-words text-slate-900">{session.name || "ผู้ฝึก"}</h1>
          <Tag color="purple" className="m-0">
            เขียนตอบสั้น
          </Tag>
        </div>
        <div className="mt-1 text-sm text-slate-500">
          เขียนแล้ว {written}/{rows.length} ข้อ · ตรวจแล้ว {rows.length - unrevealed}/{rows.length} ข้อ
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4" data-testid="summary-score" data-got={got} data-total={total}>
          <BigNumber label="ประเด็นที่ได้" tone="text-blue-900" suffix={`/ ${total}`}>
            {got}
          </BigNumber>
          <BigNumber label="ร้อยละ" tone={pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"} suffix="%">
            {pct}
          </BigNumber>
        </div>
        <p className="mt-5 mb-0 rounded-xl bg-slate-50 px-4 py-3 text-base leading-[1.7] text-slate-700">{advice(pct, unrevealed)}</p>
        <Button type="primary" size="large" block icon={<ReloadOutlined />} onClick={onNew} loading={busy} className="mt-5 h-12" data-testid="new-set">
          ทำชุดใหม่
        </Button>
      </Card>

      {/* รายข้อแบบกะทัดรัด ประเด็นที่ขาดซ่อนไว้ใน Collapse */}
      <Card
        title="รายข้อ"
        extra={<span className="text-sm text-slate-500">กดเพื่อดูประเด็นที่ขาด</span>}
        className="shadow-sm lg:flex lg:min-h-0 lg:flex-col"
        classNames={{ header: "px-5 sm:px-6", body: "px-2 py-2 sm:px-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" }}
      >
        <Collapse
          ghost
          expandIconPlacement="end"
          classNames={{ header: "items-start px-3 py-4", body: "px-3 pt-0 pb-5" }}
          items={rows.map((r, i) => {
            const ch = chapterById(r.q.chapterId);
            const url = slideUrl(r.q.chapterId);
            return {
              key: r.q.id,
              className: "border-b border-slate-100 last:border-b-0",
              label: (
                <div data-testid="summary-row">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">ข้อ {i + 1}</span>
                    <span className="text-sm text-slate-500">{chapterLabel(ch)}</span>
                    {r.revealed ? (
                      <Tag color={r.got === r.total ? "green" : r.got > 0 ? "blue" : "red"} className="m-0">
                        ได้ {r.got}/{r.total} ประเด็น
                      </Tag>
                    ) : (
                      <Tag color="orange" className="m-0">
                        ยังไม่ได้ตรวจ
                      </Tag>
                    )}
                  </div>
                  <p className="mt-1 mb-0 text-base leading-[1.7] text-slate-600">{r.q.q}</p>
                </div>
              ),
              children: (
                <div>
                  {r.missed.length === 0 ? (
                    <div className="flex items-center gap-2 text-base text-green-700">
                      <CheckCircleFilled /> ครบทุกประเด็น
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 text-sm font-semibold text-slate-500">
                        {r.revealed ? `ประเด็นที่ยังขาด (${r.missed.length})` : `ประเด็นที่ต้องเขียนให้ได้ (${r.missed.length})`}
                      </div>
                      <ul className="m-0 list-disc space-y-2 pl-5 text-base leading-[1.7] text-slate-700 marker:text-slate-400">
                        {r.missed.map((m, k) => (
                          <li key={k}>{m}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={() => onOpen(i)} className="h-11 lg:h-10">
                      เปิดข้อนี้ <RightOutlined />
                    </Button>
                    {url && (
                      <Button href={url} target="_blank" rel="noreferrer" icon={<ExportOutlined />} className="h-11 lg:h-10">
                        เปิดสไลด์{r.q.source.pages.length > 0 && ` หน้า ${r.q.source.pages.join(", ")}`}
                      </Button>
                    )}
                  </div>
                </div>
              ),
            };
          })}
        />
      </Card>
    </main>
  );
}
