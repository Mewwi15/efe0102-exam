import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // แยกโฟลเดอร์ build ได้ เมื่อรันหลายเซิร์ฟเวอร์ในโฟลเดอร์เดียวกัน
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
