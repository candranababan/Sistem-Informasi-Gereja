"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, 
  Plus, Trash2, Calendar, Tag, Search, X, Church, Hammer
} from 'lucide-react';

interface Keuangan {
  id: number;
  keterangan: string;
  jumlah: number;
  kategori: 'Pemasukan' | 'Pengeluaran';
  jenis_kas: 'Huria' | 'Pembangunan';
  tanggal: string;
}

export default function KeuanganPage() {
  const [data, setData] = useState<Keuangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    keterangan: '', 
    jumlah: '', 
    kategori: 'Pemasukan' as 'Pemasukan' | 'Pengeluaran', 
    jenis_kas: 'Huria' as 'Huria' | 'Pembangunan',
    tanggal: new Date().toISOString().split('T')[0]
  });

  // --- 1. MEMUAT DATA KAS DARI SUPABASE ---
  const loadData = async () => {
    const { data: res, error } = await supabase
      .from('keuangan')
      .select('*')
      .order('tanggal', { ascending: false });
    
    if (!error && res) {
      setData(res as Keuangan[]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('keuangan')
        .select('*')
        .order('tanggal', { ascending: false });
      
      if (isMounted && !error && res) {
        setData(res as Keuangan[]);
        setLoading(false);
      }
    }
    initLoad();
    return () => { isMounted = false; };
  }, []);

  // --- 2. LOGIKA SUBMIT INPUT TRANSAKSI BARU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase.from('keuangan').insert([{
      keterangan: formData.keterangan,
      jumlah: Number(formData.jumlah),
      kategori: formData.kategori,
      jenis_kas: formData.jenis_kas,
      tanggal: formData.tanggal
    }]);

    if (!error) {
      setShowModal(false);
      setFormData({ 
        keterangan: '', 
        jumlah: '', 
        kategori: 'Pemasukan', 
        jenis_kas: 'Huria',
        tanggal: new Date().toISOString().split('T')[0] 
      });
      await loadData();

      // Toast Notifikasi Sukses Otomatis (Tanpa Perlu Klik OK)
      Swal.fire({
        icon: 'success',
        title: 'Transaksi Berhasil Dicatat',
        text: 'Buku kas keuangan gereja telah disinkronkan.',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: '#ffffff',
        customClass: {
          title: 'font-black uppercase text-sm tracking-wide text-slate-800'
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Transaksi',
        text: error.message,
        confirmButtonColor: '#4f46e5'
      });
    }
    setIsSaving(false);
  };

  // --- 3. LOGIKA HAPUS DATA KUSTOM (SWEETALERT2 MODAL) ---
  const confirmDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Riwayat Transaksi?',
      text: "Tindakan ini bersifat permanen dan akan memengaruhi neraca saldo kas gereja!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e', 
      cancelButtonColor: '#94a3b8',  
      confirmButtonText: 'YA, HAPUS PERMANEN',
      cancelButtonText: 'BATALAN',
      background: '#ffffff',
      customClass: {
        title: 'font-black uppercase text-base text-slate-800 tracking-tight',
        confirmButton: 'font-black rounded-xl text-xs px-4 py-3',
        cancelButton: 'font-black rounded-xl text-xs px-4 py-3'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('keuangan').delete().eq('id', id);
        if (!error) {
          await loadData();
          Swal.fire({
            icon: 'success',
            title: 'Transaksi Dihapus',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: error.message
          });
        }
      }
    });
  };

  // Akumulasi Total Keseluruhan Neraca Saldo
  const totalMasuk = data.filter(d => d.kategori === 'Pemasukan').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
  const totalKeluar = data.filter(d => d.kategori === 'Pengeluaran').reduce((a, b) => a + (Number(b.jumlah) || 0), 0);
  const saldoTotal = totalMasuk - totalKeluar;

  const filteredData = data.filter(d => 
    d.keterangan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* HEADER & TOTAL BALANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
           <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Total Saldo Kas Gabungan</p>
               <h2 className="text-4xl font-black tracking-tighter mb-8 text-white">
                 Rp {saldoTotal.toLocaleString('id-ID')}
               </h2>
             </div>
             <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
               <Wallet size={24} className="text-indigo-400" />
             </div>
           </div>
           
           <div className="flex gap-4 relative z-10">
             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Pemasukan</p>
                <p className="text-emerald-400 font-black text-base">Rp {totalMasuk.toLocaleString('id-ID')}</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Pengeluaran</p>
                <p className="text-rose-400 font-black text-base">Rp {totalKeluar.toLocaleString('id-ID')}</p>
             </div>
           </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
           <div>
             <h3 className="text-slate-800 font-black text-xl mb-1">Quick Action</h3>
             <p className="text-slate-400 text-xs font-medium italic">Catat kas Huria & Pembangunan secara terpisah</p>
           </div>
           <button 
             onClick={() => setShowModal(true)}
             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-sm mt-4"
           >
             <Plus size={18} /> Tambah Transaksi Kas
           </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Cari keterangan transaksi..."
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-800 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TRANSACTION TABLE */}
      <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Detail Transaksi</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Alokasi Kas</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Kategori</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Jumlah</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse font-black text-slate-300 uppercase text-xs tracking-widest">SINKRONISASI DATA...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center text-slate-400 italic font-medium">Belum ada riwayat transaksi kas.</td></tr>
              ) : filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="p-6">
                     <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.kategori === 'Pemasukan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                         {item.kategori === 'Pemasukan' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                       </div>
                       <div>
                         <p className="font-bold text-slate-800 leading-tight">{item.keterangan}</p>
                         <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-bold text-[10px] uppercase">
                           <Calendar size={12} />
                           {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </div>
                       </div>
                     </div>
                  </td>
                  <td className="p-6">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      item.jenis_kas === 'Huria' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {item.jenis_kas === 'Huria' ? <Church size={12}/> : <Hammer size={12}/>}
                      KAS {item.jenis_kas}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                      <Tag size={12} className="text-slate-300" />
                      {item.kategori}
                    </div>
                  </td>
                  <td className="p-6">
                    <p className={`font-black text-sm ${item.kategori === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.kategori === 'Pemasukan' ? '+' : '-'} Rp {item.jumlah.toLocaleString('id-ID')}
                    </p>
                  </td>
                  <td className="p-6 text-center">
                    <button 
                      onClick={() => confirmDelete(item.id)}
                      className="text-slate-300 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM INPUT */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800 tracking-wide uppercase italic">📝 Transaksi Kas Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SELECT ALOKASI KAS */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Alokasi Kas Dana</label>
                <select 
                  value={formData.jenis_kas}
                  onChange={e => setFormData({...formData, jenis_kas: e.target.value as 'Huria' | 'Pembangunan'})}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold text-xs uppercase"
                >
                  <option value="Huria">⛪ KAS HURIA</option>
                  <option value="Pembangunan">🏗️ KAS PEMBANGUNAN</option>
                </select>
              </div>

              {/* TOGGLE KATEGORI */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Kategori Aliran</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {(['Pemasukan', 'Pengeluaran'] as const).map((k) => (
                    <button 
                      type="button" key={k} 
                      onClick={() => setFormData({...formData, kategori: k})} 
                      className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                        formData.kategori === k ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Keterangan Transaksi</label>
                <input 
                  placeholder="Contoh: Pelean Minggu Ke-I" value={formData.keterangan}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm" 
                  onChange={e => setFormData({...formData, keterangan: e.target.value})} required 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Nominal Rupiah (Rp)</label>
                <input 
                  type="number" placeholder="0" value={formData.jumlah}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold text-sm" 
                  onChange={e => setFormData({...formData, jumlah: e.target.value})} required 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block">Tanggal Transaksi</label>
                <input 
                  type="date" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm" 
                  value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} required 
                />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black text-xs mt-4 transition-all shadow-lg active:scale-95 uppercase tracking-wider">
                {isSaving ? 'Sedang Memproses...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}