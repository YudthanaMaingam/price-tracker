import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Type สำหรับข้อมูลที่ Scrape มาได้
export interface ScrapedProductInfo {
    name: string;
    price: number;
    imageUrl: string;
    currency: string;
}

export async function scrapeProductInfo(url: string): Promise<ScrapedProductInfo | null> {
    let browser;

    try {
        // --------------------------------------------------------------------
        // 1. Browser Setup
        // --------------------------------------------------------------------
        if (process.env.NODE_ENV === 'production') {
            // --- Config สำหรับ Vercel (Production) ---
            // จำเป็นต้องใช้ puppeteer-core และ @sparticuz/chromium
            browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: { width: 1920, height: 1080 }, // กำหนดค่าเอง
                executablePath: await chromium.executablePath(),
                headless: true, // ใช้ true แทน "new"
            });
        } else {
            // --- Config สำหรับเครื่องเรา (Local) ---
            // ใช้ puppeteer ปกติที่มี Chrome แถมมา
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }

        const page = await browser.newPage();

        // --------------------------------------------------------------------
        // 2. Anti-Bot Setup
        // --------------------------------------------------------------------
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });

        // รอจนกว่า Network จะนิ่ง (โหลดเสร็จจริง)
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // --------------------------------------------------------------------
        // 3. Scraping Logic
        // --------------------------------------------------------------------
        const data = await page.evaluate(() => {
            const cleanPrice = (priceStr: string | null | undefined) => {
                if (!priceStr) return 0;
                const cleaned = priceStr.replace(/[^0-9.]/g, '');
                return parseFloat(cleaned) || 0;
            };

            const getText = (selector: string) => {
                const el = document.querySelector(selector);
                return el ? el.textContent?.trim() || '' : '';
            };

            const getAttr = (selector: string, attr: string) => {
                const el = document.querySelector(selector);
                return el ? el.getAttribute(attr) || '' : '';
            };

            // --- 1. JSON-LD ---
            let jsonLdData: any = {};
            try {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                scripts.forEach(script => {
                    const content = JSON.parse(script.textContent || '{}');
                    if (content['@type'] === 'Product') {
                        jsonLdData = content;
                    }
                    if (Array.isArray(content)) {
                        const product = content.find(item => item['@type'] === 'Product');
                        if (product) jsonLdData = product;
                    }
                });
            } catch (e) { console.error('JSON-LD Error', e); }

            if (jsonLdData.name && jsonLdData.offers) {
                return {
                    name: jsonLdData.name,
                    imageUrl: jsonLdData.image || '',
                    price: cleanPrice(jsonLdData.offers.price || jsonLdData.offers.lowPrice),
                    currency: jsonLdData.offers.priceCurrency || 'THB'
                };
            }

            // --- 2. Meta Tags ---
            const ogTitle = getAttr('meta[property="og:title"]', 'content');
            const ogImage = getAttr('meta[property="og:image"]', 'content');
            const ogPrice = getAttr('meta[property="product:price:amount"]', 'content') ||
                getAttr('meta[property="og:price:amount"]', 'content');

            if (ogTitle && ogPrice) {
                return {
                    name: ogTitle,
                    imageUrl: ogImage,
                    price: cleanPrice(ogPrice),
                    currency: 'THB'
                };
            }

            // --- 3. Selectors (Fallback) ---
            // Lazada
            const lazadaTitle = getText('.pdp-mod-product-badge-title') || getText('h1');
            const lazadaPrice = getText('.pdp-price') || getText('.pdp-mod-product-price .price');
            const lazadaImage = getAttr('.pdp-mod-common-image', 'src') || getAttr('.gallery-preview-panel__image', 'src');

            if (lazadaTitle && lazadaPrice) {
                return {
                    name: lazadaTitle,
                    imageUrl: lazadaImage,
                    price: cleanPrice(lazadaPrice),
                    currency: 'THB'
                };
            }

            // Shopee
            const shopeeTitle = getText('.qaNIZv') || getText('._44qnta') || document.title;
            const shopeePrice = getText('.G27QLf') || getText('.pqTWkA');

            if (shopeeTitle && shopeePrice) {
                return {
                    name: shopeeTitle,
                    imageUrl: '',
                    price: cleanPrice(shopeePrice),
                    currency: 'THB'
                }
            }

            return null;
        });

        return data;

    } catch (error) {
        console.error('Scraping failed:', error);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}