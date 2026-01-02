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
    // ⚙️ Config Browser (แยก Local vs Production)
    // ---------------------------------------------------------
    let executablePath: string;
    let args: string[] = [];

    // เช็คว่าเป็น Production (Vercel) หรือ Local
    if (process.env.NODE_ENV === 'production') {
        // ☁️ บน Vercel: ใช้ Chromium-min
        const chromium = require('@sparticuz/chromium-min');
        
        // โหลดไฟล์ Browser (ต้องใช้ท่านี้สำหรับ Vercel)
        executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar');
        
        args = chromium.args;
    } else {
        // 💻 บน Local (Windows): ใช้ Chrome ในเครื่อง
        // ลองหา path ของ Chrome ในเครื่องคุณ
        // ส่วนใหญ่จะอยู่ที่นี่ครับ (ถ้า Error ให้ลองเปลี่ยน Path ดู)
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
        
        // หรือถ้าใช้ Mac: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        
        args = ['--no-sandbox', '--disable-setuid-sandbox'];
    }

    // Launch Browser
    browser = await puppeteer.launch({
      args: [...args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: executablePath,
      headless: true, // Serverless ต้อง headless เสมอ
    });

    const page = await browser.newPage();

    // 🥷 Manual Stealth (พื้นฐาน)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // -------------------------------------------------------

    console.log("⏳ Navigating...");
    await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    const pageTitle = await page.title();
    console.log("📄 Title:", pageTitle);

    // เช็คว่าโดนดีดไป Login หรือไม่
    if (pageTitle.includes("Login") || pageTitle.includes("เข้าสู่ระบบ")) {
       console.error("❌ Redirected to Login Page");
       // ถ้าอยากสู้ต่อ ต้องเพิ่ม logic Login ตรงนี้ (แต่ยาก)
       return null;
    }

    // Extract Data
    console.log("🔍 Extracting...");
    const data = await page.evaluate(() => {
      const cleanPrice = (priceStr: any) => {
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      };
      
      const getText = (s: string) => document.querySelector(s)?.textContent?.trim() || '';
      const getAttr = (s: string, a: string) => document.querySelector(s)?.getAttribute(a) || '';

      // 1. JSON-LD
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          const json = JSON.parse(script.textContent || '{}');
          const product = Array.isArray(json) 
            ? json.find(i => i['@type'] === 'Product') 
            : (json['@type'] === 'Product' ? json : null);
          
          if (product?.name && (product?.offers?.price || product?.offers?.lowPrice)) {
            return {
              method: 'JSON-LD',
              name: product.name,
              imageUrl: product.image || '',
              price: cleanPrice(product.offers.price || product.offers.lowPrice),
              currency: 'THB'
            };
          }
        }
      } catch (e) {}

      // 2. Meta Tags
      const ogTitle = getAttr('meta[property="og:title"]', 'content');
      const ogPrice = getAttr('meta[property="product:price:amount"]', 'content') || 
                      getAttr('meta[property="og:price:amount"]', 'content');
      const ogImage = getAttr('meta[property="og:image"]', 'content');
      if (ogTitle && ogPrice) {
         return { method: 'Meta Tags', name: ogTitle, imageUrl: ogImage, price: cleanPrice(ogPrice), currency: 'THB' };
      }

      // 3. Shopee Selectors (Specific)
      const shopeeTitle = getText('.qaNIZv') || getText('._44qnta') || getText('.attM6y') || document.title;
      const shopeePrice = getText('.G27QLf') || getText('.pqTWkA') || getText('._04isqj');
      
      if (shopeeTitle && shopeePrice) {
          return { method: 'CSS Selectors', name: shopeeTitle, imageUrl: '', price: cleanPrice(shopeePrice), currency: 'THB' };
      }

      return null;
    });

    if (data) {
        console.log("🎉 SUCCESS via:", (data as any).method);
        console.log("💰 Price:", data.price);
    } else {
        console.error("❌ Data Not Found (Page loaded but content hidden)");
    }

    return data;

  } catch (error) {
    console.error("💥 Error:", error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}