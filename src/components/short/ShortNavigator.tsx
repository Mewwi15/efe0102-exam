"use client";

export type ShortNavItem = { id: string; written: boolean; revealed: boolean; got: number; total: number };

// ปุ่มเลือกข้อแบบกะทัดรัด: ทึบ = ดูแนวคำตอบแล้ว, ฟ้าอ่อน = เขียนแล้ว, ขาว = ยังไม่เขียน
export function ShortNavigator({
  items,
  current,
  onJump,
  legend = true,
}: {
  items: ShortNavItem[];
  current: number;
  onJump: (index: number) => void;
  legend?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2 lg:gap-1.5">
        {items.map((it, i) => {
          const color = it.revealed
            ? "border-blue-900 bg-blue-900 text-white hover:bg-blue-800"
            : it.written
              ? "border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-700"
              : "border-slate-300 bg-white text-slate-700 hover:border-blue-700";
          const state = it.revealed ? ` ดูแนวคำตอบแล้ว ได้ ${it.got}/${it.total} ประเด็น` : it.written ? " เขียนแล้ว" : " ยังไม่เขียน";
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`ข้อ ${i + 1}${state}`}
              aria-current={i === current ? "step" : undefined}
              data-testid="short-nav"
              className={`h-11 w-11 cursor-pointer rounded-lg border text-sm font-medium lg:h-10 lg:w-10 transition-colors ${color} ${
                i === current ? "ring-2 ring-amber-400 ring-offset-2" : ""
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {legend && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded bg-blue-900" /> ดูแนวคำตอบแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-blue-300 bg-blue-50" /> เขียนแล้ว
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" /> ยังไม่เขียน
          </span>
        </div>
      )}
    </div>
  );
}
