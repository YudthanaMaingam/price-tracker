// src/app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { scrapeProductInfo } from '@/lib/scraper';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 1. DELETE: ลบสินค้า
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        // 1. เช็ค User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // RLS จะทำงานตรงนี้อัตโนมัติ ถ้า id นี้ไม่ใช่ของ user คนนี้ มันจะลบไม่ได้เอง
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Product deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
    }
}

// 2. PATCH: อัปเดตราคาใหม่
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        // 1. เช็ค User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // 🔍 อ่าน Body เพื่อดูว่า User ต้องการทำอะไร
        let body = {};
        try {
            body = await request.json();
        } catch (e) {
            // ถ้าไม่มี body แปลว่าเป็นการกดปุ่ม Refresh (Scrape) แบบเดิม
        }

        const { targetPrice } = body as { targetPrice?: number | null };

        // =========================================================
        // 🅰️ กรณีที่ 1: มีการส่ง targetPrice มา -> ให้อัปเดตแค่เป้าหมาย
        // =========================================================
        if (targetPrice !== undefined) {
            const { error } = await supabase
                .from('products')
                .update({
                    target_price: targetPrice,
                    updated_at: new Date().toISOString() // อัปเดตเวลาด้วยเพื่อให้รู้ว่ามีการแก้ไข
                })
                .eq('id', id);

            if (error) throw error;

            return NextResponse.json({ message: 'Target price updated', targetPrice });
        }

        // =========================================================
        // 🅱️ กรณีที่ 2: ไม่ได้ส่ง targetPrice -> ทำการ Scrape ราคาใหม่ (Logic เดิม)
        // =========================================================
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('url, lowest_price, highest_price, current_price')
            .eq('id', id)
            .single();

        if (fetchError || !product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // 3. Scrape ราคาใหม่
        const scrapedData = await scrapeProductInfo(product.url);

        if (!scrapedData || !scrapedData.price) {
            return NextResponse.json({ error: 'Failed to scrape latest price' }, { status: 500 });
        }

        
        const newPrice = scrapedData.price;
        const newLowest = Math.min(newPrice, product.lowest_price);
        const newHighest = Math.max(newPrice, product.highest_price);
        const currentLowest = product.lowest_price ?? newPrice; 
        const currentHighest = product.highest_price ?? newPrice;

        // 4. อัปเดต DB
        const { error: updateError } = await supabase
            .from('products')
            .update({
                current_price: newPrice,
                lowest_price: newLowest,
                highest_price: newHighest,
                image_url: scrapedData.imageUrl,
                name: scrapedData.name,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateError) throw updateError;

        // 5. บันทึก History
        // หมายเหตุ: ถ้าตาราง price_history เปิด RLS ไว้ ต้องแน่ใจว่ามี Policy ให้ Insert ได้ด้วย
        await supabase.from('price_history').insert([
            { product_id: id, price: newPrice }
        ]);

        return NextResponse.json({
            message: 'Price updated',
            newPrice,
            status: newPrice < product.lowest_price ? 'New Lowest Price!' : 'Updated'
        });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}