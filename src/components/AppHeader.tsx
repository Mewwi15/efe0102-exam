"use client";

import Link from "next/link";
import { Button } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { Brand } from "./Brand";

// หัวหน้าเดียวกันทุกหน้า (ทำข้อสอบ / ผล / SWOT / เขียนตอบ / ไม่พบรอบ)
// ซ้าย: ตราเว็บ (เดสก์ท็อป) | ชื่อผู้ทำ + บรรทัดรองว่ากำลังทำอะไร · ขวา: ปุ่มของหน้านั้น · ล่าง: แถบความคืบหน้า
// ไม่ส่ง title: แสดงตราเว็บทุกขนาดจอแทน (หน้าแรกใช้แบบนี้ + actions เป็นป้ายวันสอบ/ปุ่มประวัติ)
// ทุกหน้า: กว้าง max-w-7xl · ขอบซ้ายขวา 16px (เดสก์ท็อป 24px) · สูง 64px + เส้นขอบ 1px
// แถบความคืบหน้าทับเส้นขอบล่าง จึงไม่ทำให้หัวสูงขึ้น โลโก้อยู่ตำแหน่งเดิมทุกหน้า
export const PAGE_CONTAINER = "mx-auto w-full max-w-7xl px-4 lg:px-6";

export function AppHeader({
  title,
  sub,
  mobileTitle,
  actions,
  progress,
  progressTone = "bg-blue-900",
  sticky = true,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  // มือถือ: แทนที่ชื่อ/บรรทัดรองด้วยเนื้อหาอื่น (เช่น ตอบแล้ว 7/60)
  mobileTitle?: React.ReactNode;
  actions?: React.ReactNode;
  // 0–1 ไม่ส่ง = ไม่มีแถบ
  progress?: number;
  progressTone?: string;
  // มือถือ: ติดขอบบนขณะเลื่อน (เดสก์ท็อปพอดีจออยู่แล้ว)
  sticky?: boolean;
  /** @deprecated ไม่มีผลแล้ว ทุกหน้าใช้ความกว้างเดียวกัน (max-w-7xl) */
  wide?: boolean;
}) {
  const titleBlock = title !== undefined && (
    <div className="min-w-0 leading-snug">
      <div className="font-semibold break-words text-slate-900" data-testid="header-title">
        {title}
      </div>
      {sub && <div className="text-sm text-slate-500">{sub}</div>}
    </div>
  );
  return (
    <header
      className={`relative z-20 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur ${sticky ? "max-lg:sticky max-lg:top-0" : ""}`}
    >
      <div className={`${PAGE_CONTAINER} flex min-h-16 items-center gap-3 py-2`}>
        {title === undefined ? (
          <div className="min-w-0 flex-1">
            <Brand compact />
          </div>
        ) : (
          <>
            <div className="hidden shrink-0 lg:block">
              <Brand compact />
            </div>
            <div className="hidden h-9 w-px shrink-0 bg-slate-200 lg:block" />
            <div className="min-w-0 flex-1">
              {mobileTitle ? (
                <>
                  <div className="lg:hidden">{mobileTitle}</div>
                  <div className="hidden lg:block">{titleBlock}</div>
                </>
              ) : (
                titleBlock
              )}
            </div>
          </>
        )}
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
      {progress !== undefined && (
        <div className="absolute inset-x-0 -bottom-px h-1 bg-slate-100">
          <div className={`h-1 transition-all ${progressTone}`} style={{ width: `${Math.round(progress * 1000) / 10}%` }} />
        </div>
      )}
    </header>
  );
}

// ปุ่มกลับหน้าแรกแบบเดียวกันทุกหน้า (มือถือสูง 44px)
export function HomeButton({ block = false, label = "หน้าแรก" }: { block?: boolean; label?: string }) {
  return (
    <Link href="/" className={block ? "block" : ""}>
      <Button block={block} icon={<HomeOutlined />} className="h-11 lg:h-10" data-testid="home">
        {label}
      </Button>
    </Link>
  );
}
