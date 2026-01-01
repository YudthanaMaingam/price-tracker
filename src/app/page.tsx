// src/app/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { AddProductForm } from '@/components/AddProductForm';
import { ProductCard } from '@/components/ProductCard' // สร้างเอง
import { Product } from '@/types';

async function getProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  return response.json();
}

export default function Home() {
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  if (isLoading) return <div className="text-center p-8">Loading products...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-25 text-center"></h1>

      <AddProductForm />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
        {products && products.length > 0 ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} /> // ต้องสร้าง ProductCard.tsx เอง
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">No products tracked yet. Add one!</p>
        )}
      </div>
    </div>
  );
}