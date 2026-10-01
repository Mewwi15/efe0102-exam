"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { CheckSquareOutlined } from "@ant-design/icons";
import { AppHeader, HomeButton } from "../AppHeader";
import { FullPageSpin, SessionMissing } from "../SessionState";
import { SWOT_SETS, swotSetById } from "@/lib/bank";
import { getSwotProgress, recordSwot, type SwotProgress } from "@/lib/progress";
import { createSwotSession, loadSession, saveSession, sessionHref, type Session } from "@/lib/session";
import { LETTER_META } from "@/lib/swot-meta";
import type { SwotLetter, SwotSet } from "@/lib/types";
import { SwotPlay } from "./SwotPlay";
import { SwotReview, type SwotScore } from "./SwotReview";

// โหลดรอบ SWOT จาก localStorage (อ่านได้หลัง mount เท่านั้น)
export default function SwotClient({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const s = loadSession(id);
    // เป็นรอบชนิดอื่น ไปหน้าของรอบนั้น
    if (s && s.kind !== "swot") {
      router.replace(sessionHref(s));
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setSession(s);
  }, [id, router]);

  if (session === undefined) return <FullPageSpin />;
  if (!session || !session.swot) return <SessionMissing />;
  const set = swotSetById(session.swot.setId);
  if (!set) {
    return SWOT_SETS.length ? (
      <SessionMissing title="ไม่พบโจทย์ SWOT ของรอบนี้" sub="คลังข้อสอบอาจเปลี่ยนไปแล้ว เริ่มโจทย์ใหม่ได้จากหน้าแรก" />
    ) : (
      <SessionMissing title="ยังไม่มีโจทย์ SWOT" sub="กำลังเตรียมโจทย์ ลองใหม่อีกครั้งภายหลัง" />
    );
  }
  return <SwotBoard key={session.id} initial={session} set={set} />;
}

// ---------- รอบ SWOT: ตอบทีละข้อ → ตรวจ → เฉลย ----------

const ADVANCE_MS = 320;

function SwotBoard({ initial, set }: { initial: Session; set: SwotSet }) {
  const router = useRouter();
  const { modal } = App.useApp();
  // รอบเก่าที่ยังไม่ได้เก็บข้อที่ทำอยู่: เริ่มที่ข้อแรกที่ยังไม่ตอบ
  const [session, setSession] = useState(() => {
    const sw = initial.swot!;
    if (sw.checked || (initial.current ?? 0) > 0 || !sw.answers[set.items[0]?.id]) return initial;
    const first = set.items.findIndex((it) => !sw.answers[it.id]);
    return first > 0 ? { ...initial, current: first } : initial;
  });
  const [progress, setProgress] = useState<Record<string, SwotProgress>>({});
  const [busy, setBusy] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const swot = session.swot!;
  const answers = swot.answers;
  const checked = swot.checked;
  const items = set.items;
  const total = items.length;
  const answered = items.filter((it) => answers[it.id]).length;
  const current = Math.min(session.current ?? 0, total - 1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    setProgress(getSwotProgress());
  }, []);
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // บันทึกทุกครั้งที่เปลี่ยน รีเฟรชแล้วคำตอบและข้อที่ทำอยู่ยังอยู่
  const update = useCallback((fn: (s: Session) => Session) => {
    setSession((prev) => {
      const next = fn(prev);
      saveSession(next);
      return next;
    });
  }, []);

  const jump = useCallback(
    (i: number) => {
      clearTimeout(advanceTimer.current);
      update((s) => ({ ...s, current: Math.max(0, Math.min(total - 1, i)) }));
    },
    [update, total],
  );

  // เลือกคำตอบแล้วเลื่อนไปข้อถัดไปที่ยังไม่ตอบเอง (ตอบครบแล้วอยู่ข้อเดิม)
  const choose = useCallback(
    (letter: SwotLetter) => {
      const at = current;
      const itemId = items[at].id;
      update((s) => (s.swot!.checked ? s : { ...s, swot: { ...s.swot!, answers: { ...s.swot!.answers, [itemId]: letter } } }));
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        update((s) => {
          if (s.swot!.checked || (s.current ?? 0) !== at) return s;
          for (let k = 1; k < total; k++) {
            const j = (at + k) % total;
            if (!s.swot!.answers[items[j].id]) return { ...s, current: j };
          }
          return s;
        });
      }, ADVANCE_MS);
    },
    [current, items, total, update],
  );

  const score: SwotScore = useMemo(() => {
    let correct = 0;
    let side = 0; // แยกภายใน/ภายนอกถูก
    let effect = 0; // แยกช่วย/ขัดขวางถูก
    let tricky = 0;
    let trickyOk = 0;
    for (const it of items) {
      const a = answers[it.id];
      if (it.tricky) tricky++;
      if (!a) continue;
      if (a === it.answer) {
        correct++;
        if (it.tricky) trickyOk++;
      }
      if (LETTER_META[a].internal === LETTER_META[it.answer].internal) side++;
      if (LETTER_META[a].helps === LETTER_META[it.answer].helps) effect++;
    }
    return { correct, total, side, effect, tricky, trickyOk };
  }, [answers, items, total]);

  const checkedRef = useRef(initial.swot!.checked);
  const doCheck = () => {
    // กันกดซ้ำ (บันทึกสถิติครั้งเดียวต่อรอบ)
    if (checkedRef.current) return;
    checkedRef.current = true;
    clearTimeout(advanceTimer.current);
    const finishedAt = Date.now();
    update((s) => ({ ...s, finishedAt, swot: { ...s.swot!, checked: true } }));
    recordSwot(set.id, score.correct, total);
    setProgress(getSwotProgress());
    window.scrollTo({ top: 0 });
  };

  const check = () => {
    const missing = total - answered;
    if (missing === 0) return doCheck();
    modal.confirm({
      title: `ยังไม่ได้ตอบ ${missing} ข้อ`,
      icon: <CheckSquareOutlined />,
      content: "ข้อที่ไม่ได้ตอบจะนับว่าผิด ตรวจเลยไหม",
      okText: "ตรวจเลย",
      cancelText: "ทำต่อ",
      onOk: doCheck,
      onCancel: () => {
        const first = items.findIndex((it) => !answers[it.id]);
        if (first >= 0) jump(first);
      },
    });
  };

  // เริ่มโจทย์ใหม่ (สุ่มให้ก่อนจากโจทย์ที่ยังไม่เคยทำ)
  const startNew = (setId?: string) => {
    let pick = setId;
    if (!pick) {
      const others = SWOT_SETS.filter((s) => s.id !== set.id);
      const fresh = others.filter((s) => !progress[s.id]);
      const pool = fresh.length ? fresh : others.length ? others : SWOT_SETS;
      pick = pool[Math.floor(Math.random() * pool.length)]?.id ?? "random";
    }
    setBusy(true);
    const s = createSwotSession({ name: session.name, setId: pick });
    router.push(sessionHref(s));
  };

  const barPct = checked ? (score.correct / total) * 100 : (answered / total) * 100;

  return (
    <div className={`min-h-screen ${checked ? "lg:flex lg:h-dvh lg:min-h-0 lg:flex-col" : ""}`}>
      <AppHeader
        title={<span data-testid="swot-name">{session.name || "ผู้ฝึก"}</span>}
        sub="ฝึกวิเคราะห์ SWOT"
        actions={<HomeButton />}
        progress={barPct / 100}
        progressTone={checked ? "bg-emerald-500" : "bg-blue-900"}
      />

      {checked ? (
        <SwotReview set={set} answers={answers} score={score} progress={progress[set.id]} allProgress={progress} busy={busy} onStart={startNew} />
      ) : (
        <SwotPlay
          set={set}
          answers={answers}
          current={current}
          answered={answered}
          onChoose={choose}
          onJump={jump}
          onCheck={check}
        />
      )}
    </div>
  );
}
