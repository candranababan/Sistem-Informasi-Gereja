"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Users, UsersRound, Landmark, Heart, Skull, 
  LogOut, BookOpen, LogIn 
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session);

      const adminPaths = ['/jemaat', '/keuangan', '/remaja', '/menikah', '/meninggal'];
      const isTryingToAccessAdmin = adminPaths.some(path => pathname.startsWith(path));
      
      if (!session && isTryingToAccessAdmin) {
        router.push('/dashboard');
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const guestMenu = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, href: '/dashboard' },
    { name: 'Tata Ibadah', icon: <BookOpen size={20} />, href: '/tata-ibadah' },
  ];

  const adminMenu = [
    { name: 'Data Jemaat', icon: <Users size={20} />, href: '/jemaat' },
    { name: 'Remaja & Naposo', icon: <UsersRound size={20} />, href: '/remaja' },
    { name: 'Kas & Keuangan', icon: <Landmark size={20} />, href: '/keuangan' },
    { name: 'Jemaat Menikah', icon: <Heart size={20} />, href: '/menikah' },
    { name: 'Jemaat Meninggal', icon: <Skull size={20} />, href: '/meninggal' },
  ];

  const menuToShow = isAdmin ? [...guestMenu, ...adminMenu] : guestMenu;

  // Pencegahan efek flickering saat memeriksa session status
  if (isAdmin === null) return <div className="w-72 min-h-screen bg-[#0f172a]" />;

  return (
    <aside className="w-72 h-screen bg-[#0f172a]/95 backdrop-blur-sm text-slate-300 flex flex-col p-6 fixed top-0 left-0 shadow-2xl border-r border-slate-800 z-50 overflow-hidden">
      
      {/* HEADER LOGO GEREJA (KONSISTEN DIAM / FLEX-SHRINK-0) */}
      <div className="mb-10 flex items-center gap-3 px-2 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-indigo-500/30 flex-shrink-0 bg-white flex items-center justify-center">
          <img 
            src="/logo-gereja.png" 
            alt="Logo HKBP Jeriko" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-sm font-black text-white leading-tight uppercase tracking-tighter">
            HKBP JERIKO
          </h1>
          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">
            {isAdmin ? '🛡️ Admin' : '👥 Public Access'}
          </p>
        </div>
      </div>

      {/* NAVIGASI MENU (SCROLLABLE SECARA MANDIRI JIKA ITEM BANYAK) */}
      <nav className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {menuToShow.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div className={`
                flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 group cursor-pointer
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'hover:bg-white/5 hover:text-white'}
              `}>
                <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold tracking-wide">{item.name}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-glow" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* SEKTOR BAWAH LOGOUT (KONSISTEN DIAM DI BAWAH VIEWPORT / FLEX-SHRINK-0) */}
      <div className="mt-auto pt-6 border-t border-slate-800 flex-shrink-0">
        {isAdmin ? (
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
            className="w-full flex items-center gap-3 p-3.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 rounded-2xl transition-all group"
          >
            <LogOut size={20} />
            <span className="text-sm font-black text-rose-500">Log Out Admin</span>
          </button>
        ) : (
          <Link href="/login" className="w-full flex items-center gap-3 p-3.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/5 rounded-2xl transition-all group">
            <LogIn size={20} />
            <span className="text-sm font-black text-indigo-400">Login Admin</span>
          </Link>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;