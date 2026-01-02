// src/lib/scraper.ts
import * as cheerio from 'cheerio';
import axios from 'axios';

// Import Puppeteer เฉพาะตอน Local เพื่อประหยัดพื้นที่ Vercel
let puppeteer: any;
if (process.env.NODE_ENV !== 'production') {
  try {
    puppeteer = require('puppeteer-core');
  } catch (e) {
    console.warn("Puppeteer-core not found (Running in Production mode?)");
  }
}

export interface ScrapedProductInfo {
  name: string;
  price: number;
  imageUrl: string;
  currency: string;
}

// ==========================================================================
// 1️⃣ MAIN FUNCTION: เลือกวิธี Scrape ตามสภาพแวดล้อม
// ==========================================================================
export async function scrapeProductInfo(url: string): Promise<ScrapedProductInfo | null> {
  // Clean URL
  const cleanUrl = url.split('?')[0];

  // ☁️ ถ้าอยู่บน Vercel -> ใช้ ZenRows (API)
  if (process.env.NODE_ENV === 'production') {
    return await scrapeWithZenRows(cleanUrl);
  } 
  
  // 💻 ถ้าอยู่บน Local -> ใช้ Puppeteer (Browser)
  else {
    return await scrapeWithLocalPuppeteer(cleanUrl);
  }
}

// ==========================================================================
// 2️⃣ ZENROWS STRATEGY (สำหรับ Vercel)
// ==========================================================================
async function scrapeWithZenRows(url: string): Promise<ScrapedProductInfo | null> {
  try {
    console.log("☁️ Scraper: Using ZenRows (Cloud)...");
    
    const apiKey = process.env.ZENROWS_API_KEY; 
    if (!apiKey) {
        console.error("❌ Missing ZENROWS_API_KEY in Environment Variables");
        return null;
    }

    const { data: html } = await axios.get('https://api.zenrows.com/v1/', {
      params: {
        'apikey': apiKey,
        'url': url,
        'js_render': 'true', 
        'premium_proxy': 'true', 
        'wait_for': '.pdp-mod-product-badge-title, .qaNIZv, ._44qnta', // รอให้ Element ชื่อสินค้าโผล่มา
      }
    });

    const $ = cheerio.load(html);
    
    // Helper Clean Price
    const cleanPrice = (priceStr: string | undefined | null) => {
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
    };

    // 1. JSON-LD Strategy
    let jsonData: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const json = JSON.parse($(el).html() || '{}');
            const product = Array.isArray(json) ? json.find(i => i['@type'] === 'Product') : (json['@type'] === 'Product' ? json : null);
            if (product?.name && (product?.offers?.price || product?.offers?.lowPrice)) {
                jsonData = product;
            }
        } catch(e) {}
    });

    if (jsonData) {
        return {
            name: jsonData.name,
            imageUrl: jsonData.image || '',
            price: cleanPrice(jsonData.offers.price || jsonData.offers.lowPrice),
            currency: 'THB'
        };
    }

    // 2. Selectors Strategy
    const getText = (s: string) => $(s).text().trim();
    
    // Advice / Shopee / Lazada Selectors
    const title = getText('.qaNIZv') || getText('._44qnta') || getText('h1') || getText('.product-name') || $('title').text();
    const price = getText('.G27QLf') || getText('.pqTWkA') || getText('.pdp-price') || getText('.price_online') || getText('.price');
    const image = $('.pdp-mod-common-image').attr('src') || $('.product-img img').attr('src') || '';

    if (title && price) {
        console.log("🎉 ZenRows Success via Selectors");
        return { name: title, imageUrl: image, price: cleanPrice(price), currency: 'THB' };
    }

    console.error("❌ ZenRows: Page loaded but content hidden/different layout");
    return null;

  } catch (error: any) {
    console.error("💥 ZenRows Error:", error.response?.data || error.message);
    return null;
  }
}

// ==========================================================================
// 3️⃣ PUPPETEER STRATEGY (สำหรับ Local) - โค้ดเดิมของคุณ
// ==========================================================================
async function scrapeWithLocalPuppeteer(url: string): Promise<ScrapedProductInfo | null> {
    let browser;
    try {
        console.log("💻 Scraper: Using Local Puppeteer...");
        
        // Config Path สำหรับ Windows Local
        const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; 
        
        browser = await puppeteer.launch({
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ],
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.setViewport({ width: 1920, height: 1080 });
        console.log("⏳ Navigating to:", url);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

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

            // Selectors
            const title = getText('.qaNIZv') || getText('._44qnta') || getText('h1') || document.title;
            const price = getText('.G27QLf') || getText('.pqTWkA') || getText('.price');
            
            if (title && price) return { name: title, imageUrl: '', price: cleanPrice(price), currency: 'THB', method: 'CSS' };

            return null;
        });

        if (data) console.log("🎉 Puppeteer Success");
        else console.error("❌ Puppeteer: Data Not Found");

        return data;

    } catch (error) {
        console.error("💥 Puppeteer Error:", error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}