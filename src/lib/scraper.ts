// src/lib/scraper.ts
import puppeteer from 'puppeteer-core';

export interface ScrapedProductInfo {
  name: string;
  price: number;
  imageUrl: string;
  currency: string;
}

export async function scrapeProductInfo(url: string): Promise<ScrapedProductInfo | null> {
  let browser;

  try {
    console.log("🚀 Starting Scraper...");

    // Clean URL
    const cleanUrl = url.split('?')[0];
    
    // ---------------------------------------------------------
    // ⚙️ Config Browser
    // ---------------------------------------------------------
    let executablePath: string;
    let args: string[] = [];

    if (process.env.NODE_ENV === 'production') {
        // ☁️ บน Vercel: ใช้ Chromium-min
        const chromium = require('@sparticuz/chromium-min');
        
        // Load Browser
        executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar');
        
        // ⚠️ TWEAK: เพิ่ม Stealth Args สำหรับ Vercel
        args = [
            ...chromium.args,
            '--hide-scrollbars',
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // สำคัญสำหรับ Serverless memory
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled', // ⛔ ปิด Flag บอท
        ];
    } else {
        // 💻 บน Local (Windows)
        // อย่าลืมเช็ค path นี้ให้ตรงกับเครื่องคุณ
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
        args = [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled' 
        ];
    }

    // Launch Browser
    browser = await puppeteer.launch({
      args: args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: executablePath,
      headless: true, // Vercel บังคับ headless: true
    });

    const page = await browser.newPage();

    // 🥷 Manual Stealth: ปลอม User-Agent ให้เหมือนคนใช้ Windows จริงๆ
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 🥷 Manual Stealth: ลบ webdriver property
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    await page.setViewport({ width: 1920, height: 1080 });

    console.log("⏳ Navigating to:", cleanUrl);
    // เพิ่ม Timeout ให้นานขึ้นบน Vercel (บางทีเน็ตช้า)
    await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // ✅ Debug: ปริ้นท์ Title ออกมาดูใน Log ของ Vercel
    const pageTitle = await page.title();
    console.log("📄 Page Title (Vercel):", pageTitle);

    // --- ส่วน Logic การดึงข้อมูล (เหมือนเดิม) ---
    const data = await page.evaluate(() => {
      const cleanPrice = (priceStr: any) => {
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      const getText = (s: string) => document.querySelector(s)?.textContent?.trim() || '';
      const getAttr = (s: string, a: string) => document.querySelector(s)?.getAttribute(a) || '';

      // JSON-LD
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          const json = JSON.parse(script.textContent || '{}');
          const product = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : (json['@type'] === 'Product' ? json : null);
          if (product?.name && (product?.offers?.price || product?.offers?.lowPrice)) {
            return {
              name: product.name,
              imageUrl: product.image || '',
              price: cleanPrice(product.offers.price || product.offers.lowPrice),
              currency: 'THB',
              method: 'JSON-LD'
            };
          }
        }
      } catch (e) {}

      // Meta Tags
      const ogTitle = getAttr('meta[property="og:title"]', 'content');
      const ogPrice = getAttr('meta[property="product:price:amount"]', 'content') || getAttr('meta[property="og:price:amount"]', 'content');
      const ogImage = getAttr('meta[property="og:image"]', 'content');
      if (ogTitle && ogPrice) return { name: ogTitle, imageUrl: ogImage, price: cleanPrice(ogPrice), currency: 'THB', method: 'MetaTags' };

      // CSS Selectors
      const title = getText('.qaNIZv') || getText('._44qnta') || getText('h1') || document.title;
      const price = getText('.G27QLf') || getText('.pqTWkA') || getText('.price');
      if (title && price) return { name: title, imageUrl: '', price: cleanPrice(price), currency: 'THB', method: 'CSS' };

      return null;
    });

    if (data) {
        console.log("🎉 Data Found via:", (data as any).method);
    } else {
        console.error("❌ Data Not Found (Page loaded but content hidden)");
        // ถ้าหาไม่เจอ ลอง log HTML บางส่วนมาดูได้ (แต่ Log จะยาวมาก)
    }

    return data;

  } catch (error) {
    console.error("💥 Scraper Error:", error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}