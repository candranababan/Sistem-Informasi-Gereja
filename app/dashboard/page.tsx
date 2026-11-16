"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, UsersRound, Heart, Skull, 
  TrendingUp, Calendar, ArrowUpCircle, ArrowDownCircle, Church, Hammer, ArrowRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// --- DEFINISI TIPE ---
interface DashboardStats {
  totalJemaat: number;
  totalRemaja: number;
  totalNaposo: number;
  
  // Kas Huria
  saldoHuria: number;
  masukHuria: number;
  keluarHuria: number;

  // Kas Pembangunan
  saldoPembangunan: number;
  masukPembangunan: number;
  keluarPembangunan: number;

  nikahTahunIni: number;
  meninggalTahunIni: number;
}

interface Keuangan {
  tanggal: string;
  jumlah: number;
  kategori: 'Pemasukan' | 'Pengeluaran';
  jenis_kas: 'Huria' | 'Pembangunan';
}

interface ChartGroup {
  name: string;
  masukHuria: number;
  masukPembangunan: number;
}

// Warna Diagram Rasio Gabungan
const COLORS = ['#06b6d4', '#f59e0b'];

export default function DashboardPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalJemaat: 0, totalRemaja: 0, totalNaposo: 0,
    saldoHuria: 0, masukHuria: 0, keluarHuria: 0,
    saldoPembangunan: 0, masukPembangunan: 0, keluarPembangunan: 0,
    nikahTahunIni: 0, meninggalTahunIni: 0
  });

  const [allKeuangan, setAllKeuangan] = useState<Keuangan[]>([]);

  // --- STATE FILTER TANGGAL KUSTOM ---
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // --- PROSES HITUNG CHART DATA MENGGUNAKAN useMemo ---
  const chartData = useMemo(() => {
    const groups: { [key: string]: ChartGroup } = {};
    
    const filtered = allKeuangan.filter(item => {
      return item.tanggal >= startDate && item.tanggal <= endDate;
    });

    filtered.forEach(item => {
      const date = new Date(item.tanggal);
      const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      if (!groups[label]) groups[label] = { name: label, masukHuria: 0, masukPembangunan: 0 };
      
      if (item.kategori === 'Pemasukan') {
        if (item.jenis_kas === 'Pembangunan') {
          groups[label].masukPembangunan += Number(item.jumlah);
        } else {
          groups[label].masukHuria += Number(item.jumlah);
        }
      }
    });

    return Object.values(groups);
  }, [allKeuangan, startDate, endDate]);

  // --- LOAD INITIAL DATA UTAMA DARI SUPABASE ---
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const tahunIni = new Date().getFullYear();
        const awalTahun = `${tahunIni}-01-01`;

        const [j, r, k, n, w] = await Promise.all([
          supabase.from('jemaat').select('*', { count: 'exact', head: true }),
          supabase.from('remaja').select('kategori'),
          supabase.from('keuangan').select('jumlah, kategori, jenis_kas, tanggal').order('tanggal', { ascending: true }),
          supabase.from('jemaat_menikah').select('*', { count: 'exact', head: true }).gte('tanggal_pernikahan', awalTahun),
          supabase.from('jemaat_meninggal').select('*', { count: 'exact', head: true }).gte('tanggal_meninggal', awalTahun)
        ]);

        if (isMounted) {
          const rCount = r.data?.filter(x => x.kategori === 'Remaja').length || 0;
          const nCount = r.data?.filter(x => x.kategori === 'Naposo').length || 0;
          const dataKeuangan = (k.data || []) as Keuangan[];
          setAllKeuangan(dataKeuangan);

          // Akumulasi Neraca Saldo Finansial Utama
          const mHuria = dataKeuangan.filter(t => t.jenis_kas === 'Huria' && t.kategori === 'Pemasukan').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
          const kHuria = dataKeuangan.filter(t => t.jenis_kas === 'Huria' && t.kategori === 'Pengeluaran').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
          const mPembang = dataKeuangan.filter(t => t.jenis_kas === 'Pembangunan' && t.kategori === 'Pemasukan').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
          const kPembang = dataKeuangan.filter(t => t.jenis_kas === 'Pembangunan' && t.kategori === 'Pengeluaran').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);

          setStats({
            totalJemaat: j.count || 0,
            totalRemaja: rCount,
            totalNaposo: nCount,
            masukHuria: mHuria,
            keluarHuria: kHuria,
            saldoHuria: mHuria - kHuria,
            masukPembangunan: mPembang,
            keluarPembangunan: kPembang,
            saldoPembangunan: mPembang - kPembang,
            nikahTahunIni: n.count || 0,
            meninggalTahunIni: w.count || 0
          });
          
          setTimeout(() => {
            if(isMounted) setHasMounted(true);
          }, 0);
        }
      } catch (err) {
        console.error("Gagal memuat dashboard:", err);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase text-xs tracking-widest">Syncing Dashboard Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* HEADER DASHBOARD WITH DATE RANGE FILTER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
          <p className="text-slate-500 font-medium italic">Gereja Jeriko Tangkerang Management</p>
        </div>

        {/* CONTROLLER RENTANG TANGGAL KUSTOM */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar size={16} className="text-indigo-500" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border text-xs font-bold text-slate-700 p-2 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            />
          </div>
          <ArrowRight size={14} className="text-slate-400 hidden sm:block" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border text-xs font-bold text-slate-700 p-2 rounded-xl outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* HERO SECTION KEUANGAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DETAIL DUA KAS INDEPENDEN */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* CARD KAS HURIA */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-6 text-white shadow-xl flex flex-col justify-between border border-white/5">
            <div>
              <div className="flex items-center gap-1.5 text-cyan-400 font-black uppercase tracking-widest text-[9px]">
                <Church size={14}/> Saldo Kas Huria
              </div>
              <h2 className="text-2xl md:text-3xl font-black mt-2 italic tracking-tight">
                Rp {stats.saldoHuria.toLocaleString('id-ID')}
              </h2>
            </div>
            <div className="mt-6 flex justify-between border-t border-white/10 pt-3 text-[10px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1"><ArrowUpCircle size={14} className="text-cyan-400"/> Masuk: Rp {stats.masukHuria.toLocaleString('id-ID')}</span>
              <span className="flex items-center gap-1"><ArrowDownCircle size={14} className="text-rose-400"/> Keluar: Rp {stats.keluarHuria.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* CARD KAS PEMBANGUNAN */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-amber-950 rounded-[2rem] p-6 text-white shadow-xl flex flex-col justify-between border border-white/5">
            <div>
              <div className="flex items-center gap-1.5 text-amber-500 font-black uppercase tracking-widest text-[9px]">
                <Hammer size={14}/> Saldo Kas Pembangunan
              </div>
              <h2 className="text-2xl md:text-3xl font-black mt-2 italic tracking-tight">
                Rp {stats.saldoPembangunan.toLocaleString('id-ID')}
              </h2>
            </div>
            <div className="mt-6 flex justify-between border-t border-white/10 pt-3 text-[10px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1"><ArrowUpCircle size={14} className="text-amber-400"/> Masuk: Rp {stats.masukPembangunan.toLocaleString('id-ID')}</span>
              <span className="flex items-center gap-1"><ArrowDownCircle size={14} className="text-rose-400"/> Keluar: Rp {stats.keluarPembangunan.toLocaleString('id-ID')}</span>
            </div>
          </div>

        </div>

        {/* RASIO PERBANDINGAN SALDO BERJALAN */}
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Rasio Alokasi Saldo</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[ {name: 'Kas Huria', value: stats.saldoHuria}, {name: 'Kas Pembangunan', value: stats.saldoPembangunan} ]}
                    innerRadius={50} outerRadius={68} paddingAngle={5} dataKey="value"
                  >
                    {COLORS.map((col, i) => <Cell key={`pie-cell-${i}`} fill={col} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={(value) => value ? [`Rp ${Number(value).toLocaleString('id-ID')}`] : ['Rp 0']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 text-[9px] font-black mt-2">
              <span className="text-cyan-500 uppercase tracking-tighter">● Kas Huria</span>
              <span className="text-amber-500 uppercase tracking-tighter">● Pembangunan</span>
            </div>
        </div>
      </div>

      {/* MINI STATS DATA GEREJA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Jemaat" value={stats.totalJemaat} icon={<Users size={20}/>} color="bg-indigo-50 text-indigo-600" />
        <StatCard title="Remaja & Naposo" value={stats.totalRemaja + stats.totalNaposo} icon={<UsersRound size={20}/>} color="bg-violet-50 text-violet-600" />
        <StatCard title="Pernikahan" value={stats.nikahTahunIni} icon={<Heart size={20}/>} color="bg-pink-50 text-pink-600" />
        <StatCard title="Kedukaan" value={stats.meninggalTahunIni} icon={<Skull size={20}/>} color="bg-slate-100 text-slate-600" />
      </div>

      {/* STRUKTUR GRAFIK LINE CHART KOMPARATIF DUA KAS */}
      <div className="bg-white/90 backdrop-blur-sm p-6 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" /> Grafik Pemasukan Dua Kas
          </h3>
          <p className="text-[10px] text-slate-400 font-bold bg-slate-100 px-3 py-1 rounded-md uppercase tracking-wider">
            Periode Pas: {new Date(startDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} s/d {new Date(endDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
          </p>
        </div>
        
        <div className="h-[350px] w-full text-xs font-bold pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
              
              {/* FIX UTAMA: Menambahkan parameter width={120} agar string nominal rupiah ratusan juta tidak ter-wrap ke bawah */}
              <YAxis 
                stroke="#94a3b8" 
                tickLine={false} 
                axisLine={false} 
                width={120} 
                tickFormatter={(v) => v === 0 ? 'Rp 0' : `Rp ${v.toLocaleString('id-ID')}`} 
              />
              
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                formatter={(value) => value ? [`Rp ${Number(value).toLocaleString('id-ID')}`] : ['Rp 0']}
                itemStyle={{ fontWeight: 900, fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" className="text-xs uppercase" />
              
              {/* FIX KEDUA: Mengubah kurva dari 'monotone' menjadi 'linear' agar patahan fluktuasi naik turun data tampak lebih tegas dan tajam */}
              {/* LINE 1: Aliran Masuk Kas Huria (Cyan) */}
              <Line type="linear" dataKey="masukHuria" name="Pemasukan Kas Huria" stroke="#06b6d4" strokeWidth={4} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
              
              {/* LINE 2: Aliran Masuk Kas Pembangunan (Amber) */}
              <Line type="linear" dataKey="masukPembangunan" name="Pemasukan Kas Pembangunan" stroke="#f59e0b" strokeWidth={4} dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-lg transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
      <p className="text-2xl font-black text-slate-900 mt-1">
        {value} <span className="text-[10px] text-slate-400 font-bold uppercase">Jiwa</span>
      </p>
    </div>
  );
}