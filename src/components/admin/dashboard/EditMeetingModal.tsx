import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { Pertemuan } from '../../../types';
import { supabase } from '../../../db_client/client';

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  setMeetings: React.Dispatch<React.SetStateAction<Pertemuan[]>>;
  meetingId: string | null;
  onError: (error: string) => void; // Add this line
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({ 
  isOpen, 
  onClose,
  setMeetings,
  meetingId,
  onError // Add this to destructured props
}) => {
  const [judul_pertemuan, setJudulPertemuan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktu_mulai, setWaktuMulai] = useState('');
  const [waktu_selesai, setWaktuSelesai] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [is_tournament, setIsTournament] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null); // Renamed from error to avoid confusion
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Refresh pengambilan data
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) return;
      
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('pertemuan')
          .select('*')
          .eq('id', meetingId)
          .single();

        if (error) throw error;

        if (data) {
          setJudulPertemuan(data.judul_pertemuan);
          setTanggal(data.tanggal);
          setWaktuMulai(data.waktu_mulai);
          setWaktuSelesai(data.waktu_selesai || '');
          setLokasi(data.lokasi);
          setDeskripsi(data.deskripsi || '');
          setIsTournament(data.is_tournament || false);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        const errorMessage = 'Gagal memuat data pertemuan';
        setLocalError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, onError]);

  const handleUpdateMeeting = async (meetingData: Partial<Pertemuan>) => {
    if (!meetingId) return;
    
    setIsLoading(true);
    setLocalError(null);
    try {
      // Update pertemuan
      const { data, error: updateError } = await supabase
        .from("pertemuan")
        .update(meetingData)
        .eq('id', meetingId)
        .select();

      if (updateError) throw updateError;

      if (data?.[0]) {
        // Update card pertemuan dengan data baru
        setMeetings(prev => prev.map(meeting => 
          meeting.id === meetingId ? { ...meeting, ...data[0] } : meeting
        ));
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengupdate pertemuan';
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
      await handleUpdateMeeting({
        judul_pertemuan,
        tanggal,
        waktu_mulai,
        waktu_selesai,
        lokasi,
        deskripsi,
        is_tournament
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Error handling is done in handleUpdateMeeting
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
    setLocalError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {isFetching ? 'Memuat data...' : 'Edit Pertemuan'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={isLoading || isFetching}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {localError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {localError}
            </div>
          )}

          {isFetching ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
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
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading || isFetching}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              disabled={isLoading || isFetching}
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
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};