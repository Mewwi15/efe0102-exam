"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Badge, Button, Card, Drawer, Form, Input, Tag } from "antd";
import { HistoryOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { AppHeader, PAGE_CONTAINER } from "./AppHeader";
import { Disclaimer } from "./Brand";
import { ExamHero } from "./landing/ExamHero";
import { ExamInfo } from "./landing/ExamInfo";
import { HistoryList, ReviewButton } from "./landing/History";
import { DEFAULT_OPTS, ModeCards, ModeOptions, type Mode, type ModeOpts } from "./landing/ModePicker";
import { CHAPTERS } from "@/lib/bank";
import { EXAM } from "@/lib/exam-meta";
import { getChapterStats, getWrongIds } from "@/lib/progress";
import {
  createMockSession,
  createPracticeSession,
  createReviewSession,
  createShortSession,
  createSwotSession,
  deleteSession,
  getName,
  listSessions,
  sessionHref,
  setName,
  type Session,
} from "@/lib/session";

const allChapterIds = CHAPTERS.map((c) => c.id);

const START_LABEL: Record<Mode, (o: ModeOpts) => string> = {
  mock: (o) => `เริ่มสอบ · ${o.minutes} นาที`,
  practice: () => "เริ่มฝึก",
  short: () => "เริ่มเขียนตอบ",
  swot: () => "เริ่มจัด SWOT",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-slate-900">{children}</h2>;
}

export default function Landing() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ name: string }>();
  const [mode, setMode] = useState<Mode>("mock");
  const [opts, setOpts] = useState<ModeOpts>(DEFAULT_OPTS);
  const [busy, setBusy] = useState(false);

  // ข้อมูลในเครื่อง (อ่านได้หลัง mount เท่านั้น)
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, { seen: number; correct: number }>>({});
  const [infoOpen, setInfoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // มือถือ: แถบปุ่มเริ่มกลืนกับการ์ดตอนอยู่ที่ท้ายการ์ด และแสดงเส้น/เงาเฉพาะตอนลอยติดขอบล่างจอ
  const startEndRef = useRef<HTMLDivElement>(null);
  const [startFloating, setStartFloating] = useState(false);
  useEffect(() => {
    const el = startEndRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStartFloating(!e.isIntersecting && e.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const refresh = () => {
    setSessions(listSessions());
    setWrongIds(getWrongIds());
    setStats(getChapterStats());
  };

  useEffect(() => {
    const name = getName();
    if (name) form.setFieldValue("name", name);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลัง mount เท่านั้น
    refresh();
  }, [form]);

  const askName = async (): Promise<string | null> => {
    try {
      const { name } = await form.validateFields(["name"]);
      setName(name);
      return name.trim();
    } catch {
      message.warning("กรอกชื่อก่อนเริ่มทำข้อสอบ");
      form.scrollToField("name", { block: "center", behavior: "smooth" });
      form.focusField("name");
      return null;
    }
  };

  const go = (s: Session, empty: boolean) => {
    if (empty) {
      deleteSession(s.id);
      message.warning("ยังไม่มีข้อสอบในส่วนที่เลือก");
      setBusy(false);
      return;
    }
    router.push(sessionHref(s));
  };

  const start = async () => {
    const name = await askName();
    if (!name) return;
    setBusy(true);
    if (mode === "mock") {
      const s = createMockSession({ name, scope: opts.scope, minutes: opts.minutes });
      go(s, !s.mcq?.ids.length);
    } else if (mode === "practice") {
      const s = createPracticeSession({
        name,
        chapterIds: opts.pChapters.length ? opts.pChapters : allChapterIds,
        count: opts.pCount,
        coreOnly: opts.coreOnly,
      });
      go(s, !s.mcq?.ids.length);
    } else if (mode === "short") {
      const s = createShortSession({ name, chapterIds: opts.sChapters.length ? opts.sChapters : allChapterIds, count: opts.sCount });
      go(s, !s.short?.ids.length);
    } else {
      const s = createSwotSession({ name, setId: opts.swotSet });
      go(s, !s.swot?.setId);
    }
  };

  const startReview = async () => {
    const name = await askName();
    if (!name) return;
    setHistoryOpen(false);
    setBusy(true);
    const s = createReviewSession({ name, ids: wrongIds });
    go(s, !s.mcq?.ids.length);
  };

  const remove = (id: string) => {
    deleteSession(id);
    refresh();
  };

  const hasHistory = sessions.length > 0 || wrongIds.length > 0;

  return (
    <div className="flex min-h-screen flex-col text-base leading-[1.7] lg:h-screen lg:min-h-0">
      {/* หัวเดียวกับทุกหน้า · มือถือ: วันสอบอยู่ในแผงนับถอยหลังแล้ว ประวัติอยู่ท้ายหน้า จึงแสดงเฉพาะเดสก์ท็อป */}
      <AppHeader
        sticky={false}
        actions={
          <>
            <Tag color="gold" className="m-0 hidden px-2.5 py-1 text-sm lg:inline-block">
              สอบ {EXAM.dateLabel}
            </Tag>
            {hasHistory && (
              <span className="hidden lg:inline-block">
                <Badge count={wrongIds.length} size="small" title={`ข้อที่เคยตอบผิด ${wrongIds.length} ข้อ`}>
                  <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
                    ประวัติของฉัน
                  </Button>
                </Badge>
              </span>
            )}
          </>
        }
      />

      <main className={`${PAGE_CONTAINER} grid gap-5 py-5 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-5 lg:py-5 lg:[@media(min-height:900px)]:py-12`}>
        {/* หัวหน้า: ชื่อวิชา + นับถอยหลัง */}
        {/* มือถือ: ไม่ครอบการ์ด ให้หัวหน้าโล่ง / เดสก์ท็อป: เป็นการ์ด */}
        <Card
          className="min-w-0 max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none lg:col-start-1 lg:row-start-1 lg:shadow-sm"
          classNames={{ body: "p-0 pt-1 lg:p-6" }}
        >
          <ExamHero />
        </Card>

        {/* เริ่มทำ: ชื่อ → โหมด → ตัวเลือก → ปุ่มเริ่ม */}
        <Card
          className="min-w-0 shadow-sm max-lg:overflow-clip lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
          classNames={{ body: "p-5 pb-0 lg:p-6 lg:pb-6" }}
        >
          <Form form={form} layout="vertical" requiredMark={false} onFinish={start}>
            <Form.Item
              name="name"
              label={<span className="text-lg font-semibold text-slate-900">ชื่อผู้ทำข้อสอบ</span>}
              className="mb-5"
              rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อ" }, { max: 60 }]}
            >
              <Input size="large" placeholder="เช่น สมชาย ใจดี" autoComplete="name" maxLength={60} />
            </Form.Item>

            <SectionTitle>เลือกโหมด</SectionTitle>
            <ModeCards value={mode} onChange={setMode} />

            <div className="mt-4">
              <ModeOptions mode={mode} opts={opts} set={(patch) => setOpts((o) => ({ ...o, ...patch }))} />
            </div>

            {/* มือถือ: ปุ่มเริ่มติดขอบล่างจอขณะเลื่อนผ่านส่วนนี้ พื้นขาวเดียวกับการ์ด (การ์ดตัดมุมให้)
                เส้นคั่น/เงาแสดงเฉพาะตอนลอยอยู่เหนือเนื้อหา */}
            <div
              className={`sticky bottom-0 z-10 -mx-5 mt-6 border-t bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] transition-shadow lg:static lg:mx-0 lg:mt-6 lg:border-0 lg:p-0 lg:shadow-none ${
                startFloating ? "border-slate-200 shadow-[0_-6px_16px_-8px_rgba(15,23,42,0.18)]" : "border-transparent"
              }`}
            >
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={busy}
                icon={<PlayCircleOutlined />}
                className="h-13 text-lg font-semibold"
              >
                {START_LABEL[mode](opts)}
              </Button>
            </div>
            <div ref={startEndRef} aria-hidden />
          </Form>
        </Card>

        {/* มือถือ: ประวัติ (เฉพาะเมื่อมี) */}
        {hasHistory && (
          <Card className="min-w-0 shadow-sm lg:hidden" classNames={{ body: "p-5" }}>
            <SectionTitle>ประวัติของฉัน</SectionTitle>
            <div className="flex flex-col gap-3">
              <ReviewButton count={wrongIds.length} busy={busy} onClick={startReview} />
              {sessions.length > 0 && <HistoryList sessions={sessions} onRemove={remove} limit={3} />}
            </div>
          </Card>
        )}

        {/* ข้อมูลการสอบ / รายชื่อบท (พับไว้) */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto">
          <ExamInfo stats={stats} open={infoOpen} onOpenChange={setInfoOpen} />
          <Disclaimer className="px-2 pt-1 pb-4 text-balance lg:pb-0" />
        </div>
      </main>

      <Drawer
        title="ประวัติของฉัน"
        placement="right"
        size={480}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <ReviewButton count={wrongIds.length} busy={busy} onClick={startReview} />
          {sessions.length > 0 ? (
            <HistoryList sessions={sessions} onRemove={remove} />
          ) : (
            <p className="text-slate-500">ยังไม่มีประวัติ</p>
          )}
          <p className="m-0 text-sm text-slate-500">เก็บไว้ในเบราว์เซอร์นี้เท่านั้น</p>
        </div>
      </Drawer>
    </div>
  );
}
