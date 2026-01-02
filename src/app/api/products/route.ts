// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // ใช้ Client ตัวใหม่ที่เราสร้าง
import { scrapeProductInfo } from '@/lib/scraper';
import { ScrapedProductInfo } from '@/types';

export async function POST(req: Request) {
  try {
    // 1. เช็ค User ก่อน (Security)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // 2. ดึง URL และ targetPrice จาก Body
    const { url, targetPrice } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const scrapedInfo = await scrapeProductInfo(url);
    if (!scrapedInfo) return NextResponse.json({ error: 'Failed to scrape' }, { status: 400 });

    // 2. บันทึกโดยใส่ user_id ไปด้วย
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          user_id: user.id, // ผูกกับเจ้าของ
          name: scrapedInfo.name,
          url: url,
          image_url: scrapedInfo.imageUrl,
          current_price: scrapedInfo.price,
          original_price: scrapedInfo.price,
          lowest_price: scrapedInfo.price,
          highest_price: scrapedInfo.price,
          target_price: targetPrice || null,
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // บันทึก History แรกเริ่ม
    if (data) {
      await supabase.from('price_history').insert([
        { product_id: data.id, price: scrapedInfo.price }
      ]);
    }

    return NextResponse.json({ message: 'Product added', product: data }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // ถ้าไม่ล็อกอิน ส่ง list ว่างไป
    return NextResponse.json([]);
  }

  // Supabase จะกรองให้อัตโนมัติด้วย RLS Policy ที่เราทำใน Phase 1
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  // แปลง snake_case -> camelCase (เหมือนเดิม)
  const formatted = products?.map(p => ({
    ...p,
    imageUrl: p.image_url,
    currentPrice: p.current_price,
    originalPrice: p.original_price,
    lowestPrice: p.lowest_price,
    highestPrice: p.highest_price
  })) || [];

  return NextResponse.json(formatted);
}