// src/components/AddProductForm.tsx
'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function AddProductForm() {
  const [productUrl, setProductUrl] = useState('');
  const queryClient = useQueryClient();

  const addProductMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      return response.json();
    },
    onSuccess: (data) => {
      alert(`Tracked! ${data.product.name}`);
      setProductUrl('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productUrl.trim()) {
      addProductMutation.mutate(productUrl);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10 relative group">
      
      {/* 1. Effect แสงฟุ้งด้านหลัง (Glow Effect) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

      {/* 2. ตัวฟอร์มหลัก (Glass Container) */}
      <form 
        onSubmit={handleSubmit} 
        className="relative flex items-center p-2 rounded-full bg-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl transition-all ring-1 ring-white/10 focus-within:ring-blue-500/50"
      >
        
        {/* Icon Link ด้านหน้า */}
        <div className="pl-4 pr-2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
        </div>

        {/* Input Field (Transparent) */}
        <input
          type="url"
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder="Paste Shopee / Lazada link here..."
          className="flex-grow bg-transparent text-white placeholder-gray-400 text-sm sm:text-base px-2 py-3 focus:outline-none w-full font-light tracking-wide"
          required
        />

        {/* ปุ่ม Submit (Gradient Button) */}
        <button
          type="submit"
          disabled={addProductMutation.isPending}
          className={`cursor-pointer flex-shrink-0 ml-2 px-6 py-3 rounded-full font-medium text-white shadow-lg transition-all duration-300 flex items-center gap-2
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