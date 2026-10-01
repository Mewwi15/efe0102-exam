// ตัวเลขผลใหญ่แบบเดียวกันทุกหน้าสรุป (ปรนัย / SWOT / เขียนตอบ): ป้ายเล็ก → ตัวเลขใหญ่ → หน่วย
export function BigNumber({
  label,
  tone = "text-slate-900",
  suffix,
  testId,
  children,
}: {
  label: string;
  tone?: string;
  suffix?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`flex flex-wrap items-baseline gap-x-1.5 ${tone}`}>
        <span className="text-4xl leading-tight font-bold tabular-nums" data-testid={testId}>
          {children}
        </span>
        {suffix && <span className="text-base text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}
