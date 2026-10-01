import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "@/components/Providers";
import "./globals.css";

const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ติวสอบปลายภาค EFE0102",
  description:
    "ฝึกทำข้อสอบปลายภาควิชาการบริหารสถานศึกษาและการประกันคุณภาพการศึกษา ทั้งปรนัย เขียนตอบสั้น และ SWOT พร้อมเฉลยและคำอธิบายจากสไลด์ประกอบการสอน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thai.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-100 font-sans text-slate-800">
        <AntdRegistry layer>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
