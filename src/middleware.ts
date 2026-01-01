// src/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function middleware(request: NextRequest) {
  // เรียกใช้ฟังก์ชันที่เราเขียนเมื่อกี้
  return await updateSession(request)
}

// Config นี้บอกว่า Middleware จะทำงานกับ Route ไหนบ้าง
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - เราอาจจะอยาก protect API ด้วย แต่มักจะเช็คใน code API แยกต่างหาก)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}