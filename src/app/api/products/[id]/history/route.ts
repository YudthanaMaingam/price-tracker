// src/app/api/products/[id]/history/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // อย่าลืม Promise สำหรับ Next.js 15
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('price_history')
      .select('price, created_at')
      .eq('product_id', id)
      .order('created_at', { ascending: true }); // เรียงจากเก่าไปใหม่

    if (error) throw error;

    // แปลงข้อมูลนิดหน่อยให้กราฟอ่านง่ายขึ้น
    const chartData = data.map((item) => ({
      price: item.price,
      date: new Date(item.created_at).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short'
      }),
      fullDate: new Date(item.created_at).toLocaleString('th-TH')
    }));

    return NextResponse.json(chartData);

  } catch (error) {
    return NextResponse.json({ error: 'Error fetching history' }, { status: 500 });
  }
}