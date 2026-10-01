"use client";

import { App, ConfigProvider } from "antd";
import thTH from "antd/locale/th_TH";

export const BRAND = "#1e3a8a";

// มาตรฐานเดียวกันทุกหน้า: ตัวอักษร 16px · ปุ่มปกติ 40px · ปุ่ม large 44px (กดง่ายบนมือถือ)
// ลิงก์ใช้สีกรมท่าเดียวกับปุ่มหลัก ไม่ใช่สีฟ้าเริ่มต้นของ antd
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={thTH}
      theme={{
        token: {
          colorPrimary: BRAND,
          colorLink: BRAND,
          colorLinkHover: "#1e40af",
          colorLinkActive: "#172554",
          borderRadius: 10,
          fontFamily: "var(--font-thai), ui-sans-serif, system-ui, sans-serif",
          fontSize: 16,
          controlHeight: 40,
          controlHeightLG: 44,
        },
        components: {
          Radio: { radioSize: 18 },
          // ปุ่ม large ต่างแค่ความสูง ตัวอักษร 16px เท่าปุ่มอื่น
          Button: { contentFontSizeLG: 16 },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
