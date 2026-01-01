// src/components/Navbar.tsx
'use client'; // 👈 ต้องมี เพราะเราจะใช้ useState และ onClick

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // 1. เช็คว่ามี User ล็อกอินอยู่ไหมตอนโหลดหน้าเว็บ
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // ฟังเหตุการณ์ Login/Logout เพื่อเปลี่ยนปุ่มทันทีไม่ต้อง Refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_OUT') {
            router.refresh(); // รีเฟรชหน้าเพื่อเคลียร์ข้อมูล
        }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  // 2. ฟังก์ชัน Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login'); // เด้งไปหน้า Login
    router.refresh();      // รีเฟรชให้ข้อมูลหายไป
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between px-6 py-3 rounded-full bg-gray-900/60 backdrop-blur-md border border-white/5 shadow-lg ring-1 ring-white/5 transition-all">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
              P
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors">
              Price<span className="text-blue-400">Tracker</span>
            </span>
          </Link>

          {/* User Profile / Action */}
          <div className="flex items-center gap-4">
             {user ? (
                // --- กรณีล็อกอินแล้ว แสดง Email + ปุ่ม Logout ---
                <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs text-gray-400">
                        {user.email}
                    </span>
                    <button 
                        onClick={handleLogout}
                        className="cursor-pointer px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20 hover:bg-red-600 hover:text-white hover:border-transparent transition-all"
                    >
                        Logout
                    </button>
                </div>
             ) : (
                // --- กรณีจายังไม่ล็อกอิน แสดงปุ่ม Sign In ---
                <div className="flex items-center gap-3">
                    <Link 
                        href="/login"
                        className="px-4 py-1.5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-semibold border border-blue-500/30 hover:bg-blue-600 hover:text-white hover:border-transparent transition-all"
                    >
                        Sign In
                    </Link>
                </div>
             )}
          </div>

        </nav>
      </div>
    </header>
  );
}