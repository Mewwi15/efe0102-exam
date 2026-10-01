"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Collapse, Empty, Progress, Segmented, Tag } from "antd";
import {
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  DownOutlined,
  EditOutlined,
  ExperimentOutlined,
  MinusCircleOutlined,
  RedoOutlined,
  TableOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { Disclaimer } from "@/components/Brand";
import { AppHeader, HomeButton } from "@/components/AppHeader";
import { BigNumber } from "@/components/BigNumber";
import { CHAPTERS, SHORTS, SWOT_SETS, chapterById, chapterLabel } from "@/lib/bank";
import { CHOICE_LABELS, MCQ_POINTS, formatUsed, toPoints } from "@/lib/exam-meta";
import { answerStatus, displayOrder, isMcqSession, sessionQuestions, usedSeconds, type AnswerStatus } from "@/lib/exam-view";
import {
  SESSION_KIND_LABEL,
  createPracticeSession,
  createReviewSession,
  createShortSession,
  createSwotSession,
  deleteSession,
  getName,
  loadSession,
  sessionHref,
  type Session,
} from "@/lib/session";
import type { Mcq } from "@/lib/types";
import { ChoiceList, ExplainPanel } from "./Explain";
import { FullPageSpin, SessionMissing } from "@/components/SessionState";

type Filter = "all" | "wrong" | "blank" | "right";
// รายการเฉลยแสดงทีละ 10 ข้อ กด "ดูเพิ่ม" ได้
const PAGE = 10;
// ผลรายบทแสดงเฉพาะบทที่อ่อนสุดก่อน
const WEAKEST = 3;

export default function ResultClient({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = loadSession(id);
    // ยังไม่ส่ง กลับไปทำต่อ (ไม่ให้เห็นเฉลยก่อน)
    if (isMcqSession(s) && s.finishedAt === null) {
      router.replace(`/exam/${id}`);
      return;
    }
    // รอบเขียนตอบ/SWOT มีสรุปผลในหน้าของตัวเอง
    if (s && !isMcqSession(s) && sessionHref(s) !== `/exam/${id}`) {
      router.replace(sessionHref(s));
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setSession(s);
  }, [id, router]);

  if (session === undefined) return <FullPageSpin />;
  if (!isMcqSession(session)) return <SessionMissing title="ไม่พบผลของชุดข้อสอบนี้" />;
  return <ResultView key={session.id} s={session} />;
}

function ResultView({ s }: { s: Session }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [allChapters, setAllChapters] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const questions = useMemo(() => sessionQuestions(s), [s]);
  const answers = s.mcq!.answers;
  const isMock = s.kind === "mock";
  const total = questions.length;

  const items = useMemo(
    () => questions.map((q, i) => ({ q, n: i + 1, status: answerStatus(q, answers[q.id]) })),
    [questions, answers],
  );
  const counts = useMemo(() => {
    const c: Record<AnswerStatus, number> = { right: 0, wrong: 0, blank: 0 };
    for (const it of items) c[it.status]++;
    return c;
  }, [items]);
  const rows = useMemo(() => items.filter((it) => filter === "all" || it.status === filter), [items, filter]);
  const pct = total ? Math.round((counts.right / total) * 100) : 0;

  // ผลรายบท อ่อนสุดก่อน
  const byChapter = useMemo(() => {
    const map = new Map<string, { right: number; total: number }>();
    for (const it of items) {
      const row = map.get(it.q.chapterId) ?? { right: 0, total: 0 };
      row.total++;
      if (it.status === "right") row.right++;
      map.set(it.q.chapterId, row);
    }
    return [...map.entries()]
      .map(([chapterId, r]) => ({ chapterId, ...r, pct: r.total ? r.right / r.total : 0 }))
      .sort((a, b) => a.pct - b.pct || b.total - a.total || a.chapterId.localeCompare(b.chapterId));
  }, [items]);
  const chapterRows = allChapters ? byChapter : byChapter.slice(0, WEAKEST);

  // จำลองสอบ: ข้อที่ไม่ได้ตอบนับเป็นข้อที่ต้องฝึกด้วย, โหมดฝึก: เฉพาะข้อที่ตอบผิด
  const missedIds = items.filter((it) => it.status === "wrong" || (isMock && it.status === "blank")).map((it) => it.q.id);
  const name = s.name || getName();
  const used = formatUsed(usedSeconds(s));
  const when = new Date(s.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

  const open = (key: string, make: () => Session, empty: (x: Session) => boolean) => {
    setBusy(key);
    const next = make();
    if (empty(next)) {
      deleteSession(next.id);
      message.warning("ยังไม่มีข้อในส่วนนี้");
      setBusy(null);
      return;
    }
    router.push(sessionHref(next));
  };

  const changeFilter = (v: Filter) => {
    setFilter(v);
    setShown(PAGE);
    listRef.current?.scrollTo({ top: 0 });
  };

  const filterLabel = (text: string, n: number) => (
    <span className="flex flex-col items-center justify-center leading-snug sm:flex-row sm:gap-1.5">
      <span>{text}</span>
      <b className="tabular-nums">{n}</b>
    </span>
  );
  const filterOptions = [
    { label: filterLabel("ทั้งหมด", total), value: "all" as Filter },
    { label: filterLabel("ผิด", counts.wrong), value: "wrong" as Filter },
    ...(counts.blank > 0 ? [{ label: filterLabel("ไม่ได้ตอบ", counts.blank), value: "blank" as Filter }] : []),
    { label: filterLabel("ถูก", counts.right), value: "right" as Filter },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0">
      <AppHeader actions={<HomeButton />} sticky={false} />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:min-h-0 lg:px-6 lg:flex-1 lg:gap-5 lg:py-5">
        {/* สรุปคะแนน + สิ่งที่ทำต่อ */}
        <Card className="shrink-0 shadow-sm" classNames={{ body: "p-5 sm:p-6 lg:px-6 lg:py-5" }} data-testid="summary">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="m-0 text-xl font-bold text-slate-900">{name || "ผลการทำข้อสอบ"}</h1>
                <Tag color={isMock ? "blue" : s.kind === "review" ? "volcano" : "cyan"} className="m-0">
                  {SESSION_KIND_LABEL[s.kind]}
                </Tag>
              </div>
              <div className="mt-1 text-sm text-slate-500">
                ใช้เวลา {used} · {when}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-md">
                {isMock ? (
                  <BigNumber label="คะแนนปรนัย" tone="text-blue-900" suffix={`/ ${MCQ_POINTS}`} testId="score-points">
                    {toPoints(counts.right, total).toFixed(1)}
                  </BigNumber>
                ) : (
                  <BigNumber label="ร้อยละที่ถูก" tone={pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"} suffix="%">
                    {pct}
                  </BigNumber>
                )}
                <BigNumber label="ตอบถูก" tone="text-green-600" suffix={`/ ${total} ข้อ`} testId="score-correct">
                  {counts.right}
                </BigNumber>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8" data-testid="next-steps">
              <Button
                type="primary"
                block
                className="h-12 text-base"
                icon={<RedoOutlined />}
                disabled={missedIds.length === 0}
                loading={busy === "review"}
                onClick={() =>
                  open("review", () => createReviewSession({ name, ids: missedIds }), (x) => !x.mcq?.ids.length)
                }
                data-testid="review-wrong"
              >
                ฝึกข้อที่พลาด ({missedIds.length} ข้อ)
              </Button>
              <p className="m-0 mt-2 text-center text-sm text-slate-500">
                {missedIds.length === 0
                  ? "ไม่มีข้อที่พลาดในชุดนี้"
                  : isMock && counts.blank > 0
                    ? `ตอบผิด ${counts.wrong} ข้อ + ไม่ได้ตอบ ${counts.blank} ข้อ`
                    : "ทำซ้ำเฉพาะข้อที่ตอบผิด พร้อมเฉลยทันที"}
              </p>
              <div className="mt-5 text-sm font-medium text-slate-500">ต่อพาร์ตเขียน (ข้อสอบกระดาษ)</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button
                  className="h-11"
                  icon={<EditOutlined />}
                  disabled={SHORTS.length === 0}
                  loading={busy === "short"}
                  onClick={() =>
                    open(
                      "short",
                      () => createShortSession({ name, chapterIds: CHAPTERS.map((c) => c.id), count: 6 }),
                      (x) => !x.short?.ids.length,
                    )
                  }
                >
                  เขียนตอบ 6 ข้อ
                </Button>
                <Button
                  className="h-11"
                  icon={<TableOutlined />}
                  disabled={SWOT_SETS.length === 0}
                  loading={busy === "swot"}
                  onClick={() => open("swot", () => createSwotSession({ name, setId: "random" }), (x) => !x.swot?.setId)}
                >
                  SWOT 15 ข้อ
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-5">
          {/* รายบท: บทที่อ่อนสุด 3 บทก่อน */}
          <Card
            className="shadow-sm lg:flex lg:min-h-0 lg:flex-col"
            title={
              <span>
                ผลรายบท <span className="ml-1 text-sm font-normal text-slate-500">อ่อนสุดก่อน</span>
              </span>
            }
            extra={
              byChapter.length > WEAKEST && (
                <Button
                  type="link"
                  className="h-11 px-1 lg:h-8"
                  icon={allChapters ? <UpOutlined /> : <DownOutlined />}
                  iconPlacement="end"
                  onClick={() => setAllChapters((v) => !v)}
                  aria-expanded={allChapters}
                  data-testid="all-chapters"
                >
                  {allChapters ? `ย่อเหลือ ${WEAKEST} บท` : `ดูทุกบท (${byChapter.length})`}
                </Button>
              )
            }
            classNames={{ body: "min-h-0 flex-1 px-5 py-2 lg:overflow-y-auto" }}
            data-testid="by-chapter"
          >
            <ul className="m-0 list-none p-0">
              {chapterRows.map((r) => {
                const ch = chapterById(r.chapterId);
                const p = Math.round(r.pct * 100);
                return (
                  <li key={r.chapterId} className="border-b border-slate-100 py-3 last:border-b-0" data-testid="chapter-row">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 leading-snug">
                        <b className="text-slate-900">{chapterLabel(ch)}</b>
                        <div className="text-sm text-slate-500">{ch?.title}</div>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {r.right}/{r.total}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <Progress
                        className="m-0 min-w-0 flex-1"
                        percent={p}
                        showInfo={false}
                        strokeColor={p >= 70 ? "#16a34a" : p >= 50 ? "#f59e0b" : "#dc2626"}
                      />
                      <Button
                        type="link"
                        className="h-11 shrink-0 px-1 lg:h-8"
                        icon={<ExperimentOutlined />}
                        loading={busy === r.chapterId}
                        onClick={() =>
                          open(
                            r.chapterId,
                            () => createPracticeSession({ name, chapterIds: [r.chapterId], count: 10, coreOnly: false }),
                            (x) => !x.mcq?.ids.length,
                          )
                        }
                      >
                        ฝึกบทนี้
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* เฉลยรายข้อ: ย่อไว้ กดเปิดดูคำอธิบายทีละข้อ */}
          <Card
            className="min-w-0 shadow-sm lg:flex lg:min-h-0 lg:flex-col"
            title="เฉลยรายข้อ"
            classNames={{ body: "flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-5" }}
            data-testid="review"
          >
            <Segmented<Filter>
              block
              className="shrink-0"
              classNames={{ label: "px-1 py-1.5 whitespace-normal sm:py-1" }}
              value={filter}
              onChange={changeFilter}
              options={filterOptions}
              data-testid="review-filter"
            />
            <div ref={listRef} className="min-h-0 flex-1 space-y-3 lg:overflow-y-auto lg:pr-1" data-testid="review-list">
              {rows.slice(0, shown).map((it) => (
                <ReviewItem key={it.q.id} s={s} q={it.q} n={it.n} status={it.status} />
              ))}
              {rows.length === 0 && <Empty className="py-8" image={Empty.PRESENTED_IMAGE_SIMPLE} description="ไม่มีข้อในหมวดนี้" />}
              {rows.length > shown && (
                <Button block className="h-11" onClick={() => setShown((v) => v + PAGE)} data-testid="more">
                  ดูอีก {Math.min(PAGE, rows.length - shown)} ข้อ (เหลือ {rows.length - shown})
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
      <Disclaimer className="py-6 lg:hidden" />
    </div>
  );
}

// ย่อไว้: โจทย์ + ถูก/ผิด + คำตอบที่ถูก, เปิดแล้ว: ตัวเลือกทั้งหมด + คำอธิบาย + ที่มา
function ReviewItem({ s, q, n, status }: { s: Session; q: Mcq; n: number; status: AnswerStatus }) {
  const [open, setOpen] = useState(false);
  const order = displayOrder(s, q);
  const keyPos = order.indexOf(q.answer);
  const answer = s.mcq!.answers[q.id];
  const mineText =
    status === "wrong" && answer !== undefined ? `คุณตอบ ${CHOICE_LABELS[order.indexOf(answer)] ?? ""}.` : status === "blank" ? "ไม่ได้ตอบ" : "";
  return (
    <div data-testid="review-item" data-status={status}>
      <Collapse
        className="bg-white"
        activeKey={open ? ["x"] : []}
        onChange={(k) => setOpen(k.length > 0)}
        destroyOnHidden
        classNames={{ header: "px-4 py-4 sm:px-5", body: "px-4 pt-1 pb-5 sm:px-5" }}
        items={[
          {
            key: "x",
            showArrow: false,
            label: (
              <div className="flex items-start gap-3">
                {status === "right" && <CheckCircleFilled className="mt-1 shrink-0 text-xl text-green-600" aria-label="ตอบถูก" />}
                {status === "wrong" && <CloseCircleFilled className="mt-1 shrink-0 text-xl text-red-600" aria-label="ตอบผิด" />}
                {status === "blank" && <MinusCircleOutlined className="mt-1 shrink-0 text-xl text-slate-400" aria-label="ไม่ได้ตอบ" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-500">
                    ข้อ {n} · {chapterLabel(q.chapterId)}
                    {mineText && <span className={status === "wrong" ? "text-red-600" : ""}> · {mineText}</span>}
                  </div>
                  <p className="m-0 mt-1 leading-[1.7] font-medium whitespace-pre-line text-slate-900">{q.q}</p>
                  <p className="m-0 mt-2 leading-[1.7] text-green-700" data-testid="review-key">
                    <CheckOutlined className="mr-1.5" />
                    {CHOICE_LABELS[keyPos]}. {q.choices[q.answer]}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-900">
                    {open ? <UpOutlined /> : <DownOutlined />}
                    {open ? "ซ่อนคำอธิบาย" : "ดูคำอธิบาย"}
                  </span>
                </div>
              </div>
            ),
            children: (
              <div className="space-y-4">
                <ChoiceList q={q} order={order} answer={answer} />
                <ExplainPanel q={q} order={order} showQuote />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
