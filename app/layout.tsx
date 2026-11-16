"use client";

import "./globals.css"; 
import React from "react";
import Sidebar from "../components/Sidebar"; 
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Definisikan halaman luar (Landing Page dan Login Admin)
  const noSidebarPages = ["/", "/login"];
  const isNoSidebar = noSidebarPages.includes(pathname);

  return (
    <html lang="id">
      <body 
        className="h-screen w-screen text-slate-900 bg-cover bg-center bg-no-repeat bg-fixed overflow-hidden"
        style={{ backgroundImage: "url('/bg-gereja.jpg')" }}
      >
        {/* LAYER PENGATUR EFEK BACKGROUND:
          - Ditambahkan 'h-screen w-screen overflow-hidden' untuk mengunci pergerakan layar utama.
        */}
        <div 
          className={`h-screen w-screen flex overflow-hidden transition-all duration-500 ${
            isNoSidebar 
              ? "bg-slate-900/40 backdrop-blur-[1px]" 
              : "bg-white/80 backdrop-blur-[3px]"
          }`}
        >
          
          {/* Pembungkus Sidebar: flex-shrink-0 menjaga lebar sidebar agar tidak gepeng */}
          {!isNoSidebar && (
            <div className="w-72 h-screen flex-shrink-0 hidden md:block relative z-50">
              <Sidebar />
            </div>
          )} 
          
          {/* AREA KONTEN UTAMA:
            Ubah 'min-h-screen' menjadi 'h-screen overflow-y-auto'.
            Ini memaksa hanya area kanan ini saja yang boleh melakukan scroll ke bawah.
          */}
          <main 
            className={`flex-1 h-screen overflow-y-auto overflow-x-hidden transition-all duration-500 ease-in-out custom-scrollbar relative z-10 ${
              isNoSidebar ? "ml-0 p-0" : "p-4 md:p-8" 
            }`}
          >
            {/* Wrapper konten dalam */}
            <div className={isNoSidebar ? "" : "min-h-full rounded-3xl p-2 md:p-4"}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}