// src/lib/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { useState } from 'react';
// import { SessionProvider } from 'next-auth/react'; // ถ้าใช้ NextAuth

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 1000, // 5 วินาที
      },
    },
  }));

  return (
    // <SessionProvider> // ห่อด้วย SessionProvider ถ้าใช้ NextAuth
      <QueryClientProvider client={queryClient}>
        <ReactQueryStreamedHydration>
          {children}
        </ReactQueryStreamedHydration>
      </QueryClientProvider>
    // </SessionProvider>
  );
}