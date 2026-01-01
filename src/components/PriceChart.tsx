'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  productId: string;
}

export function PriceChart({ productId }: PriceChartProps) {
  // ดึงข้อมูลประวัติราคา
  const { data, isLoading } = useQuery({
    queryKey: ['price-history', productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-md animate-pulse">
        <span className="text-xs text-gray-500">Loading graph...</span>
      </div>
    );
  }

  // กรณีข้อมูลน้อยกว่า 2 จุด (เพิ่งเพิ่มสินค้า) จะยังไม่แสดงกราฟ
  if (!data || data.length < 1) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-800 rounded-md">
        <span className="text-xs text-gray-500">Not enough data</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`colorPrice-${productId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          {/* ซ่อนแกน Y แต่กำหนด Domain ให้กราฟดูมีการเคลื่อนไหว (ไม่แบนติดพื้น) */}
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis dataKey="date" hide />

          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
            itemStyle={{ color: '#60A5FA' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number | undefined) => value ? [`฿${value.toLocaleString()}`, 'Price'] : ['N/A', 'Price']}
          />

          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#3B82F6" 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#colorPrice-${productId})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}