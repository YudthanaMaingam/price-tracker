import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export interface ScrapedProductInfo {
  name: string;
  price: number;
  imageUrl: string;
  currency: string;
}

export async function scrapeProductInfo(url: string): Promise<ScrapedProductInfo | null> {
  let browser: any = null;

  try {
    if (process.env.NODE_ENV === 'production') {
      // ---------------------------------------------------------
      // 🔥 Config สำหรับ Vercel (Amazon Linux 2023) 🔥
      // ---------------------------------------------------------
      
      // Setup การเชื่อมต่อแบบ Remote
      browser = await puppeteerCore.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        
        // ⚠️ สำคัญที่สุด: สั่งให้โหลดไฟล์จาก GitHub โดยตรง ไม่ต้องหาในเครื่อง
        executablePath: await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar"
        ),
        
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

    } else {
      // --- Config สำหรับ Localhost ---
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    const page = await browser.newPage();
    
    // ตั้งค่า User Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // รอโหลดหน้าเว็บ
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // --- Logic การดึงข้อมูล (เหมือนเดิม) ---
    const data = await page.evaluate(() => {
      const cleanPrice = (priceStr: string | null | undefined) => {
        if (!priceStr) return 0;
        return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      };

      const getText = (s: string) => document.querySelector(s)?.textContent?.trim() || '';
      const getAttr = (s: string, a: string) => document.querySelector(s)?.getAttribute(a) || '';

      // 1. JSON-LD
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
          const json = JSON.parse(script.textContent || '{}');
          const product = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : (json['@type'] === 'Product' ? json : null);
          if (product?.name && product?.offers) {
            return {
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
      const ogImage = getAttr('meta[property="og:image"]', 'content');
      const ogPrice = getAttr('meta[property="product:price:amount"]', 'content') || getAttr('meta[property="og:price:amount"]', 'content');
      if (ogTitle && ogPrice) return { name: ogTitle, imageUrl: ogImage, price: cleanPrice(ogPrice), currency: 'THB' };

      // 3. Fallback Selectors
      const title = getText('.pdp-mod-product-badge-title') || getText('h1') || getText('.qaNIZv') || document.title;
      const price = getText('.pdp-price') || getText('.pdp-mod-product-price .price') || getText('.G27QLf');
      const image = getAttr('.pdp-mod-common-image', 'src') || getAttr('.gallery-preview-panel__image', 'src');

      if (title && price) return { name: title, imageUrl: image, price: cleanPrice(price), currency: 'THB' };
      return null;
    });

    return data;

  } catch (error) {
    console.error('Scraping failed:', error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}