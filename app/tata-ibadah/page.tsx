"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import { 
  FileText, Upload, Calendar, Loader2, 
  Eye, Download, Search, Sun, Users, Trash2
} from 'lucide-react';

interface TataIbadahItem {
  id: number;
  judul: string;
  tanggal: string;
  file_url: string;
  kategori_ibadah: 'Pagi' | 'Siang';
}

export default function TataIbadahPage() {
  const [data, setData] = useState<TataIbadahItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State Operasional Form Admin
  const [file, setFile] = useState<File | null>(null);
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [kategoriIbadah, setKategoriIbadah] = useState<'Pagi' | 'Siang'>('Pagi');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // State Utama Hak Akses Role
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // --- 1. AMBIL DATA DARI DATABASE ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase
        .from('tata_ibadah')
        .select('*')
        .order('tanggal', { ascending: false });

      if (!error && res) {
        setData(res as TataIbadahItem[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 2. CEK STATUS LOGIN (ROLE CHECKER) ---
  useEffect(() => {
    let isMounted = true;
    
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setIsAdmin(!!session);
        await loadData();
      }
    };

    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setIsAdmin(!!session);
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [loadData]);

  // --- 3. PROSES UPLOAD (KHUSUS ADMIN) ---
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !judul || !tanggal) {
      return Swal.fire({
        icon: 'error',
        title: 'Formulir Tidak Lengkap',
        text: 'Harap lengkapi semua data formulir unggahan!',
        confirmButtonColor: '#4f46e5'
      });
    }

    setIsSaving(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // A. Upload file fisik ke Storage Bucket Supabase
      const { error: storageError } = await supabase.storage
        .from('tata-ibadah')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // B. Tarik Public URL file tersebut
      const { data: { publicUrl } } = supabase.storage
        .from('tata-ibadah')
        .getPublicUrl(filePath);

      // C. Simpan referensi data ke Tabel database termasuk kategori_ibadah
      const { error: dbError } = await supabase
        .from('tata_ibadah')
        .insert([{ 
          judul, 
          tanggal, 
          file_url: publicUrl,
          kategori_ibadah: kategoriIbadah 
        }]);

      if (dbError) throw dbError;

      setJudul('');
      setTanggal('');
      setFile(null);
      await loadData(); // Refresh list

      // Toast Sukses Otomatis
      Swal.fire({
        icon: 'success',
        title: 'Tata Ibadah Dipublikasikan',
        text: 'Berkas digital berhasil disinkronkan ke dalam sistem.',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: '#ffffff',
        customClass: {
          title: 'font-black uppercase text-sm tracking-wide text-slate-800'
        }
      });
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat proses upload.';
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengunggah',
        text: errMsg,
        confirmButtonColor: '#4f46e5'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. PROSES HAPUS (KHUSUS ADMIN) ---
  const handleDelete = async (id: number, fileUrl: string) => {
    Swal.fire({
      title: 'Hapus Berkas Tata Ibadah?',
      text: "Tindakan ini bersifat permanen dan berkas fisik pada cloud storage akan dihapus!",
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
        setDeletingId(id);
        try {
          // Hapus file fisik dari Storage Bucket
          const pathSegments = fileUrl.split('/tata-ibadah/');
          if (pathSegments.length > 1) {
            const storagePath = pathSegments[1];
            await supabase.storage.from('tata-ibadah').remove([storagePath]);
          }

          // Hapus baris data tabel
          const { error } = await supabase.from('tata_ibadah').delete().eq('id', id);
          if (error) throw error;

          setData(prev => prev.filter(item => item.id !== id));
          
          Swal.fire({
            icon: 'success',
            title: 'Arsip Berhasil Dihapus',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });
        } catch (err) {
          console.error(err);
          const errMsg = err instanceof Error ? err.message : 'Gagal menghapus berkas.';
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menghapus',
            text: errMsg
          });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  // --- 5. LOGIKA FILTER PENCARIAN GLOBAL ---
  const globalFiltered = data.filter(item =>
    item.judul.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Membagi data ke dua tampungan terpisah berdasarkan jam ibadah
  const dataIbadahPagi = globalFiltered.filter(item => item.kategori_ibadah === 'Pagi');
  const dataIbadahSiang = globalFiltered.filter(item => item.kategori_ibadah === 'Siang');

  // --- 6. HELPER UNTUK VIEW FILE WORD LANGSUNG DI TAB BARU ---
  const getViewUrl = (fileUrl: string) => {
    const ext = fileUrl.split('.').pop()?.toLowerCase();
    if (ext === 'doc' || ext === 'docx') {
      return `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=false`;
    }
    return fileUrl;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* HEADER UTAMA */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Tata Ibadah</h1>
        <p className="text-slate-500 font-medium italic">
          Mode Akses: {isAdmin ? " Admin (Full Control)" : "👥 Jemaat (Viewer Mode)"}
        </p>
      </div>

      {/* SEARCH BAR GLOBAL */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" placeholder="Cari berdasarkan nama acara ibadah minggu..."
          className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm border border-slate-100 rounded-2xl shadow-md outline-none font-bold text-sm text-slate-800"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* STRUKTUR RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* PANEL FORM UPLOAD (MUNCUL HANYA JIKA LOGIN ADMIN) */}
        {isAdmin && (
          <div className="xl:col-span-4 bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 p-2.5 rounded-xl text-white"><Upload size={18} /></div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Unggah Berkas</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Pilih Jadwal Ibadah</label>
                <select 
                  value={kategoriIbadah}
                  onChange={e => setKategoriIbadah(e.target.value as 'Pagi' | 'Siang')}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-indigo-500 font-bold text-xs uppercase"
                >
                  <option value="Pagi">🌅 Ibadah Pagi (Bahasa Indonesia)</option>
                  <option value="Siang">☀️ Ibadah Siang (Bahasa Batak)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nama Acara Ibadah</label>
                <input type="text" required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Minggu Rogate..." className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-700" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tanggal Ibadah</label>
                <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm text-slate-700" />
              </div>

              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50/10 transition-all group">
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                <FileText className="text-indigo-500 mb-2" size={24} />
                <p className="text-xs font-black text-slate-500 text-center truncate max-w-[180px]">{file ? file.name : "Pilih File Word / PDF"}</p>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-slate-900 hover:bg-indigo-600 text-white p-4 rounded-2xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {isSaving ? "Sedang Memproses..." : "Publikasikan"}
              </button>
            </form>
          </div>
        )}

        {/* KONTEN KANAN: TERBAGI MENJADI 2 TABEL TERPISAH (PAGI & SIANG) */}
        <div className={`${isAdmin ? 'xl:col-span-8' : 'xl:col-span-12'} grid grid-cols-1 gap-8`}>
          
          {/* TABEL 1: KHUSUS IBADAH PAGI (BAHASA INDONESIA) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Sun className="text-amber-500" size={20} />
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Ibadah Pagi (Bahasa Indonesia)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tersedia: {dataIbadahPagi.length} Dokumen digital</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center p-12 text-slate-300 font-bold animate-pulse text-xs uppercase tracking-widest">Sinkronisasi Jadwal Pagi...</div>
              ) : dataIbadahPagi.length === 0 ? (
                <div className="text-center p-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl italic uppercase">Belum ada dokumen ibadah pagi</div>
              ) : (
                dataIbadahPagi.map((item) => (
                  <RenderItemRow key={item.id} item={item} isAdmin={isAdmin} deletingId={deletingId} getViewUrl={getViewUrl} handleDelete={handleDelete} />
                ))
              )}
            </div>
          </div>

          {/* TABEL 2: KHUSUS IBADAH SIANG (BAHASA BATAK) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2.5rem] border border-slate-100 shadow-xl p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Users className="text-indigo-500" size={20} />
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Ibadah Siang (Bahasa Batak)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Tersedia: {dataIbadahSiang.length} Dokumen digital</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center p-12 text-slate-300 font-bold animate-pulse text-xs uppercase tracking-widest">Sinkronisasi Jadwal Siang...</div>
              ) : dataIbadahSiang.length === 0 ? (
                <div className="text-center p-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl italic uppercase">Belum ada dokumen ibadah siang</div>
              ) : (
                dataIbadahSiang.map((item) => (
                  <RenderItemRow key={item.id} item={item} isAdmin={isAdmin} deletingId={deletingId} getViewUrl={getViewUrl} handleDelete={handleDelete} />
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// --- SUB-KOMPONEN BARIS TABEL (UNTUK MENGHINDARI COPIED CODE) ---
function RenderItemRow({ item, isAdmin, deletingId, getViewUrl, handleDelete }: { 
  item: TataIbadahItem; 
  isAdmin: boolean; 
  deletingId: number | null; 
  getViewUrl: (url: string) => string;
  handleDelete: (id: number, url: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl"><FileText size={18} /></div>
        <div>
          <h4 className="font-black text-slate-800 uppercase text-xs tracking-wide">{item.judul}</h4>
          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
            <Calendar size={12}/> {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        {/* Tombol BACA */}
        <a 
          href={getViewUrl(item.file_url)} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="px-4 py-2 bg-white border text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Eye size={14}/> BACA
        </a>

        {/* Tombol Unduh */}
        <a 
          href={`${item.file_url}?download=`}
          download
          className="p-2 bg-white border text-slate-400 hover:text-slate-600 rounded-xl transition-all shadow-sm"
          title="Unduh Berkas"
        >
          <Download size={14} />
        </a>

        {/* Tombol Hapus */}
        {isAdmin && (
          <button 
            onClick={() => handleDelete(item.id, item.file_url)}
            disabled={deletingId === item.id}
            className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
          >
            {deletingId === item.id ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}