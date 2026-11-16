"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { 
  Search, Plus, Trash2, Edit3,
  MapPin, Phone, X, Users, Baby, Save, Lock, Filter
} from 'lucide-react';

// --- DEFINISI TIPE ---
interface Anak {
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
}

interface Jemaat {
  id: number;
  kepala_keluarga: string;
  tempat_lahir_ayah: string;
  tanggal_lahir_ayah: string;
  nama_ibu: string;
  tempat_lahir_ibu: string;
  tanggal_lahir_ibu: string;
  anak: Anak[];
  alamat: string;
  no_hp: string;
  wijk: number;
}

export default function JemaatPage() {
  const router = useRouter();
  const [data, setData] = useState<Jemaat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWijk, setFilterWijk] = useState<string>('all'); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // State Keamanan Otorisasi
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    kepala_keluarga: '',
    tempat_lahir_ayah: '',
    tanggal_lahir_ayah: '',
    nama_ibu: '',
    tempat_lahir_ibu: '',
    tanggal_lahir_ibu: '',
    wijk: '',
    no_hp: '',
    alamat: ''
  });

  const [listAnak, setListAnak] = useState<Anak[]>([{ nama: '', tempat_lahir: '', tanggal_lahir: '' }]);

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

  // --- 1. AMBIL DATA DARI SUPABASE ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('jemaat')
        .select('*')
        .order('kepala_keluarga', { ascending: true });
      
      if (!error && res) {
        setData(res as Jemaat[]);
      }
    } catch (err) {
      console.error("Gagal load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 2. PROTEKSI AUTHENTICATION ---
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAdmin(false);
        router.push('/dashboard');
      } else {
        setIsAdmin(true);
        await loadData();
      }
    };
    checkAuth();
  }, [router, loadData]);

  // --- 3. LOGIKA FORM DINAMIS ANAK ---
  const handleAnakChange = (index: number, field: keyof Anak, value: string) => {
    const updatedAnak = [...listAnak];
    updatedAnak[index][field] = value;
    setListAnak(updatedAnak);
  };

  const handleTambahAnak = () => {
    if (listAnak.length < 8) {
      setListAnak([...listAnak, { nama: '', tempat_lahir: '', tanggal_lahir: '' }]);
    }
  };

  const handleHapusAnak = (index: number) => {
    setListAnak(listAnak.filter((_, i) => i !== index));
  };

  // --- 4. CONTROL MODAL FORM ---
  const resetForm = () => {
    setEditId(null);
    setFormData({ 
      kepala_keluarga: '', tempat_lahir_ayah: '', tanggal_lahir_ayah: '',
      nama_ibu: '', tempat_lahir_ibu: '', tanggal_lahir_ibu: '',
      wijk: '', no_hp: '', alamat: '' 
    });
    setListAnak([{ nama: '', tempat_lahir: '', tanggal_lahir: '' }]);
    setShowModal(false);
  };

  const openEditModal = (item: Jemaat) => {
    setEditId(item.id);
    setFormData({
      kepala_keluarga: item.kepala_keluarga,
      tempat_lahir_ayah: item.tempat_lahir_ayah || '',
      tanggal_lahir_ayah: item.tanggal_lahir_ayah || '',
      nama_ibu: item.nama_ibu,
      tempat_lahir_ibu: item.tempat_lahir_ibu || '',
      tanggal_lahir_ibu: item.tanggal_lahir_ibu || '',
      no_hp: item.no_hp,
      alamat: item.alamat,
      wijk: item.wijk.toString()
    });
    setListAnak(item.anak || [{ nama: '', tempat_lahir: '', tanggal_lahir: '' }]);
    setShowModal(true);
  };

  // --- 5. LOGIKA SUBMIT DATA (AUTOMATION TRIGGER KE TABEL REMAJA) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    const payload = {
      kepala_keluarga: formData.kepala_keluarga,
      tempat_lahir_ayah: formData.tempat_lahir_ayah,
      tanggal_lahir_ayah: formData.tanggal_lahir_ayah,
      nama_ibu: formData.nama_ibu,
      tempat_lahir_ibu: formData.tempat_lahir_ibu,
      tanggal_lahir_ibu: formData.tanggal_lahir_ibu,
      no_hp: formData.no_hp,
      alamat: formData.alamat,
      wijk: parseInt(formData.wijk) || 0,
      anak: listAnak
    };

    // A. Simpan data utama ke tabel jemaat
    const { error: jemaatError } = editId 
      ? await supabase.from('jemaat').update(payload).eq('id', editId)
      : await supabase.from('jemaat').insert([payload]);

    if (!jemaatError) {
      
      // B. PROSES INTERKONEKSI DATA KE TABEL REMAJA (Khusus Pendaftaran Baru)
      if (!editId) {
        for (const anakItem of listAnak) {
          if (anakItem.nama && anakItem.tanggal_lahir) {
            const usiaAnak = hitungUsia(anakItem.tanggal_lahir);
            let kategoriOtomatis: 'Remaja' | 'Naposo' | null = null;

            // Parameter Batasan Usia Berdasarkan Aturan Skripsi Terbaru
            if (usiaAnak >= 17 && usiaAnak <= 30) {
              kategoriOtomatis = 'Naposo';
            } else if (usiaAnak >= 10 && usiaAnak <= 16) {
              kategoriOtomatis = 'Remaja';
            }

            // Jalankan Trigger Auto-Insert jika memenuhi parameter kategorial pemuda
            if (kategoriOtomatis) {
              await supabase.from('remaja').insert([
                {
                  nama_lengkap: anakItem.nama,
                  kategori: kategoriOtomatis,
                  tempat_lahir: anakItem.tempat_lahir,
                  tanggal_lahir: anakItem.tanggal_lahir,
                  alamat: formData.alamat,
                  nomor_hp: formData.no_hp, // Mewarisi kontak wali/orang tua
                  wijk: parseInt(formData.wijk) || 0 // Mewarisi sektor wilayah orang tua
                }
              ]);
            }
          }
        }
      }

      resetForm();
      loadData();
      
      Swal.fire({
        icon: 'success',
        title: editId ? 'Data Berhasil Diperbarui' : 'Data Berhasil Ditambahkan',
        text: editId ? 'Berkas keluarga jemaat berhasil diperbarui.' : 'Data keluarga berhasil disimpan & kategorial anak tersinkronisasi otomatis.',
        showConfirmButton: false,
        timer: 2500,
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
        text: jemaatError.message,
        confirmButtonColor: '#4f46e5'
      });
    }
    setIsSaving(false);
  };

  // --- 6. LOGIKA HAPUS DATA KUSTOM ---
  const confirmDelete = (id: number) => {
    Swal.fire({
      title: 'Hapus Data Keluarga?',
      text: "Tindakan ini bersifat permanen dan data jemaat tidak dapat dikembalikan!",
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
        const { error } = await supabase.from('jemaat').delete().eq('id', id);
        if (!error) {
          loadData();
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

  // --- 7. MULTI-FILTER LOGIKA ---
  const dataFiltered = data.filter(item => {
    const matchSearch = item.kepala_keluarga.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.nama_ibu.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchWijk = filterWijk === 'all' || item.wijk === parseInt(filterWijk);
    
    return matchSearch && matchWijk;
  });

  if (isAdmin === null) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Data Jemaat</h1>
          <p className="text-slate-500 font-medium italic">Status: {isAdmin ? 'Administrator Mode' : 'View Mode'}</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => { resetForm(); setShowModal(true); }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 text-sm"
          >
            <Plus size={18} /> TAMBAH KELUARGA
          </button>
        )}
      </div>

      {/* FILTER BAR PANEL CONTROLLER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="relative md:col-span-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama bapak atau ibu..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 text-sm"
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative md:col-span-4 flex items-center bg-white border border-slate-200 rounded-2xl px-4 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10">
          <Filter className="text-indigo-500 mr-2 flex-shrink-0" size={16} />
          <select
            className="w-full bg-transparent py-4 outline-none font-bold text-slate-700 text-sm appearance-none cursor-pointer pr-4"
            value={filterWijk}
            onChange={(e) => setFilterWijk(e.target.value)}
          >
            <option value="all">🔍 Tampilkan Semua Wilayah (Wijk)</option>
            <option value="1">📍 Wilayah Sektoral - Wijk 1</option>
            <option value="2">📍 Wilayah Sektoral - Wijk 2</option>
            <option value="3">📍 Wilayah Sektoral - Wijk 3</option>
            <option value="4">📍 Wilayah Sektoral - Wijk 4</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">▼</div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Detail Orang Tua & Usia</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Data Anak & Usia Otomatis</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Kontak Domisili</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="p-24 text-center text-slate-300 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Database...</td></tr>
              ) : dataFiltered.length === 0 ? (
                <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-semibold italic">Tidak ada berkas keluarga jemaat ditemukan pada filter ini.</td></tr>
              ) : dataFiltered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="p-6">
                    <div className="space-y-1">
                      <p className="font-black text-slate-900 uppercase text-sm leading-tight">{item.kepala_keluarga} <span className="text-xs text-slate-400 font-normal">({hitungUsia(item.tanggal_lahir_ayah)} Thn)</span></p>
                      <p className="text-xs text-indigo-600 font-bold">Ibu: {item.nama_ibu} <span className="text-xs text-slate-400 font-normal">({hitungUsia(item.tanggal_lahir_ibu)} Thn)</span></p>
                      <p className="text-[10px] text-indigo-600 font-black mt-1 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-md inline-block">Wijk {item.wijk}</p>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1.5">
                      {item.anak && item.anak.length > 0 && item.anak[0].nama ? item.anak.map((a, i) => (
                        <div key={i} className="text-xs text-slate-600 font-bold flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0" /> 
                          <span>{a.nama}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({hitungUsia(a.tanggal_lahir)} Thn)</span>
                        </div>
                      )) : <span className="text-xs text-slate-400 italic font-medium">Belum mengisi data anak</span>}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-slate-700 flex items-center gap-2 mb-1 text-xs"><Phone size={12} className="text-indigo-400"/> {item.no_hp}</div>
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-2"><MapPin size={12} className="text-slate-300 flex-shrink-0"/> <span className="truncate max-w-[200px]">{item.alamat}</span></div>
                  </td>
                  <td className="p-6 text-center">
                    {isAdmin ? (
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => openEditModal(item)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"><Edit3 size={16}/></button>
                        <button onClick={() => confirmDelete(item.id)} className="p-2.5 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-200">
                        <Lock size={14} />
                        <span className="text-[8px] font-black uppercase mt-1">Protected</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT & TAMBAH JEMAAT KELUARGA */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-4 md:p-10 lg:pl-72 transition-all duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] animate-in zoom-in duration-300 border border-slate-100">
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-[2.5rem]">
              <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-wide">{editId ? '📝 Edit Berkas Keluarga' : '✨ Tambah Keluarga Baru'}</h2>
              <button onClick={resetForm} className="text-slate-300 hover:text-slate-600 transition-all p-1 hover:bg-slate-50 rounded-lg"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* SEKTOR KIRI: DATA ORANG TUA */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 border-b pb-2"><Users size={16} /> Data Orang Tua (Ayah & Ibu)</h3>
                  
                  {/* Blok Ayah */}
                  <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Kepala Keluarga (Ayah)</label>
                    <input placeholder="Nama Lengkap Kepala Keluarga" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold focus:border-indigo-500 transition-colors" value={formData.kepala_keluarga} onChange={e => setFormData({...formData, kepala_keluarga: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Tempat Lahir Ayah" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold focus:border-indigo-500 transition-colors" value={formData.tempat_lahir_ayah} onChange={e => setFormData({...formData, tempat_lahir_ayah: e.target.value})} required />
                      <input type="date" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold text-xs focus:border-indigo-500 transition-colors" value={formData.tanggal_lahir_ayah} onChange={e => setFormData({...formData, tanggal_lahir_ayah: e.target.value})} required />
                    </div>
                  </div>

                  {/* Blok Ibu */}
                  <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data Ibu Kandung</label>
                    <input placeholder="Nama Lengkap Ibu" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold focus:border-indigo-500 transition-colors" value={formData.nama_ibu} onChange={e => setFormData({...formData, nama_ibu: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Tempat Lahir Ibu" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold focus:border-indigo-500 transition-colors" value={formData.tempat_lahir_ibu} onChange={e => setFormData({...formData, tempat_lahir_ibu: e.target.value})} required />
                      <input type="date" className="w-full p-3 bg-white rounded-xl outline-none border border-slate-200 text-slate-800 font-semibold text-xs focus:border-indigo-500 transition-colors" value={formData.tanggal_lahir_ibu} onChange={e => setFormData({...formData, tanggal_lahir_ibu: e.target.value})} required />
                    </div>
                  </div>

                  {/* Atribut Kontak Domisili */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input placeholder="No. HP / WhatsApp" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-indigo-500 font-semibold transition-colors" value={formData.no_hp} onChange={e => setFormData({...formData, no_hp: e.target.value})} required />
                    </div>
                    <div>
                      <select className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-indigo-500 font-bold transition-colors cursor-pointer" value={formData.wijk} onChange={e => setFormData({...formData, wijk: e.target.value})} required>
                        <option value="">WIJK</option>
                        <option value="1">Wijk 1</option>
                        <option value="2">Wijk 2</option>
                        <option value="3">Wijk 3</option>
                        <option value="4">Wijk 4</option>
                      </select>
                    </div>
                  </div>
                  <textarea placeholder="Alamat Tinggal Tetap Saat Ini" className="w-full p-3 bg-slate-50 rounded-xl outline-none border border-slate-200 focus:border-indigo-500 font-semibold transition-colors" rows={2} value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} required />
                </div>

                {/* SEKTOR KANAN: DATA ANAK-ANAK */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><Baby size={16} /> Data Anak ({listAnak.length}/8)</h3>
                    <button type="button" onClick={handleTambahAnak} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition-all shadow-md active:scale-95">+ TAMBAH ANAK</button>
                  </div>
                  
                  <div className="space-y-3 max-h-[360px] md:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {listAnak.map((anak, index) => (
                      <div key={index} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3 relative group transition-all hover:border-indigo-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">{index + 1}</span>
                          <input placeholder="Nama Lengkap Anak" className="flex-1 bg-transparent border-b border-slate-200 outline-none pb-1 font-bold text-slate-800 focus:border-indigo-500 transition-colors" value={anak.nama} onChange={e => handleAnakChange(index, 'nama', e.target.value)} required />
                          {listAnak.length > 1 && (
                            <button type="button" onClick={() => handleHapusAnak(index)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={14}/></button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 pl-7">
                          <input placeholder="Tempat Lahir" className="w-full p-2 bg-white rounded-lg outline-none border border-slate-200 text-xs font-semibold focus:border-indigo-500 transition-colors" value={anak.tempat_lahir} onChange={e => handleAnakChange(index, 'tempat_lahir', e.target.value)} required />
                          <input type="date" className="w-full p-2 bg-white rounded-lg outline-none border border-slate-200 text-xs font-semibold text-slate-500 focus:border-indigo-500 transition-colors" value={anak.tanggal_lahir} onChange={e => handleAnakChange(index, 'tanggal_lahir', e.target.value)} required />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 text-sm tracking-wide uppercase mt-4">
                <Save size={18} /> {isSaving ? 'Sedang Memproses...' : editId ? 'Perbarui Berkas Jemaat' : 'Simpan Berkas Jemaat'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}