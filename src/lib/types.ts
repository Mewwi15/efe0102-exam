// ชนิดข้อมูลของคลังข้อสอบ (ตรงกับ src/data/bank.json ที่ scripts/build-bank.mjs สร้าง)

export type ChoiceIndex = 0 | 1 | 2 | 3;

export type Period = "ก่อนกลางภาค" | "หลังกลางภาค";

export type Chapter = {
  id: string;
  no: string;
  title: string;
  file: string;
  pages: number;
  period: Period;
  driveId: string;
  week: string;
  topics: string;
  mcqCount: number;
  shortCount: number;
};

export type McqLevel = "จำ" | "เข้าใจ" | "ประยุกต์";

export type Mcq = {
  id: string;
  chapterId: string;
  q: string;
  choices: string[];
  answer: number;
  explain: string;
  source: { page: number; quote: string };
  level: McqLevel;
  core: boolean;
  shuffle: boolean;
  tags: string[];
};

export type ShortQ = {
  id: string;
  chapterId: string;
  q: string;
  answer: string;
  points: string[];
  // คำสำคัญ/คำพ้องของแต่ละประเด็น (ตรงลำดับกับ points) ใช้ช่วยติ๊กจากคำตอบที่พิมพ์ ข้อที่ไม่มี = ติ๊กเองอย่างเดียว
  keywords?: string[][];
  source: { pages: number[] };
};

export type SwotLetter = "S" | "W" | "O" | "T";

export type SwotItem = {
  id: string;
  text: string;
  answer: SwotLetter;
  factor: string;
  factorTh: string;
  explain: string;
  tricky: boolean;
};

export type TowsKey = "SO" | "ST" | "WO" | "WT";

export type SwotSet = {
  id: string;
  title: string;
  context: string;
  items: SwotItem[];
  tows: Record<TowsKey, { text: string; uses: string[] }[]>;
};

export type SwotFactor = { code: string; th: string; en: string };

export type SwotFramework = {
  source: { file: string; pages: number[] };
  internal: SwotFactor[];
  external: SwotFactor[];
  note: string;
};
