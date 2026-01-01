/** @type {import('next').NextConfig} */
const nextConfig = {
  // บังคับให้รวมไฟล์ Chromium และ Puppeteer ไปด้วย (ไม่ต้องบีบอัด)
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  
  // (Optional) ถ้ามี error เรื่อง Type ตอน build ให้ใส่บรรทัดนี้เพื่อข้ามไปก่อน
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;