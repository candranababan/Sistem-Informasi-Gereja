"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Skull, Plus, Trash2, MapPin, X, Search, Calendar, Hash } from 'lucide-react';

interface Meninggal {
  id: number;
  nama_jemaat: string;
  tanggal_lahir: string;
  tanggal_meninggal: string;
  usia: number;
  alamat_duka: string;
  wijk: number;
}

export default function MeninggalPage() {
  const [data, setData] = useState<Meninggal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({ 
    nama_jemaat: '', 
    tanggal_lahir: '',
    tanggal_meninggal: new Date().toISOString().split('T')[0], 
    alamat_duka: '',
    wijk: ''
  });

  // --- FUNGSI HITUNG USIA PAS SAAT MENINGGAL (OTOMATIS) ---
  const hitungUsiaWafat = (tglLahir: string, tglWafat: string): number => {
    if (!tglLahir || !tglWafat) return 0;
    const lahir = new Date(tglLahir);
    const wafat = new Date(tglWafat);
    
    let usia = wafat.getFullYear() - lahir.getFullYear();
    const bulan = wafat.getMonth() - lahir.getMonth();
    
    if (bulan < 0 || (bulan === 0 && wafat.getDate() < lahir.getDate())) {
      usia--;
    }
    return usia < 0 ? 0 : usia;
  };

  // --- 1. MEMUAT DATA MEMORIAL DARI SUPABASE ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('jemaat_meninggal')
        .select('*')
        .order('tanggal_meninggal', { ascending: false });
      
      if (!error && res) {
        setData(res as Meninggal[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadData();
    }
    return () => { isMounted = false; };
  }, [loadData]);

  // --- 2. LOGIKA SUBMIT TAMBAH DATA (SWEETALERT2 TOAST) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Hitung usia otomatis tepat pada hari wafat untuk disimpan ke database (int4)
    const usiaKalkulasi = hitungUsiaWafat(formData.tanggal_lahir, formData.tanggal_meninggal);
    
    const { error } = await supabase.from('jemaat_meninggal').insert([
      {
        nama_jemaat: formData.nama_jemaat,
        tanggal_lahir: formData.tanggal_lahir,
        tanggal_meninggal: formData.tanggal_meninggal,
        usia: usiaKalkulasi,
        alamat_duka: formData.alamat_duka,
        wijk: parseInt(formData.wijk) || 0
      }
    ]);

    if (!error) {
      setShowModal(false);
      setFormData({ 
        nama_jemaat: '', 
        tanggal_lahir: '',
        tanggal_meninggal: new Date().toISOString().split('T')[0], 
        alamat_duka: '',
        wijk: ''
      });
      await loadData();

      // Toast Sukses Otomatis Tanpa Perlu Klik OK
      Swal.fire({
        icon: 'success',
        title: 'Data Memorial Disimpan',
        text: 'Arsip kedukaan jemaat telah diperbarui.',
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
        title: 'Gagal Menyimpan Data',
        text: error.message,
        confirmButtonColor: '#0f172a'
      });
    }
    setIsSaving(false);
  };

  // --- 3. LOGIKA HAPUS DATA KUSTOM (SWEETALERT2 MODAL) ---
  const confirmDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Data Memorial?',
      text: "Tindakan ini bersifat permanen dan berkas laporan wafat tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48', // Rose 600
      cancelButtonColor: '#94a3b8',  // Slate 400
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
        const { error } = await supabase.from('jemaat_meninggal').delete().eq('id', id);
        if (!error) {
          await loadData();
          Swal.fire({
            icon: 'success',
            title: 'Arsip Berhasil Dihapus',
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

  const filteredData = data.filter(item => 
    item.nama_jemaat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Jemaat Meninggal Dunia</h1>
          <p className="text-slate-500 font-medium italic">Mengenang jemaat yang telah berpulang ke Rumah Bapa</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 text-sm"
        >
          <Plus size={18} />
          <span>Tambah Data</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-600 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama jemaat mendiang..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-bold text-slate-800 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* DATA LIST MEMORIAL CARD */}
      {loading ? (
        <div className="py-24 text-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">
          Syncing Database Laporan Kedukaan...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
           <Skull size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Belum ada arsip laporan kedukaan jemaat</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-all duration-300">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 flex-shrink-0">
                  <Skull size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-wide leading-tight">{item.nama_jemaat}</h3>
                  <div className="flex gap-3 mt-1.5 text-slate-400 font-black text-[9px] uppercase tracking-wider">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 flex items-center gap-1"><Hash size={10}/> Tutup Usia: {item.usia} Tahun</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-indigo-600">Wijk {item.wijk}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-slate-400 font-bold text-[10px] uppercase">
                    <Calendar size={12} className="text-rose-400" />
                    <span>Wafat: {new Date(item.tanggal_meninggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-slate-500 text-xs font-medium">
                    <MapPin size={13} className="text-slate-300 flex-shrink-0" />
                    <span className="truncate max-w-[260px] text-slate-400">{item.alamat_duka}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => confirmDelete(item.id)} 
                className="text-slate-200 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all flex-shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* OPERASIONAL MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide italic">🪦 Registrasi Laporan Wafat</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 custom-scrollbar pb-2 text-sm">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nama Lengkap Jemaat</label>
                <input className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-slate-900 text-slate-800 font-semibold" onChange={e => setFormData({...formData, nama_jemaat: e.target.value})} required />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Wijk Sektoral Domisili</label>
                <select 
                  className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-slate-900 text-slate-800 font-bold"
                  value={formData.wijk}
                  onChange={e => setFormData({...formData, wijk: e.target.value})}
                  required
                >
                  <option value="">PILIH WILAYAH</option>
                  <option value="1">Wijk 1</option>
                  <option value="2">Wijk 2</option>
                  <option value="3">Wijk 3</option>
                  <option value="4">Wijk 4</option>
                </select>
              </div>

              {/* Blok Penyesuaian Tanggal Lahir & Wafat */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tanggal Lahir Mendiang</label>
                  <input type="date" className="w-full p-3 bg-white rounded-lg outline-none border font-semibold text-slate-700 text-xs" value={formData.tanggal_lahir} onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tanggal Meninggal Dunia</label>
                  <input type="date" className="w-full p-3 bg-white rounded-lg outline-none border font-semibold text-slate-700 text-xs" value={formData.tanggal_meninggal} onChange={e => setFormData({...formData, tanggal_meninggal: e.target.value})} required />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Alamat Duka / Rumah Duka</label>
                <textarea className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-slate-900 text-slate-800 font-semibold" rows={2} value={formData.alamat_duka} onChange={e => setFormData({...formData, alamat_duka: e.target.value})} required />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white p-4.5 rounded-xl font-black mt-2 transition-all shadow-lg active:scale-95 uppercase text-xs tracking-wider">
                {isSaving ? 'Sedang Memproses...' : 'Simpan Arsip Memorial'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}