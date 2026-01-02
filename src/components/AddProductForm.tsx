// src/components/AddProductForm.tsx
'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function AddProductForm() {
  const [productUrl, setProductUrl] = useState('');
  // ✅ 1. เพิ่ม State สำหรับราคาเป้าหมาย
  const [targetPrice, setTargetPrice] = useState('');
  
  const queryClient = useQueryClient();

  const addProductMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ 2. ส่ง targetPrice ไปด้วย
        body: JSON.stringify({ 
            url: productUrl,
            targetPrice: targetPrice ? Number(targetPrice) : null
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // alert(`Tracked! ${data.name}`); // ปิด alert ถ้ารำคาญ
      setProductUrl('');
      setTargetPrice(''); // Reset ค่าราคา
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productUrl.trim()) {
      addProductMutation.mutate();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mb-10 relative group px-4">
      
      {/* 1. Effect แสงฟุ้งด้านหลัง */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl sm:rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

      {/* 2. ตัวฟอร์มหลัก */}
      <form 
        onSubmit={handleSubmit} 
        className="relative flex flex-col sm:flex-row items-center p-2 rounded-3xl sm:rounded-full bg-gray-900/80 backdrop-blur-xl border border-white/10 shadow-2xl transition-all ring-1 ring-white/10 focus-within:ring-blue-500/50 gap-2 sm:gap-0"
      >
        
        {/* --- ส่วนที่ 1: URL Input --- */}
        <div className="flex items-center w-full sm:flex-1 pl-2">
            <div className="text-gray-400 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
            </div>
            <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="Paste Shopee / Lazada link here..."
                className="bg-transparent text-white placeholder-gray-500 text-sm w-full py-3 focus:outline-none font-light tracking-wide"
                required
            />
        </div>

        {/* Divider (เส้นคั่นแนวตั้ง - โชว์เฉพาะ Desktop) */}
        <div className="hidden sm:block h-6 w-px bg-white/10 mx-2"></div>
        {/* Divider (เส้นคั่นแนวนอน - โชว์เฉพาะ Mobile) */}
        <div className="sm:hidden w-full h-px bg-white/10 my-1"></div>

        {/* --- ส่วนที่ 2: Target Price Input --- */}
        <div className="flex items-center w-full sm:w-auto sm:min-w-[140px] px-2">
             <span className="text-gray-400 text-xs mr-2 font-mono">THB</span>
             <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Target Price (Optional)"
                className="bg-transparent text-white placeholder-gray-500 text-sm w-full sm:w-32 py-3 focus:outline-none font-light tracking-wide text-right sm:text-left appearance-none"
             />
        </div>

        {/* --- ส่วนที่ 3: Submit Button --- */}
        <button
          type="submit"
          disabled={addProductMutation.isPending}
          className={`cursor-pointer w-full sm:w-auto flex-shrink-0 px-6 py-3 rounded-xl sm:rounded-full font-medium text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
            ${addProductMutation.isPending 
                ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 active:scale-95'
            }
          `}
        >
            {addProductMutation.isPending ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Tracking...</span>
                </>
            ) : (
                <>
                    <span className="hidden sm:inline">Track Price</span>
                    <span className="sm:hidden">Add</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </>
            )}
        </button>
      </form>
    </div>
  );
}