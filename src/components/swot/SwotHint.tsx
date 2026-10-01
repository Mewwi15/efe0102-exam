"use client";

import { FilePdfOutlined } from "@ant-design/icons";
import { SWOT_FRAMEWORK, chapterLabel, slideUrl } from "@/lib/bank";
import { chapterIdFromFile, formatPages } from "@/lib/swot-meta";
import { SwotMatrix } from "./SwotMatrix";

// เนื้อหา "วิธีคิด" (อยู่ใน Drawer): หลัก 2 ขั้น + ตาราง 2×2 + ปัจจัย 2S4M / STEP + ที่มาในสไลด์
export function SwotHint() {
  const fw = SWOT_FRAMEWORK;
  const chapterId = fw ? chapterIdFromFile(fw.source.file) : "ch07";
  const url = slideUrl(chapterId);
  return (
    <div className="flex flex-col gap-6 text-base leading-[1.7] text-slate-700" data-testid="swot-hint">
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-900 text-sm font-bold text-white">1</span>
          <div>
            <b className="text-slate-900">ภายในหรือภายนอก?</b>
            <p className="m-0">ภายใน คือเรื่องของโรงเรียนเองที่ควบคุมได้ ภายนอก คือสิ่งที่เกิดรอบโรงเรียนและควบคุมไม่ได้</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-900 text-sm font-bold text-white">2</span>
          <div>
            <b className="text-slate-900">ช่วยหรือขัดขวาง?</b>
            <p className="m-0">ช่วยให้บรรลุวัตถุประสงค์ได้ S หรือ O ทำให้ไม่บรรลุได้ W หรือ T</p>
          </div>
        </li>
      </ol>
      <SwotMatrix compact />
      {fw && (
        <>
          <div>
            <div className="mb-1 font-semibold text-slate-900">ปัจจัยภายใน (2S4M)</div>
            <p className="m-0">{fw.internal.map((f) => `${f.th} (${f.en})`).join(" · ")}</p>
          </div>
          <div>
            <div className="mb-1 font-semibold text-slate-900">ปัจจัยภายนอก (STEP)</div>
            <p className="m-0">{fw.external.map((f) => `${f.th} (${f.en})`).join(" · ")}</p>
            <p className="m-0 mt-2 text-sm text-slate-500">
              ภูมิปัญญาชาวบ้านนับเป็นด้านเทคโนโลยี นโยบายรัฐและต้นสังกัดนับเป็นด้านการเมืองและกฎหมาย
            </p>
          </div>
          <p className="m-0 text-sm text-slate-500">
            ที่มา: {chapterLabel(chapterId)} หน้า {formatPages(fw.source.pages)}
            {url && (
              <>
                {" · "}
                <a href={url} target="_blank" rel="noreferrer" className="whitespace-nowrap">
                  <FilePdfOutlined /> เปิดสไลด์
                </a>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
