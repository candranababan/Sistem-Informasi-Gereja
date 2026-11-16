"use client";

import React from "react";
import Link from "next/link";
import { Church, ArrowRight, LayoutDashboard, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-1000">
      
      {/* KOTAK UTAMA (Gaya Kaca Transparan / Frosted Glass) */}
      <div className="w-full max-w-3xl bg-slate-950/60 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 md:p-14 text-center shadow-2xl space-y-8">
        
        {/* LOGO GEREJA */}
        <div className="flex justify-center">
          <div className="bg-indigo-600/20 p-5 rounded-3xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10 animate-bounce duration-[3s]">
            <img 
              src="/logo-gereja.png" 
              alt="Logo HKBP Jeriko" 
              className="w-16 h-16 object-cover rounded-xl"
              onError={(e) => {
                // Fallback jika gambar belum dipasang, agar tidak pecah saat demo
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* JUDUL SISTEM */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
            Sistem Informasi <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Manajemen Gereja
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 font-medium tracking-wide max-w-xl mx-auto italic">
            Selamat Datang di Portal Layanan Digital dan Administrasi <br className="hidden md:inline" /> 
            HKBP Jeriko Tangkerang - Resort Sukajadi
          </p>
        </div>

        {/* GARIS PEMBATAS DEKORATIF */}
        <div className="flex items-center justify-center gap-2">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/20" />
        </div>

        {/* TOMBOL NAVIGASI UTAMA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
          
          {/* JALUR JEMAAT (Langsung Masuk Dashboard Public) */}
          <Link href="/dashboard">
            <div className="bg-white/10 hover:bg-white/20 text-white p-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all border border-white/10 hover:border-white/20 group cursor-pointer shadow-lg active:scale-[0.98]">
              <LayoutDashboard size={24} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-wide">Portal Jemaat</p>
                <p className="text-[10px] text-slate-400 font-medium normal-case mt-0.5">Akses Informasi & Tata Ibadah</p>
              </div>
            </div>
          </Link>

          {/* JALUR ADMIN (Diarahkan ke Form Login) */}
          <Link href="/login">
            <div className="bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all border border-indigo-500/30 group cursor-pointer shadow-xl shadow-indigo-950/50 active:scale-[0.98]">
              <Church size={24} className="text-indigo-200 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <p className="text-sm font-black uppercase tracking-wide flex items-center justify-center gap-1">
                  Login Admin <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </p>
                <p className="text-[10px] text-indigo-200 font-medium normal-case mt-0.5">Khusus Pengurus & Sintua</p>
              </div>
            </div>
          </Link>

        </div>

        {/* FOOTER LANDING PAGE */}
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-4">
          © 2026 HKBP JERIKO TANGKERANG • ALL RIGHTS RESERVED
        </div>

      </div>
    </div>
  );
}