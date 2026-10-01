"use client";

import Link from "next/link";
import { Button, Card, Result, Spin } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { AppHeader } from "./AppHeader";

// สถานะร่วมของทุกหน้าที่อ่านรอบจาก localStorage: กำลังโหลด / ไม่พบรอบ

export function FullPageSpin() {
  return (
    <div className="grid min-h-screen place-items-center" data-testid="loading">
      <Spin size="large" />
    </div>
  );
}

export function SessionMissing({
  title = "ไม่พบรอบนี้ในเบราว์เซอร์นี้",
  sub = "ข้อมูลการฝึกเก็บไว้เฉพาะในเบราว์เซอร์ที่ใช้ทำ อาจถูกลบไปแล้วหรือเปิดจากเครื่องอื่น เริ่มรอบใหม่ได้จากหน้าแรก",
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader sticky={false} />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Card className="shadow-sm" data-testid="session-missing">
          <Result
            status="warning"
            title={title}
            subTitle={sub}
            extra={
              <Link href="/">
                <Button type="primary" size="large" icon={<HomeOutlined />} className="h-12">
                  กลับหน้าแรก
                </Button>
              </Link>
            }
          />
        </Card>
      </main>
    </div>
  );
}
