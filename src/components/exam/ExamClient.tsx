"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Drawer, Radio } from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseCircleFilled,
  FlagFilled,
  FlagOutlined,
  LeftOutlined,
  RightOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { AppHeader, HomeButton } from "@/components/AppHeader";
import { Countdown } from "@/components/Countdown";
import { FullPageSpin, SessionMissing } from "@/components/SessionState";
import { chapterById, chapterLabel } from "@/lib/bank";
import { CHOICE_LABELS } from "@/lib/exam-meta";
import { displayOrder, isMcqSession, sessionQuestions } from "@/lib/exam-view";
import { recordMcq } from "@/lib/progress";
import { SESSION_KIND_LABEL, loadSession, saveSession, sessionHref, type Session } from "@/lib/session";
import type { Mcq } from "@/lib/types";
import { ExamNavigator, type QuestionStatus } from "./ExamNavigator";
import { ExplainPanel } from "./Explain";

export default function ExamClient({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const s = loadSession(id);
    // ทำเสร็จแล้วไปหน้าผลเลย
    if (isMcqSession(s) && s.finishedAt !== null) {
      router.replace(`/exam/${id}/result`);
      return;
    }
    // เป็นรอบชนิดอื่น (เขียนตอบ/SWOT) ไปหน้าของรอบนั้น
    if (s && !isMcqSession(s) && sessionHref(s) !== `/exam/${id}`) {
      router.replace(sessionHref(s));
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setSession(s);
  }, [id, router]);

  if (session === undefined) return <FullPageSpin />;
  if (!isMcqSession(session)) return <SessionMissing title="ไม่พบชุดข้อสอบนี้" />;
  if (sessionQuestions(session).length === 0)
    return <SessionMissing title="ชุดนี้ไม่มีข้อสอบที่ใช้ได้แล้ว" sub="ข้อในชุดนี้ถูกนำออกจากคลังข้อสอบ เริ่มชุดใหม่ได้จากหน้าแรก" />;
  return <ExamRunner key={session.id} initial={session} />;
}

// ── หน้าทำข้อสอบ ─────────────────────────────────────────────────────────────
function ExamRunner({ initial }: { initial: Session }) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const [s, setS] = useState(initial);
  const sRef = useRef(initial);
  const [navOpen, setNavOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const confirmRef = useRef<{ destroy: () => void } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const explainRef = useRef<HTMLDivElement>(null);

  const isMock = s.kind === "mock";
  const questions = useMemo(() => sessionQuestions(initial), [initial]);
  const ids = useMemo(() => questions.map((q) => q.id), [questions]);
  const total = questions.length;
  const mcq = s.mcq!;
  const index = Math.min(Math.max(s.current ?? 0, 0), total - 1);
  const q = questions[index];
  const order = displayOrder(s, q);
  const picked = mcq.answers[q.id];
  const pickedPos = picked === undefined ? undefined : order.indexOf(picked);
  const revealed = !isMock && picked !== undefined;

  // บันทึกทุกครั้งที่เปลี่ยน (คำตอบ, เครื่องหมาย, ข้อที่เปิดอยู่) รีเฟรชแล้วทำต่อได้
  const commit = useCallback((next: Session) => {
    sRef.current = next;
    setS(next);
    saveSession(next);
  }, []);

  const finish = useCallback(
    (reason: "manual" | "timeup") => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setFinishing(true);
      if (reason === "timeup") {
        confirmRef.current?.destroy();
        message.info("หมดเวลาสอบ ระบบส่งข้อสอบให้อัตโนมัติ");
      }
      const cur = sRef.current;
      if (cur.finishedAt === null) {
        const now = Date.now();
        const finishedAt = cur.deadline ? Math.min(now, cur.deadline) : now;
        // จำลองสอบ: บันทึกสถิติตอนส่ง (โหมดฝึกบันทึกไปแล้วตอนตอบแต่ละข้อ)
        if (cur.kind === "mock") {
          for (const qq of questions) {
            const a = cur.mcq!.answers[qq.id];
            if (a !== undefined) recordMcq(qq.id, a === qq.answer);
          }
        }
        commit({ ...cur, finishedAt });
      }
      router.replace(`/exam/${cur.id}/result`);
    },
    [commit, message, questions, router],
  );

  const go = useCallback(
    (i: number) => {
      const cur = sRef.current;
      const next = Math.max(0, Math.min(total - 1, i));
      setNavOpen(false);
      if (next === (cur.current ?? 0)) return;
      commit({ ...cur, current: next });
      bodyRef.current?.scrollTo({ top: 0 });
      if (window.innerWidth < 1024) window.scrollTo({ top: 0 });
    },
    [commit, total],
  );

  // pos = ตำแหน่งที่แสดง (0–3) หรือ null เพื่อล้างคำตอบ
  const choose = useCallback(
    (pos: number | null) => {
      const cur = sRef.current;
      if (cur.finishedAt !== null || finishingRef.current) return;
      const qq = questions[Math.min(Math.max(cur.current ?? 0, 0), total - 1)];
      const ord = displayOrder(cur, qq);
      const prev = cur.mcq!.answers[qq.id];
      const mock = cur.kind === "mock";
      // โหมดฝึก: ตอบแล้วล็อก
      if (!mock && prev !== undefined) return;
      const answers = { ...cur.mcq!.answers };
      if (pos === null) delete answers[qq.id];
      else if (ord[pos] === undefined) return;
      else answers[qq.id] = ord[pos];
      if (answers[qq.id] === prev) return;
      commit({ ...cur, mcq: { ...cur.mcq!, answers } });
      if (!mock && pos !== null) {
        recordMcq(qq.id, ord[pos] === qq.answer);
        // จอแคบ: เลื่อนให้เห็นคำอธิบายใต้ตัวเลือก
        if (window.innerWidth < 1024) {
          requestAnimationFrame(() => explainRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
        }
      }
    },
    [commit, questions, total],
  );

  const toggleFlag = useCallback(
    (qid: string) => {
      const cur = sRef.current;
      const flags = cur.mcq!.flags.includes(qid) ? cur.mcq!.flags.filter((x) => x !== qid) : [...cur.mcq!.flags, qid];
      commit({ ...cur, mcq: { ...cur.mcq!, flags } });
    },
    [commit],
  );

  // คีย์ลัด: ← → เปลี่ยนข้อ, 1–4 เลือกคำตอบ ก–ง
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t instanceof HTMLTextAreaElement) return;
      if (t instanceof HTMLInputElement && t.type !== "radio" && t.type !== "checkbox") return;
      if (t?.closest?.('[role="dialog"]')) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        // กันไม่ให้ลูกศรไปเปลี่ยนตัวเลือกของ radio ที่โฟกัสอยู่
        e.preventDefault();
        go((sRef.current.current ?? 0) + (e.key === "ArrowRight" ? 1 : -1));
      } else if (/^[1-4]$/.test(e.key)) {
        choose(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, choose]);

  const answeredCount = ids.filter((x) => mcq.answers[x] !== undefined).length;
  const rightCount = isMock ? 0 : questions.filter((qq) => mcq.answers[qq.id] === qq.answer).length;
  const wrongCount = answeredCount - rightCount;
  const status = useMemo(() => {
    if (isMock) return undefined;
    const out: Record<string, QuestionStatus> = {};
    for (const qq of questions) {
      const a = mcq.answers[qq.id];
      if (a !== undefined) out[qq.id] = a === qq.answer ? "correct" : "wrong";
    }
    return out;
  }, [isMock, questions, mcq.answers]);

  const confirmFinish = () => {
    const missing = total - answeredCount;
    if (!isMock && missing === 0) {
      finish("manual");
      return;
    }
    confirmRef.current = modal.confirm({
      title: isMock ? "ยืนยันการส่งข้อสอบ" : "จบการฝึกรอบนี้?",
      icon: isMock ? <SendOutlined /> : <CheckOutlined />,
      content: (
        <div className="space-y-1">
          <p className="m-0">
            ตอบแล้ว {answeredCount} จาก {total} ข้อ
          </p>
          {missing > 0 && <p className="m-0 text-red-600">ยังไม่ได้ตอบ {missing} ข้อ</p>}
          {mcq.flags.length > 0 && <p className="m-0 text-amber-600">ทำเครื่องหมายไว้ทบทวน {mcq.flags.length} ข้อ</p>}
          <p className="m-0 text-slate-500">{isMock ? "ส่งแล้วแก้คำตอบไม่ได้ จะเห็นเฉลยทุกข้อในหน้าผล" : "ข้อที่ยังไม่ตอบจะไม่นับ"}</p>
        </div>
      ),
      okText: isMock ? "ส่งข้อสอบ" : "จบและดูสรุป",
      cancelText: "กลับไปทำต่อ",
      onOk: () => finish("manual"),
    });
  };

  const ch = chapterById(q.chapterId);
  const flagged = mcq.flags.includes(q.id);
  const isLast = index === total - 1;
  const finishLabel = isMock ? "ส่งข้อสอบ" : "จบการฝึก";
  const lastLabel = isMock ? "ส่งข้อสอบ" : "จบและดูสรุป";
  const scoreText = `ถูก ${rightCount} · ผิด ${wrongCount}`;
  const nav = <ExamNavigator ids={ids} current={index} answers={mcq.answers} flags={mcq.flags} status={status} onJump={go} />;

  return (
    <div className="flex min-h-screen flex-col pb-28 lg:h-screen lg:min-h-0 lg:pb-0">
      {/* หัว: มือถือเหลือแค่ความคืบหน้า เวลา และปุ่มส่ง */}
      <AppHeader
        title={<span data-testid="exam-name">{s.name || SESSION_KIND_LABEL[s.kind]}</span>}
        sub={`${SESSION_KIND_LABEL[s.kind]} · ${total} ข้อ · ${isMock ? "เฉลยหลังส่ง" : "เฉลยทันทีหลังตอบ"}`}
        mobileTitle={
          <div className="leading-snug">
            <div className="text-sm text-slate-500">ตอบแล้ว</div>
            <div className="text-lg font-semibold whitespace-nowrap text-slate-900 tabular-nums" data-testid="progress-mobile">
              {answeredCount}/{total}
            </div>
          </div>
        }
        actions={
          <>
            {isMock && s.deadline !== null && <Countdown deadline={s.deadline} onExpire={() => finish("timeup")} />}
            <Button className="h-11 shrink-0 lg:h-10" onClick={confirmFinish} loading={finishing} data-testid="finish">
              {finishLabel}
            </Button>
          </>
        }
        progress={answeredCount / total}
      />

      <main
        className={`mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 lg:min-h-0 lg:px-6 lg:flex-1 lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:py-5 ${
          isMock ? "lg:grid-cols-[1fr_340px]" : "lg:grid-cols-[1fr_400px]"
        }`}
      >
        <Card
          className="min-w-0 shadow-sm lg:flex lg:min-h-0 lg:flex-col"
          classNames={{ body: "flex min-h-0 flex-1 flex-col p-0" }}
          data-testid="question-card"
        >
          <div ref={bodyRef} className="min-h-0 flex-1 px-5 pt-5 pb-6 sm:px-7 sm:pt-6 lg:overflow-y-auto">
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1 leading-snug">
                <div className="text-lg font-bold text-blue-900" data-testid="q-number">
                  ข้อ {index + 1} <span className="text-base font-normal text-slate-400">/ {total}</span>
                </div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {chapterLabel(ch)} · {ch?.title}
                </div>
              </div>
              <Button
                className="h-11 min-w-11 shrink-0 lg:h-10"
                icon={flagged ? <FlagFilled className="text-amber-500" /> : <FlagOutlined />}
                onClick={() => toggleFlag(q.id)}
                data-testid="flag"
                aria-pressed={flagged}
                aria-label={flagged ? "เอาเครื่องหมายออก" : "ทำเครื่องหมายไว้ทบทวน"}
              >
                <span className="hidden sm:inline">{flagged ? "ทำเครื่องหมายแล้ว" : "ทำเครื่องหมาย"}</span>
              </Button>
            </div>

            <p className="mb-5 text-lg leading-[1.75] font-medium whitespace-pre-line text-slate-900" data-testid="stem">
              {q.q}
            </p>

            <Radio.Group
              vertical
              className="w-full"
              value={pickedPos ?? null}
              onChange={(e) => choose(e.target.value as number)}
            >
              {order.map((orig, i) => (
                <ChoiceRow key={orig} q={q} orig={orig} pos={i} picked={picked} revealed={revealed} />
              ))}
            </Radio.Group>

            {isMock && picked !== undefined && (
              <Button type="text" className="h-11 text-slate-500 lg:h-8" onClick={() => choose(null)} data-testid="clear">
                ล้างคำตอบข้อนี้
              </Button>
            )}

            {/* จอแคบ: คำอธิบายต่อท้ายตัวเลือก (จอกว้างแสดงในคอลัมน์ขวา) */}
            {revealed && (
              <div ref={explainRef} className="mt-5 scroll-mb-32 lg:hidden">
                <ExplainPanel q={q} order={order} status={picked === q.answer ? "right" : "wrong"} />
              </div>
            )}
          </div>

          <div className="hidden shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-7 py-3 lg:flex">
            <Button size="large" icon={<LeftOutlined />} disabled={index === 0} onClick={() => go(index - 1)}>
              ข้อก่อนหน้า
            </Button>
            <span className="hidden text-xs text-slate-400 xl:inline">คีย์ลัด ← → เปลี่ยนข้อ · 1–4 เลือก ก–ง</span>
            {!isLast ? (
              <Button type="primary" size="large" onClick={() => go(index + 1)} data-testid="next">
                ข้อถัดไป <RightOutlined />
              </Button>
            ) : (
              <Button type="primary" size="large" icon={isMock ? <SendOutlined /> : <CheckOutlined />} onClick={confirmFinish}>
                {lastLabel}
              </Button>
            )}
          </div>
        </Card>

        <aside className="hidden min-h-0 flex-col gap-5 lg:flex">
          {!isMock &&
            (revealed ? (
              <div className="max-h-[70%] shrink-0 overflow-y-auto rounded-xl shadow-sm" data-testid="explain-side">
                <ExplainPanel
                  q={q}
                  order={order}
                  status={picked === q.answer ? "right" : "wrong"}
                  className="rounded-xl bg-white p-5"
                />
              </div>
            ) : (
              <div className="shrink-0 rounded-xl border border-dashed border-slate-300 p-5 leading-relaxed text-slate-500">
                เลือกคำตอบ แล้วคำอธิบายจะขึ้นตรงนี้
              </div>
            ))}
          <Card
            className="min-h-0 shadow-sm lg:flex lg:flex-initial lg:flex-col"
            title={`ตอบแล้ว ${answeredCount}/${total} ข้อ`}
            extra={
              !isMock && (
                <span className="text-sm text-slate-500" data-testid="practice-score">
                  {scoreText}
                </span>
              )
            }
            classNames={{ body: "min-h-0 flex-1 overflow-y-auto" }}
            data-testid="navigator"
          >
            {nav}
          </Card>
        </aside>
      </main>

      {/* มือถือ: แถบล่างค้างไว้ ก่อนหน้า · เลือกข้อ · ถัดไป */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <Button
            className="h-12 w-12 shrink-0"
            icon={<LeftOutlined />}
            disabled={index === 0}
            onClick={() => go(index - 1)}
            aria-label="ข้อก่อนหน้า"
          />
          <Button className="h-12 min-w-0 flex-1" icon={<AppstoreOutlined />} onClick={() => setNavOpen(true)} data-testid="open-nav">
            ข้อ {index + 1}/{total}
          </Button>
          {!isLast ? (
            <Button type="primary" className="h-12 min-w-0 flex-1" onClick={() => go(index + 1)} data-testid="next">
              ข้อถัดไป <RightOutlined />
            </Button>
          ) : (
            <Button type="primary" className="h-12 min-w-0 flex-1" onClick={confirmFinish}>
              {lastLabel}
            </Button>
          )}
        </div>
      </div>
      <Drawer
        title={
          <span>
            เลือกข้อ <span className="ml-1 font-normal text-slate-500">· {isMock ? `ตอบแล้ว ${answeredCount}/${total}` : scoreText}</span>
          </span>
        }
        placement="bottom"
        size="85vh"
        open={navOpen}
        onClose={() => setNavOpen(false)}
        footer={
          // มือถือไม่มีตราเว็บในหัว ทางกลับหน้าแรกจึงอยู่ตรงนี้ (คำตอบบันทึกไว้แล้ว กลับมาทำต่อได้)
          <HomeButton block label="กลับหน้าแรก (ทำต่อทีหลังได้)" />
        }
      >
        {nav}
      </Drawer>
    </div>
  );
}

function ChoiceRow({
  q,
  orig,
  pos,
  picked,
  revealed,
}: {
  q: Mcq;
  orig: number;
  pos: number;
  picked: number | undefined;
  revealed: boolean;
}) {
  const isKey = orig === q.answer;
  const isMine = orig === picked;
  const tone = revealed
    ? isKey
      ? "border-green-600 bg-green-50"
      : isMine
        ? "border-red-500 bg-red-50"
        : "border-slate-200 opacity-60"
    : isMine
      ? "border-blue-900 bg-blue-50"
      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
  return (
    <Radio
      value={pos}
      className={`m-0 mb-3 flex min-h-14 w-full items-start rounded-xl border px-4 py-3.5 text-base transition-colors ${tone} ${
        revealed ? "cursor-default" : ""
      }`}
      classNames={{ icon: "mt-1 self-start", label: "min-w-0 flex-1 ps-3" }}
      data-testid={`choice-${pos}`}
      data-state={revealed ? (isKey ? "key" : isMine ? "wrong" : "other") : isMine ? "picked" : "idle"}
    >
      <span className="flex items-start gap-2.5 leading-[1.7]">
        <b className="shrink-0">{CHOICE_LABELS[pos]}.</b>
        <span className="min-w-0 flex-1">{q.choices[orig]}</span>
        {revealed && isKey && <CheckCircleFilled className="mt-1 shrink-0 text-xl text-green-600" aria-label="คำตอบที่ถูก" />}
        {revealed && isMine && !isKey && <CloseCircleFilled className="mt-1 shrink-0 text-xl text-red-500" aria-label="คำตอบของคุณ (ผิด)" />}
      </span>
    </Radio>
  );
}
