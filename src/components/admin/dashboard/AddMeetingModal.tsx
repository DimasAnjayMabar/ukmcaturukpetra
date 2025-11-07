/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { Pertemuan } from '../../../types';
import { supabase } from '../../../db_client/client';

interface AddMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Hapus setMeetings dan setIsAddModalOpen karena tidak diperlukan lagi
  // setMeetings: React.Dispatch<React.SetStateAction<Pertemuan[]>>;
  // setIsAddModalOpen: (isOpen: boolean) => void;
  onError: (error: string) => void;
}

export const AddMeetingModal: React.FC<AddMeetingModalProps> = ({ 
  onClose,
  isOpen,
  // setMeetings, // Tidak diperlukan lagi
  // setIsAddModalOpen, // Tidak diperlukan lagi
  onError
}) => {

  const [judul_pertemuan, setJudulPertemuan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktu_mulai, setWaktuMulai] = useState('');
  const [waktu_selesai, setWaktuSelesai] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [is_tournament, setIsTournament] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qr_code, setQrCode] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  return () => {
    document.body.style.overflow = '';
  };
}, [isOpen]);


  if (!isOpen) return null;

  const generateQrCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `MEET-${result}`;
    setQrCode(code);
    return code;
  };

  const handleAddMeeting = async (meetingData: Omit<Pertemuan, 'id'>) => {
    setIsLoading(true);
    setLocalError(null);
    try {
      // Insert data pertemuan - real-time subscription akan handle UI update
      const { data, error: insertError } = await supabase
        .from("pertemuan")
        .insert(meetingData)
        .select();

      if (insertError) throw insertError;

      if (data?.[0]) {
        // Tidak perlu lagi update state secara manual
        // Real-time subscription akan handle ini
        console.log('Meeting added successfully - UI will update via real-time subscription');
        
        // Tutup modal dan reset form
        resetForm();
        onClose();
        window.location.reload();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal menambahkan pertemuan';
      setLocalError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul_pertemuan || !tanggal || !waktu_mulai || !lokasi) {
      const errorMessage = 'Harap isi semua field yang wajib diisi';
      setLocalError(errorMessage);
      onError(errorMessage);
      return;
    }

    try {
      // Generate QR code jika belum ada
      const meetingQrCode = qr_code || generateQrCode();
      
      await handleAddMeeting({
        judul_pertemuan,
        tanggal,
        waktu_mulai,
        waktu_selesai,
        lokasi,
        deskripsi,
        is_tournament,
        qr_code: meetingQrCode
      });

    } catch (err) {
      // Error handling is done in handleAddMeeting
    }
  };

  const resetForm = () => {
    setJudulPertemuan('');
    setTanggal('');
    setWaktuMulai('');
    setWaktuSelesai('');
    setLokasi('');
    setDeskripsi('');
    setIsTournament(false);
    setQrCode('');
    setLocalError(null);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;

    // Normal scrolling behavior: scroll the element
    // We compute future scrollTop to determine if we're at an edge
    const futureScrollTop = el.scrollTop + e.deltaY;
    const maxScrollTop = el.scrollHeight - el.clientHeight;

    // If the scroll would go past top or bottom, prevent bubbling
    if (futureScrollTop <= 0) {
      // clamp to 0 and prevent event from escaping to the page
      el.scrollTop = 0;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (futureScrollTop >= maxScrollTop) {
      el.scrollTop = maxScrollTop;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // otherwise let browser do the scroll on the element
    // but set the scrollTop manually for consistent behavior
    el.scrollTop = futureScrollTop;
    e.preventDefault();
  };


return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-800">Tambah Pertemuan Baru</h2>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 p-1"
          disabled={isLoading}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 lg:scrollbar">
        <div
          ref={scrollRef}
          onWheel={handleWheel}
          tabIndex={0}
          className="overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 lg:scrollbar overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
        <form id="addMeetingForm" onSubmit={handleSubmit} className="space-y-4">
          {localError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {localError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="inline mr-2" />
              Judul Pertemuan
            </label>
            <input
              type="text"
              value={judul_pertemuan}
              onChange={(e) => setJudulPertemuan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan judul pertemuan"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-2" />
                Waktu Mulai
              </label>
              <input
                type="time"
                value={waktu_mulai}
                onChange={(e) => setWaktuMulai(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} className="inline mr-2" />
                Waktu Selesai
              </label>
              <input
                type="time"
                value={waktu_selesai}
                onChange={(e) => setWaktuSelesai(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Lokasi
            </label>
            <input
              type="text"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan lokasi pertemuan"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Deskripsi pertemuan (opsional)"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isTournament"
              checked={is_tournament}
              onChange={(e) => setIsTournament(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isLoading}
            />
            <label htmlFor="isTournament" className="ml-2 text-sm text-gray-700">
              Pertemuan ini adalah turnamen
            </label>
          </div>

        </form>
      </div>
      </div>

      <div className="flex gap-3 rounded-b-2xl p-6 border-t border-gray-200 flex-shrink-0 bg-white">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Batal
        </button>
        <button
          type="submit"
          form="addMeetingForm"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses...
            </>
          ) : (
            'Tambah Pertemuan'
          )}
        </button>
      </div>
    </div>
  </div>
);
};