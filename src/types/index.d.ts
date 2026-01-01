// src/types/index.d.ts
export interface Product {
  id: string;
  userId?: string; // ถ้ามี Auth
  name: string;
  url: string;
  imageUrl?: string;
  currentPrice: number;
  originalPrice?: number; // ราคาตอนที่เพิ่มเข้ามาครั้งแรก
  lowestPrice?: number;
  highestPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceEntry {
  id: string;
  productId: string;
  price: number;
  timestamp: string;
}

export interface ScrapedProductInfo {
  name: string;
  price: number;
  imageUrl?: string;
}