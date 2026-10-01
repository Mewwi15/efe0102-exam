"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Drawer, Input, Popconfirm, Tag } from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CheckOutlined,
  DownOutlined,
  EyeOutlined,
  FileSearchOutlined,
  ExportOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { AppHeader, HomeButton } from "@/components/AppHeader";
import { FullPageSpin, SessionMissing } from "@/components/SessionState";
import { chapterById, chapterLabel, shortById, slideUrl } from "@/lib/bank";
import { recordShort } from "@/lib/progress";
import { createShortSession, deleteSession, loadSession, saveSession, sessionHref, type Session } from "@/lib/session";
import { matchKeywords, matchedPoints } from "@/lib/keyword-match";
import { tickedCount } from "@/lib/short-format";
import type { ShortQ } from "@/lib/types";
import { AnswerText } from "./AnswerText";
import { ShortChecklist, pointItems } from "./ShortChecklist";
import { ShortNavigator, type ShortNavItem } from "./ShortNavigator";
import { ShortSummary } from "./ShortSummary";
import { YourAnswer } from "./YourAnswer";

export default function ShortClient({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const s = loadSession(id);
    // เป็นรอบชนิดอื่น ไปหน้าของรอบนั้น
    if (s && s.kind !== "short") {
      router.replace(sessionHref(s));
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setSession(s);
  }, [id, router]);

  if (session === undefined) return <FullPageSpin />;
  if (!session || !session.short) return <SessionMissing title="ไม่พบชุดเขียนตอบนี้ในเบราว์เซอร์" />;
  return <ShortRunner key={session.id} initial={session} />;
}

// จำนวนบรรทัดของช่องคำตอบ: จอเดสก์ท็อปสูงเท่าไรก็ขยายให้เต็มการ์ด (ไม่ต้องเลื่อนหน้า) มือถือใช้ค่าคงที่
function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
function textRows(): number {
  if (window.innerWidth < 1024) return 0;
  // บรรทัดละ ~27px (16px × 1.7) หักหัวเว็บ ระยะขอบ โจทย์ และแถบปุ่มท้ายการ์ด
  return Math.max(6, Math.min(22, Math.floor((window.innerHeight - 440) / 27)));
}
function useTextRows(): { minRows: number; maxRows: number } {
  const lg = useSyncExternalStore(subscribeResize, textRows, () => 0);
  return lg ? { minRows: Math.max(6, lg - 3), maxRows: lg } : { minRows: 7, maxRows: 16 };
}

function pagesText(pages: number[]): string {
  return pages.length ? `สไลด์หน้า ${pages.join(", ")}` : "";
}

// ── หน้าทำข้อเขียนตอบสั้น ────────────────────────────────────────────────────
function ShortRunner({ initial }: { initial: Session }) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const [s, setS] = useState<Session>(initial);
  const [view, setView] = useState<"work" | "summary">(initial.finishedAt ? "summary" : "work");
  const [navOpen, setNavOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rows = useTextRows();
  const answerRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<HTMLDivElement>(null);

  // ทุกการเปลี่ยนแปลงบันทึกลง localStorage ทันที (รีเฟรชแล้วยังอยู่ครบ)
  const update = useCallback((fn: (prev: Session) => Session) => {
    setS((prev) => {
      const next = fn(prev);
      saveSession(next);
      return next;
    });
  }, []);

  const short = s.short!;
  // ข้อที่ยังมีในคลัง (คลังอาจถูกแก้ไขหลังสร้างชุด)
  const qs = useMemo(() => short.ids.map((id) => shortById(id)).filter((q): q is ShortQ => !!q), [short.ids]);
  const index = Math.min(Math.max(0, s.current ?? 0), Math.max(0, qs.length - 1));
  const revealedSet = useMemo(() => new Set(short.revealed), [short.revealed]);

  const navItems: ShortNavItem[] = useMemo(
    () =>
      qs.map((q) => ({
        id: q.id,
        written: !!short.responses[q.id]?.trim(),
        revealed: revealedSet.has(q.id),
        got: tickedCount(short.ticks[q.id], q.points.length),
        total: q.points.length,
      })),
    [qs, short.responses, short.ticks, revealedSet],
  );
  const revealedCount = navItems.filter((x) => x.revealed).length;
  const writtenCount = navItems.filter((x) => x.written).length;

  const patchShort = useCallback(
    (fn: (sh: NonNullable<Session["short"]>) => Partial<NonNullable<Session["short"]>>) =>
      update((p) => ({ ...p, short: { ...p.short!, ...fn(p.short!) } })),
    [update],
  );

  const go = useCallback(
    (i: number) => {
      update((p) => ({ ...p, current: Math.max(0, Math.min(qs.length - 1, i)) }));
      setNavOpen(false);
      setView("work");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [update, qs.length],
  );

  const finishedRef = useRef(!!initial.finishedAt);
  const finish = useCallback(() => {
    update((p) => {
      if (p.finishedAt) return p;
      return { ...p, finishedAt: Date.now() };
    });
    // บันทึกสถิติเฉพาะข้อที่ดูแนวคำตอบและตรวจประเด็นแล้ว (ครั้งเดียวต่อชุด กันกดซ้ำด้วย ref)
    if (!finishedRef.current) {
      finishedRef.current = true;
      for (const q of qs) {
        if (revealedSet.has(q.id) && short.ticks[q.id] !== undefined) {
          recordShort(q.id, tickedCount(short.ticks[q.id], q.points.length), q.points.length);
        }
      }
    }
    setNavOpen(false);
    setView("summary");
    window.scrollTo({ top: 0 });
  }, [update, qs, revealedSet, short.ticks]);

  const confirmFinish = () => {
    const left = qs.length - revealedCount;
    if (left === 0) return finish();
    modal.confirm({
      title: "จบชุดนี้และดูสรุป",
      icon: <CheckCircleFilled className="text-blue-900" />,
      content: (
        <div className="space-y-1">
          <p className="m-0">
            เขียนแล้ว {writtenCount} จาก {qs.length} ข้อ · ตรวจแล้ว {revealedCount} ข้อ
          </p>
          <p className="m-0 text-amber-600">ยังไม่ได้ดูแนวคำตอบ {left} ข้อ จะนับเป็น 0 ประเด็น</p>
        </div>
      ),
      okText: "จบและดูสรุป",
      cancelText: "ทำต่อ",
      onOk: finish,
    });
  };

  // ชุดใหม่: บทและจำนวนข้อเดิม สุ่มข้อใหม่
  const newSet = () => {
    setBusy(true);
    const opts = s.options as { chapterIds?: string[]; count?: number };
    const ns = createShortSession({
      name: s.name,
      chapterIds: opts.chapterIds?.length ? opts.chapterIds : [...new Set(qs.map((q) => q.chapterId))],
      count: opts.count ?? short.ids.length,
    });
    if (!ns.short?.ids.length) {
      deleteSession(ns.id);
      message.warning("ยังไม่มีข้อเขียนตอบในบทที่เลือก");
      setBusy(false);
      return;
    }
    router.push(`/short/${ns.id}`);
  };

  if (qs.length === 0) {
    return <SessionMissing title="ไม่มีข้อในชุดนี้แล้ว" sub="ข้อในชุดนี้ถูกนำออกจากคลังข้อสอบ เริ่มชุดใหม่ได้จากหน้าแรก" />;
  }

  const q = qs[index];
  const ch = chapterById(q.chapterId);
  const response = short.responses[q.id] ?? "";
  const revealed = revealedSet.has(q.id);
  const ticks = short.ticks[q.id] ?? [];
  const got = tickedCount(ticks, q.points.length);
  const last = index === qs.length - 1;
  const finished = !!s.finishedAt;

  const reveal = () => {
    patchShort((sh) => {
      const revealed = sh.revealed.includes(q.id) ? sh.revealed : [...sh.revealed, q.id];
      // ช่วยติ๊กจากคำสำคัญ: เฉพาะเมื่อพิมพ์คำตอบไว้ และยังไม่ได้ติ๊กอะไรเองในข้อนี้ (ไม่ทับการเลือกของนักเรียน)
      const typed = sh.responses[q.id] ?? "";
      if (!typed.trim() || !q.keywords || (sh.ticks[q.id]?.length ?? 0) > 0) return { revealed };
      const hit = matchedPoints(matchKeywords(typed, q.keywords)).filter((i) => i < q.points.length);
      if (!hit.length) return { revealed };
      return { revealed, ticks: { ...sh.ticks, [q.id]: hit }, auto: { ...sh.auto, [q.id]: hit } };
    });
    // มือถือ: แนวคำตอบอยู่ใต้ช่องเขียน เลื่อนลงไปให้เห็นเลย
    if (window.innerWidth < 1024) setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const setTick = (i: number, on: boolean) =>
    patchShort((sh) => {
      const cur = new Set(sh.ticks[q.id] ?? []);
      if (on) cur.add(i);
      else cur.delete(i);
      return { ticks: { ...sh.ticks, [q.id]: [...cur].sort((a, b) => a - b) } };
    });
  // คำสำคัญที่พบในคำตอบที่พิมพ์ (คำนวณจากข้อความปัจจุบัน แก้คำตอบแล้วไฮไลต์ตามทันที)
  const matches = response.trim() ? matchKeywords(response, q.keywords) : [];
  const hitRanges = matches.flatMap((m) => m.ranges);
  const autoTicked = short.auto?.[q.id] ?? [];
  const items = pointItems(q.points, ticks, { auto: autoTicked, matches });
  const openSummary = () => {
    setNavOpen(false);
    setView("summary");
    window.scrollTo({ top: 0 });
  };

  // ปุ่มหลักปุ่มเดียวของหน้า (อยู่ที่เดิมเสมอ): ดูแนวคำตอบ → ข้อถัดไป → จบและดูสรุป
  const primaryAction = !revealed ? (
    response.trim() ? (
      <Button type="primary" size="large" icon={<EyeOutlined />} onClick={reveal} className="h-12 lg:h-11" data-testid="reveal">
        ดูแนวคำตอบ
      </Button>
    ) : (
      <Popconfirm
        title="ยังไม่ได้เขียนคำตอบ"
        description="ลองเขียนก่อนจะจำได้ดีกว่า ดูแนวคำตอบเลยไหม"
        okText="ดูเลย"
        cancelText="เขียนก่อน"
        onConfirm={reveal}
      >
        <Button type="primary" size="large" icon={<EyeOutlined />} className="h-12 lg:h-11" data-testid="reveal">
          ดูแนวคำตอบ
        </Button>
      </Popconfirm>
    )
  ) : !last ? (
    <Button type="primary" size="large" onClick={() => go(index + 1)} className="h-12 lg:h-11" data-testid="next">
      ข้อถัดไป <RightOutlined />
    </Button>
  ) : finished ? (
    <Button type="primary" size="large" icon={<CheckCircleFilled />} onClick={openSummary} className="h-12 lg:h-11">
      ดูสรุป
    </Button>
  ) : (
    <Button type="primary" size="large" icon={<CheckOutlined />} onClick={confirmFinish} className="h-12 lg:h-11" data-testid="finish">
      จบและดูสรุป
    </Button>
  );
  // ปุ่มรองสำหรับจบชุด (หัวหน้าบนเดสก์ท็อป / ในลิ้นชักเลือกข้อบนมือถือ)
  const finishLink = finished ? (
    <Button icon={<CheckCircleFilled />} onClick={openSummary} className="h-11 lg:h-10">
      ดูสรุป
    </Button>
  ) : (
    <Button icon={<CheckOutlined />} onClick={confirmFinish} className="h-11 lg:h-10" data-testid="finish">
      จบชุด
    </Button>
  );
  const prevButton = (
    <Button size="large" icon={<LeftOutlined />} disabled={index === 0} onClick={() => go(index - 1)} className="h-12 w-12 shrink-0 lg:h-11 lg:w-11" aria-label="ข้อก่อนหน้า" />
  );
  // ข้ามไปข้อถัดไปโดยยังไม่ดูแนวคำตอบ (เมื่อดูแล้ว ปุ่มหลักเป็น "ข้อถัดไป" อยู่แล้ว)
  const nextIconButton = !revealed && !last && (
    <Button size="large" icon={<RightOutlined />} onClick={() => go(index + 1)} className="h-12 w-12 shrink-0 lg:h-11 lg:w-11" aria-label="ข้อถัดไป" />
  );

  return (
    <div className="min-h-screen lg:flex lg:h-screen lg:flex-col">
      <AppHeader
        title={s.name || "ผู้ฝึก"}
        sub={
          <>
            เขียนตอบสั้น {qs.length} ข้อ<span className="hidden lg:inline"> · ข้อสอบจริง 6 ข้อ เขียนลงกระดาษ</span>
          </>
        }
        actions={
          view === "work" ? (
            <>
              <Tag color="blue" className="m-0 hidden px-2.5 py-1 text-sm sm:inline-flex" data-testid="revealed-count">
                ตรวจแล้ว {revealedCount}/{qs.length}
              </Tag>
              <div className="hidden lg:block">{finishLink}</div>
            </>
          ) : (
            <HomeButton />
          )
        }
        progress={revealedCount / qs.length}
      />

      {view === "summary" ? (
        <ShortSummary session={s} questions={qs} onOpen={go} onNew={newSet} busy={busy} />
      ) : (
        <>
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-5 pb-28 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-6 lg:px-6 lg:py-6">
            {/* ซ้าย: โจทย์ + ช่องเขียนคำตอบ */}
            <Card
              className="shadow-sm lg:flex lg:min-h-0 lg:flex-col"
              classNames={{ body: "p-5 sm:p-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto" }}
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="text-lg font-bold text-blue-900" data-testid="q-no">
                    ข้อ {index + 1} <span className="text-base font-normal text-slate-400">/ {qs.length}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-slate-500">
                    {chapterLabel(ch)}
                    {ch && <> · {ch.title}</>}
                  </div>
                </div>
                {finished && (
                  <Tag color="green" className="m-0 shrink-0">
                    จบชุดแล้ว
                  </Tag>
                )}
              </div>

              <p className="mt-0 mb-5 text-lg leading-[1.75] font-medium whitespace-pre-line text-slate-900" data-testid="question">
                {q.q}
              </p>

              <Input.TextArea
                value={response}
                onChange={(e) => {
                  const v = e.target.value;
                  patchShort((sh) => ({ responses: { ...sh.responses, [q.id]: v } }));
                }}
                placeholder="เขียนคำตอบของคุณ (หรือเขียนลงกระดาษก็ได้)"
                autoSize={rows}
                showCount={{ formatter: ({ count }) => `${count.toLocaleString("th-TH")} ตัวอักษร` }}
                classNames={{ textarea: "px-4 py-3 text-base leading-[1.7]", count: "text-xs" }}
                aria-label={`คำตอบข้อ ${index + 1}`}
                data-testid="answer-input"
              />

              <div className="hidden lg:block lg:flex-1" />

              <div className="mt-8 hidden items-center gap-3 border-t border-slate-100 pt-5 lg:flex">
                <div className="min-w-0 flex-1">
                  <ShortNavigator items={navItems} current={index} onJump={go} legend={false} />
                </div>
                {prevButton}
                {nextIconButton}
                {primaryAction}
              </div>
            </Card>

            {/* ขวา (มือถือ: ด้านล่าง): แนวคำตอบ แล้วตามด้วยประเด็นให้คะแนน */}
            {revealed ? (
              <Card
                ref={answerRef}
                title={
                  <span className="flex items-center gap-2">
                    <FileSearchOutlined className="text-blue-900" /> แนวคำตอบ
                  </span>
                }
                extra={
                  // เดสก์ท็อป: แนวคำตอบยาวจนประเด็นให้คะแนนตกขอบการ์ดได้ จึงมีทางลัดลงไป
                  <Button
                    type="link"
                    className="hidden px-0 lg:inline-flex"
                    onClick={() => pointsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    ไปที่ประเด็นให้คะแนน <DownOutlined />
                  </Button>
                }
                className="scroll-mt-20 shadow-sm lg:flex lg:min-h-0 lg:flex-col"
                classNames={{ header: "px-5 sm:px-6", body: "p-5 sm:p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto" }}
              >
                <AnswerText answer={q.answer} />

                <div ref={pointsRef} className="mt-8 mb-4 flex scroll-mt-4 flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="flex-1 text-base font-semibold text-slate-900">ประเด็นให้คะแนน</div>
                  <Tag color={got === q.points.length ? "green" : got > 0 ? "blue" : "default"} className="m-0" data-testid="tick-score">
                    ได้ {got} / {q.points.length} ประเด็น
                  </Tag>
                </div>
                {autoTicked.length > 0 ? (
                  <p className="mt-0 mb-4 text-sm text-slate-500" data-testid="auto-note">
                    ระบบช่วยติ๊กจากคำสำคัญ ตรวจซ้ำได้
                  </p>
                ) : q.keywords && !response.trim() ? (
                  <p className="mt-0 mb-4 text-sm leading-[1.6] text-slate-500" data-testid="type-hint">
                    ติ๊กเฉพาะประเด็นที่คุณเขียนถึงจริง · ถ้าพิมพ์คำตอบไว้ ระบบจะช่วยติ๊กให้
                  </p>
                ) : (
                  <p className="mt-0 mb-4 text-sm text-slate-500">ติ๊กเฉพาะประเด็นที่คุณเขียนถึงจริง</p>
                )}
                {hitRanges.length > 0 && <YourAnswer text={response} ranges={hitRanges} />}
                <ShortChecklist items={items} onToggle={setTick} />

                {/* ที่มา: บรรทัดเดียวกับคำอธิบายข้อปรนัย */}
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="min-w-0 text-sm text-slate-500">
                    ที่มา: <span className="whitespace-nowrap">{chapterLabel(ch)}</span>
                    {q.source.pages.length > 0 && (
                      <>
                        {" "}
                        · <span className="whitespace-nowrap">{pagesText(q.source.pages)}</span>
                      </>
                    )}
                  </span>
                  {slideUrl(q.chapterId) && (
                    <Button href={slideUrl(q.chapterId)} target="_blank" rel="noreferrer" icon={<ExportOutlined />} className="h-11 shrink-0 lg:h-8">
                      เปิดสไลด์
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <Card
                className="hidden shadow-sm lg:flex lg:min-h-0 lg:flex-col"
                classNames={{ body: "flex flex-1 flex-col items-center justify-center p-10 text-center" }}
              >
                <FileSearchOutlined className="mb-4 text-5xl text-slate-300" />
                <div className="mb-2 text-base font-semibold text-slate-700">แนวคำตอบจะแสดงตรงนี้</div>
                <p className="m-0 max-w-sm text-base leading-[1.7] text-slate-500">
                  เขียนคำตอบให้เสร็จก่อน แล้วกด “ดูแนวคำตอบ” เพื่อเทียบกับประเด็นที่ใช้ให้คะแนน
                </p>
              </Card>
            )}
          </main>

          {/* แถบล่างสำหรับมือถือ: ปุ่มหลักปุ่มเดียวอยู่ขวาสุด */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-xl items-center gap-2">
              {prevButton}
              <Button
                size="large"
                icon={<AppstoreOutlined />}
                onClick={() => setNavOpen(true)}
                className="h-12 shrink-0 px-3 lg:h-11"
                aria-label={`เลือกข้อ (ข้อ ${index + 1} จาก ${qs.length})`}
                data-testid="open-nav"
              >
                {index + 1}/{qs.length}
              </Button>
              {nextIconButton}
              <div className="min-w-0 flex-1 [&_.ant-btn]:w-full">{primaryAction}</div>
            </div>
          </div>
          <Drawer
            title="เลือกข้อ"
            placement="bottom"
            size="auto"
            open={navOpen}
            onClose={() => setNavOpen(false)}
            classNames={{ body: "px-5 pt-2 pb-6" }}
          >
            <ShortNavigator items={navItems} current={index} onJump={go} />
            <div className="mt-6 flex flex-col gap-3">
              {finishLink}
              {/* มือถือซ่อนตราเว็บในหัวหน้า ทางกลับหน้าแรกจึงอยู่ตรงนี้ (คำตอบบันทึกไว้แล้ว) */}
              <HomeButton block label="กลับหน้าแรก (ทำต่อทีหลังได้)" />
            </div>
          </Drawer>
        </>
      )}
    </div>
  );
}
