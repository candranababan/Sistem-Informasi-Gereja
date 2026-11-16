"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { 
  UsersRound, Search, Plus, Trash2, 
  Sparkles, GraduationCap, MapPin, Hash, X, Phone
} from 'lucide-react';

interface Remaja {
  id: number;
  nama_lengkap: string;
  kategori: 'Remaja' | 'Naposo';
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  nomor_hp: string;
  wijk: number;
}

type KategoriType = 'Remaja' | 'Naposo';

export default function RemajaPage() {
  const [data, setData] = useState<Remaja[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<'Semua' | KategoriType>('Semua');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    kategori: 'Remaja' as KategoriType,
    tempat_lahir: '',
    tanggal_lahir: '',
    alamat: '',
    nomor_hp: '',
    wijk: ''
  });

  // --- FUNGSI HITUNG USIA OTOMATIS BERDASARKAN TANGGAL LAHIR ---
  const hitungUsia = (tanggalLahir: string): number => {
    if (!tanggalLahir) return 0;
    const lahir = new Date(tanggalLahir);
    const sekarang = new Date();
    let usia = sekarang.getFullYear() - lahir.getFullYear();
    const bulan = sekarang.getMonth() - lahir.getMonth();
    
    if (bulan < 0 || (bulan === 0 && sekarang.getDate() < lahir.getDate())) {
      usia--;
    }
    return usia < 0 ? 0 : usia;
  };

  // --- 1. DATA LOADER KONEKSI SUPABASE ---
  const loadData = async () => {
    const { data: res, error } = await supabase
      .from('remaja')
      .select('*')
      .order('nama_lengkap', { ascending: true });
    
    if (!error && res) {
      setData(res as Remaja[]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('remaja')
        .select('*')
        .order('nama_lengkap', { ascending: true });
      
      if (isMounted && !error && res) {
        setData(res as Remaja[]);
        setLoading(false);
      }
    }
    initLoad();
    return () => { isMounted = false; };
  }, []);

  // --- 2. LOGIKA SUBMIT DATA BARU ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase.from('remaja').insert([
      {
        nama_lengkap: formData.nama_lengkap,
        kategori: formData.kategori,
        tempat_lahir: formData.tempat_lahir,
        tanggal_lahir: formData.tanggal_lahir,
        alamat: formData.alamat,
        nomor_hp: formData.nomor_hp,
        wijk: parseInt(formData.wijk) || 0
      }
    ]);

    if (!error) {
      setShowModal(false);
      setFormData({ 
        nama_lengkap: '', kategori: 'Remaja', tempat_lahir: '', 
        tanggal_lahir: '', alamat: '', nomor_hp: '', wijk: '' 
      });
      await loadData();

      // Toast Notifikasi Sukses Otomatis
      Swal.fire({
        icon: 'success',
        title: 'Data Berhasil Ditambahkan',
        text: 'Basis data pemuda kategorial telah diperbarui.',
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
        confirmButtonColor: '#7c3aed'
      });
    }
    setIsSaving(false);
  };

  // --- 3. LOGIKA HAPUS DATA KUSTOM (SWEETALERT2 MODAL) ---
  const confirmDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Data Anggota?',
      text: "Tindakan ini bersifat permanen dan berkas keanggotaan tidak dapat dikembalikan!",
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
        const { error } = await supabase.from('remaja').delete().eq('id', id);
        if (!error) {
          await loadData();
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Dihapus',
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

  // --- 4. MULTI-FILTER BAR LOGIC ---
  const dataFiltered = data.filter(item => {
    const matchesSearch = item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterKategori === 'Semua' || item.kategori === filterKategori;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-700">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-violet-600 p-2 rounded-2xl text-white shadow-xl shadow-violet-200">
              <UsersRound size={28} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Generasi Muda</h1>
          </div>
          <p className="text-slate-500 font-medium italic">Database Remaja & Naposo Bulung HKBP Jeriko</p>
        </div>
        
        {/* Filter Switcher Button */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex-shrink-0">
          {(['Semua', 'Remaja', 'Naposo'] as const).map((kat) => (
            <button
              key={kat}
              onClick={() => setFilterKategori(kat)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                filterKategori === kat 
                ? 'bg-violet-600 text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {kat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH PANEL & TRIGGER BUTTON */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama pemuda atau pemudi..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-violet-500/5 focus:border-violet-500 transition-all font-bold text-slate-800 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 hover:bg-black text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 text-sm py-4"
        >
          <Plus size={18} />
          <span>Tambah Anggota</span>
        </button>
      </div>

      {/* DATA CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase tracking-widest text-xs animate-pulse">
            Syncing Database Kategorial...
          </div>
        ) : dataFiltered.length === 0 ? (
          <div className="col-span-full bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-slate-200">
            <GraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Tidak ada data kategorial ditemukan</p>
          </div>
        ) : dataFiltered.map((item) => (
          <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${
                  item.kategori === 'Remaja' ? 'bg-violet-50 text-violet-600' : 'bg-fuchsia-50 text-fuchsia-600'
                }`}>
                  {item.nama_lengkap.charAt(0).toUpperCase()}
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                  item.kategori === 'Remaja' 
                  ? 'bg-violet-50 text-violet-600 border-violet-100' 
                  : 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100'
                }`}>
                  {item.kategori}
                </span>
              </div>

              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide mb-4 leading-tight">{item.nama_lengkap}</h3>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-slate-600">
                  <Hash size={14} className="text-slate-300 flex-shrink-0"/>
                  <span className="text-xs font-bold text-slate-700">{hitungUsia(item.tanggal_lahir)} Tahun • <span className="text-indigo-600">Wijk {item.wijk}</span></span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone size={14} className="text-slate-300 flex-shrink-0"/>
                  <span className="text-xs font-bold text-slate-600">{item.nomor_hp}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <MapPin size={14} className="text-slate-300 flex-shrink-0"/>
                  <span className="text-xs font-medium text-slate-400 truncate max-w-[220px]">{item.alamat}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Kategorial Aktif</span>
              </div>
              <button 
                onClick={() => confirmDelete(item.id)}
                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* OPERASIONAL MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-wide italic">✨ Registrasi Anggota Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 custom-scrollbar pb-2 text-sm">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nama Lengkap</label>
                <input className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-violet-500 text-slate-800 font-semibold" onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Kategori</label>
                  <select 
                    className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-violet-500 text-slate-800 font-bold" 
                    value={formData.kategori}
                    onChange={e => setFormData({...formData, kategori: e.target.value as KategoriType})} 
                    required
                  >
                    <option value="Remaja">Remaja</option>
                    <option value="Naposo">Naposo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Wijk Sektoral</label>
                  <select 
                    className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-violet-500 text-slate-800 font-bold"
                    value={formData.wijk}
                    onChange={e => setFormData({...formData, wijk: e.target.value})}
                    required
                  >
                    <option value="">PILIH</option>
                    <option value="1">Wijk 1</option>
                    <option value="2">Wijk 2</option>
                    <option value="3">Wijk 3</option>
                    <option value="4">Wijk 4</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 block">Tempat & Tanggal Lahir</label>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Tempat Lahir" className="w-full p-3 bg-white rounded-lg outline-none border text-slate-800 font-semibold" value={formData.tempat_lahir} onChange={e => setFormData({...formData, tempat_lahir: e.target.value})} required />
                  <input type="date" className="w-full p-3 bg-white rounded-lg outline-none border text-slate-800 font-semibold text-xs" value={formData.tanggal_lahir} onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})} required />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Nomor HP / WhatsApp</label>
                <input className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-violet-500 text-slate-800 font-semibold" value={formData.nomor_hp} onChange={e => setFormData({...formData, nomor_hp: e.target.value})} required />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Alamat Rumah</label>
                <textarea className="w-full p-3.5 bg-slate-50 rounded-xl outline-none border focus:border-violet-500 text-slate-800 font-semibold" rows={2} value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} required />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white p-4.5 rounded-xl font-black mt-2 transition-all active:scale-95 shadow-lg uppercase text-xs tracking-wider">
                {isSaving ? 'Sedang Memproses...' : 'Simpan Data Anggota'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}