"use client";

import Link from "next/link";

// ตราตัวอักษร "QA" + ชื่อเว็บ
export function Brand({ compact = false }: { compact?: boolean }) {
  const size = compact ? 36 : 44;
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 text-inherit no-underline">
      <span
        className="grid shrink-0 place-items-center rounded-full bg-blue-900 font-bold text-amber-300"
        style={{ width: size, height: size }}
      >
        QA
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate font-semibold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>
          ติวสอบปลายภาค EFE0102
        </span>
        {!compact && (
          <span className="hidden truncate text-xs text-slate-500 sm:block">
            การบริหารสถานศึกษาและการประกันคุณภาพการศึกษา
          </span>
        )}
      </span>
    </Link>
  );
}

export function Disclaimer({ className = "py-6" }: { className?: string }) {
  return (
    <p className={`mx-auto max-w-3xl px-4 text-center text-xs text-slate-500 ${className}`}>
      เว็บฝึกซ้อมที่ทำขึ้นจากสไลด์ประกอบการสอนของอาจารย์ ข้อสอบทั้งหมดแต่งขึ้นเพื่อฝึกทบทวน ไม่ใช่ข้อสอบจริง
    </p>
  );
}
