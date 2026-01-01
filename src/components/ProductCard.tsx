// src/components/ProductCard.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Product } from '@/types';
import { PriceChart } from './PriceChart'; // อย่าลืม Import กราฟที่เราสร้าง

// --- Helper Functions ---

const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  // เช็คว่า Date ใช้ได้จริงไหม ถ้าไม่ได้ให้คืนค่าขีด
  if (isNaN(date.getTime())) return '-';
  
  // ถ้าเป็นวันที่ปัจจุบัน ให้แสดงแค่เวลา, ถ้าเก่ากว่านั้นแสดงวันที่
  const isToday = new Date().toDateString() === date.toDateString();
  
  return date.toLocaleDateString('th-TH', {
    day: isToday ? undefined : 'numeric', 
    month: isToday ? undefined : 'short', 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

// --- Component ---

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  // คำนวณส่วนต่างราคา
  const isPriceDropped = product.originalPrice && product.currentPrice < product.originalPrice;
  const priceDropAmount = (product.originalPrice || 0) - product.currentPrice;

  // 1. Mutation: ลบสินค้า
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => alert('Failed to delete product.')
  });

  // 2. Mutation: เช็คราคา (Refresh)
  const refreshMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to update price');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // บังคับ Refetch History ของกราฟด้วย
      queryClient.invalidateQueries({ queryKey: ['price-history', product.id] });
      // alert(`Updated! Price: ${formatCurrency(data.newPrice)}`); // ปิด alert ก็ได้ถ้ารำคาญ
    },
    onError: () => alert('Failed to update price.')
  });

  const handleDelete = () => {
    if (confirm(`Delete "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  return (
    <div 
      className="bg-gray-800 text-gray-100 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-700 flex flex-col sm:flex-row relative group h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* ปุ่ม Delete (มุมขวาบน Absolute) */}
      <button 
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className={`cursor-pointer absolute top-2 right-2 z-20 p-2 bg-red-600/90 text-white rounded-full transition-all duration-200 hover:bg-red-700 shadow-md transform hover:scale-110
          ${isHovered ? 'opacity-100 visible' : 'opacity-0 invisible sm:invisible sm:group-hover:visible'} 
          ${deleteMutation.isPending ? 'cursor-wait opacity-50' : ''}`}
        title="Delete"
      >
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>

      {/* --- ส่วนซ้าย: ข้อมูลสินค้า --- */}
      {/* min-w-0 สำคัญมาก! ช่วยให้ text-truncate ทำงานใน Flexbox ได้ */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 border-b sm:border-b-0 sm:border-r border-gray-700 min-w-0">
        
        <div className="flex gap-4 min-w-0">
            {/* รูปภาพ */}
            <div className="relative w-24 h-24 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden border border-gray-700/50 self-start">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 20vw"
                  className="object-contain p-1 hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-[10px]">No Img</div>
              )}
            </div>

            {/* ชื่อและราคาหลัก */}
            <div className="flex-1 min-w-0 flex flex-col justify-start">
                <h3 className="text-sm sm:text-base font-semibold text-gray-100 line-clamp-2 leading-snug mb-2 hover:text-blue-400 transition-colors">
                    <Link href={product.url} target="_blank">{product.name}</Link>
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 mb-1">
                   <span className={`text-xl sm:text-2xl font-bold ${isPriceDropped ? 'text-green-400' : 'text-blue-400'}`}>
                    {formatCurrency(product.currentPrice)}
                  </span>
                  {isPriceDropped && (
                    <span className="text-[10px] text-green-300 bg-green-900/40 px-1.5 py-0.5 rounded border border-green-700/50">
                       ↓ {formatCurrency(priceDropAmount)}
                    </span>
                  )}
                </div>
                 <p className="text-[10px] text-gray-500">
                    Updated: {formatDate(product.updatedAt)}
                 </p>
            </div>
        </div>

        {/* สถิติราคา (Horizontal Compact - ไม่ซ้อนกัน) */}
        <div className="mt-auto flex items-center justify-between gap-1 bg-gray-900/40 py-2 px-2 rounded-lg border border-gray-700/50">
          {/* High */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">High</span>
            <span className="font-medium text-[11px] sm:text-xs text-red-300 truncate w-full text-center">
              {formatCurrency(product.highestPrice)}
            </span>
          </div>
          {/* Low */}
          <div className="flex flex-col items-center flex-1 min-w-0 bg-gray-800/50 rounded py-0.5">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Low</span>
            <span className="font-medium text-[11px] sm:text-xs text-green-300 truncate w-full text-center">
              {formatCurrency(product.lowestPrice)}
            </span>
          </div>
          {/* Start */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Start</span>
            <span className="font-medium text-[11px] sm:text-xs text-gray-300 truncate w-full text-center">
              {formatCurrency(product.originalPrice)}
            </span>
          </div>
        </div>

      </div>

      {/* --- ส่วนขวา: กราฟ & Actions --- */}
      {/* sm:w-[13rem] -> Fix ความกว้างในจอใหญ่ */}
      {/* flex-shrink-0 -> ห้ามโดนบีบจนปุ่มเบี้ยว */}
      <div className="p-4 bg-gray-900/20 flex flex-col justify-between gap-3 sm:w-[13rem] flex-shrink-0 border-t sm:border-t-0 border-gray-700">
        
        {/* Graph Area */}
        <div className="h-20 w-full bg-gray-800/50 rounded-md border border-gray-700/50 relative overflow-hidden group-hover:border-gray-600 transition-colors">
            <div className="absolute inset-0 pt-2 pr-2 pb-0 pl-0">
                {/* Component กราฟ */}
                <PriceChart productId={product.id} />
            </div>
            <span className="absolute top-1 left-2 text-[9px] text-gray-500 font-mono z-10 pointer-events-none opacity-70">
                HISTORY
            </span>
        </div>
        
        {/* Buttons Action */}
        <div className="flex flex-col gap-2">
           {/* ปุ่ม Refresh */}
           <button
                onClick={(e) => {
                    e.stopPropagation();
                    refreshMutation.mutate(product.id);
                }}
                disabled={refreshMutation.isPending}
                // whitespace-nowrap ป้องกันข้อความตกบรรทัด
                className={`cursor-pointer w-full py-1.5 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-2 transition-all whitespace-nowrap
                    ${refreshMutation.isPending 
                        ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-wait' 
                        : 'bg-gray-800 text-green-400 border-green-900/50 hover:bg-green-900/20 hover:text-green-300'
                    }
                `}
            >
                {refreshMutation.isPending ? (
                    <>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Updating...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        <span>Check Price</span>
                    </>
                )}
            </button>

            {/* ปุ่ม Visit Store */}
           <Link 
              href={product.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full py-1.5 px-3 rounded-md text-xs font-medium bg-blue-600/10 text-blue-400 border border-blue-900/50 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Visit Store</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
           </Link>
        </div>

      </div>
    </div>
  );
};