"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { Heart, Plus, Trash2, Calendar, User, X, MapPin } from 'lucide-react';

interface Menikah {
  id: number;
  nama_pria: string;
  tempat_lahir_pria: string;
  tanggal_lahir_pria: string;
  nama_wanita: string;
  tempat_lahir_wanita: string;
  tanggal_lahir_wanita: string;
  tanggal_pernikahan: string;
  pendeta_pemberkat: string;
}

export default function MenikahPage() {
  const [data, setData] = useState<Menikah[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nama_pria: '',
    tempat_lahir_pria: '',
    tanggal_lahir_pria: '',
    nama_wanita: '',
    tempat_lahir_wanita: '',
    tanggal_lahir_wanita: '',
    tanggal_pernikahan: '',
    pendeta_pemberkat: ''
  });

  // --- 1. MEMUAT DATA PERNIKAHAN ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('jemaat_menikah')
        .select('*')
        .order('tanggal_pernikahan', { ascending: false });
      
      if (!error && res) {
        setData(res as Menikah[]);
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
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // --- 2. LOGIKA SUBMIT TAMBAH DATA (SWEETALERT2 TOAST) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase.from('jemaat_menikah').insert([formData]);
    
    if (!error) {
      setShowModal(false);
      setFormData({ 
        nama_pria: '', tempat_lahir_pria: '', tanggal_lahir_pria: '',
        nama_wanita: '', tempat_lahir_wanita: '', tanggal_lahir_wanita: '',
        tanggal_pernikahan: '', pendeta_pemberkat: '' 
      });
      await loadData();

      // Toast Sukses Otomatis Tanpa Perlu Klik OK
      Swal.fire({
        icon: 'success',
        title: 'Dokumentasi Nikah Berhasil',
        text: 'Data sakramen pernikahan kudus telah diarsipkan.',
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
        confirmButtonColor: '#db2777'
      });
    }
    setIsSaving(false);
  };

  // --- 3. LOGIKA HAPUS DATA (SWEETALERT2 MODAL) ---
  const confirmDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Berkas Pernikahan?',
      text: "Tindakan ini bersifat permanen dan berkas sakramen tidak dapat dikembalikan!",
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
        const { error } = await supabase.from('jemaat_menikah').delete().eq('id', id);
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Pernikahan Kudus</h1>
          <p className="text-slate-500 font-medium italic">Dokumentasi sakramen pernikahan HKBP Jeriko</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 text-sm"
        >
          <Plus size={18} />
          <span>Tambah Data</span>
        </button>
      </div>

      {/* GRID DATA DOKUMENTASI CARD */}
      {loading ? (
        <div className="py-24 text-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">
          Syncing Database Sakramen Pernikahan...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
           <Heart size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Belum ada data pernikahan kudus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((item) => (
            <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-pink-50 rounded-full opacity-40 group-hover:scale-110 transition-transform" />
              
              <div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center">
                    <Heart size={22} fill="currentColor" />
                  </div>
                  <button 
                    onClick={() => confirmDelete(item.id)}
                    className="text-slate-200 hover:text-rose-600 p-2 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="relative z-10 space-y-1">
                  <h3 className="text-lg font-black text-slate-800 leading-tight uppercase tracking-wide">{item.nama_pria}</h3>
                  <p className="text-pink-600 font-black text-xs uppercase tracking-wider">& {item.nama_wanita}</p>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-slate-50 pt-5 mt-6 relative z-10 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-pink-400 flex-shrink-0" />
                  <span>Pemberkatan: {new Date(item.tanggal_pernikahan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User size={14} className="text-slate-300 flex-shrink-0" />
                  <span className="truncate text-slate-700">Pelayan: Pdt. {item.pendeta_pemberkat || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OPERASIONAL MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide italic">📜 Formulir Pernikahan Kudus</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 custom-scrollbar pb-2 text-sm">
              
              {/* Sektor Mempelai Pria */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">Data Mempelai Pria (Manoom)</label>
                <input placeholder="Nama Lengkap Mempelai Pria" className="w-full p-3.5 bg-white rounded-xl outline-none border font-semibold text-slate-800" value={formData.nama_pria} onChange={e => setFormData({...formData, nama_pria: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Tempat Lahir" className="w-full p-3 bg-white rounded-xl outline-none border font-semibold text-slate-700 text-xs" value={formData.tempat_lahir_pria} onChange={e => setFormData({...formData, tempat_lahir_pria: e.target.value})} required />
                  <input type="date" className="w-full p-3 bg-white rounded-xl outline-none border font-semibold text-slate-600 text-xs" value={formData.tanggal_lahir_pria} onChange={e => setFormData({...formData, tanggal_lahir_pria: e.target.value})} required />
                </div>
              </div>

              {/* Sektor Mempelai Wanita */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">Data Mempelai Wanita (Borua)</label>
                <input placeholder="Nama Lengkap Mempelai Wanita" className="w-full p-3.5 bg-white rounded-xl outline-none border font-semibold text-slate-800" value={formData.nama_wanita} onChange={e => setFormData({...formData, nama_wanita: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Tempat Lahir" className="w-full p-3 bg-white rounded-xl outline-none border font-semibold text-slate-700 text-xs" value={formData.tempat_lahir_wanita} onChange={e => setFormData({...formData, tempat_lahir_wanita: e.target.value})} required />
                  <input type="date" className="w-full p-3 bg-white rounded-xl outline-none border font-semibold text-slate-600 text-xs" value={formData.tanggal_lahir_wanita} onChange={e => setFormData({...formData, tanggal_lahir_wanita: e.target.value})} required />
                </div>
              </div>

              {/* Detail Pelaksanaan & Pendeta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tanggal Pemberkatan</label>
                  <input type="date" className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border font-semibold text-slate-700 text-xs" value={formData.tanggal_pernikahan} onChange={e => setFormData({...formData, tanggal_pernikahan: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Pendeta Pemberkat</label>
                  <input placeholder="Nama Pdt. Pemberkat" className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border font-bold text-slate-800 text-xs" value={formData.pendeta_pemberkat} onChange={e => setFormData({...formData, pendeta_pemberkat: e.target.value})} required />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black text-xs mt-3 transition-all shadow-xl active:scale-95 uppercase tracking-wider">
                {isSaving ? 'Sedang Memproses...' : 'Simpan Arsip Pernikahan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}