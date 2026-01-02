// src/app/api/cron/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrapeProductInfo } from '@/lib/scraper';

// Config ให้ Vercel รู้ว่างานนี้ใช้เวลานาน (Max 60วิ สำหรับ Free Tier)
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // -------------------------------------------------------------
    // 🔒 Security Check (กันคนอื่นมากดเล่น)
    // -------------------------------------------------------------
    // ตอนทดสอบ Local ให้ Comment บรรทัดนี้ทิ้งไปก่อนได้ครับ
    // แต่ตอนขึ้น Vercel จริง เราจะตั้งค่าให้ Vercel ส่ง Key นี้มา
    /*
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    */

    const supabase = await createClient();

    // 1. ดึงสินค้าทั้งหมดจาก Database
    const { data: products, error } = await supabase
      .from('products')
      .select('*');

    if (error || !products) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    console.log(`⏰ Cron Started: Checking ${products.length} products...`);
    const results = [];

    // 2. วนลูปเช็คราคาทีละตัว
    for (const product of products) {
      try {
        // Scrape ราคาใหม่
        const scrapedData = await scrapeProductInfo(product.url);
        
        if (scrapedData && scrapedData.price) {
          const newPrice = scrapedData.price;
          
          // คำนวณ Min/Max
          const currentLowest = product.lowest_price ?? newPrice;
          const currentHighest = product.highest_price ?? newPrice;
          const newLowest = Math.min(newPrice, currentLowest);
          const newHighest = Math.max(newPrice, currentHighest);

          // อัปเดตลง Database
          await supabase
            .from('products')
            .update({
                current_price: newPrice,
                lowest_price: newLowest,
                highest_price: newHighest,
                name: scrapedData.name,     // อัปเดตชื่อเผื่อเปลี่ยน
                image_url: scrapedData.imageUrl, // อัปเดตรูปเผื่อเปลี่ยน
                updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          // บันทึก History
          await supabase.from('price_history').insert([
            { product_id: product.id, price: newPrice }
          ]);

          results.push({ id: product.id, name: product.name, status: 'Updated', price: newPrice });
          console.log(`✅ Updated: ${product.name} -> ${newPrice}`);
        } else {
          results.push({ id: product.id, name: product.name, status: 'Failed to scrape' });
          console.error(`❌ Failed: ${product.name}`);
        }

      } catch (err) {
        console.error(`💥 Error processing ${product.name}:`, err);
        results.push({ id: product.id, status: 'Error', error: err });
      }

      // ⚠️ Delay นิดนึงกันโดนบล็อก (Wait 2s)
      await new Promise(r => setTimeout(r, 2000));
    }

    return NextResponse.json({ 
      message: 'Cron job finished', 
      results 
    });

  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}