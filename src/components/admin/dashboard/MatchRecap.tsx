/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Trophy, Trash2, X, Plus } from 'lucide-react';
import { TournamentMatch } from '../../../types';
import { supabase } from '../../../db_client/client';
import Select from 'react-select';

interface MatchRecapProps {
  id: number; // ID pertemuan dari params
  matches: TournamentMatch[];
  users: { [key: string]: { name: string } };
  attendees: { user_id: string; isAttending: boolean }[]; // tipe sesuaikan
  onMatchAdded?: () => void; // Callback untuk refresh data dari parent
}

export const MatchRecap: React.FC<MatchRecapProps> = ({ 
  id,
  matches,
  users,
  attendees,
  onMatchAdded
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<TournamentMatch | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMatch, setNewMatch] = useState({
    pemain_1_id: '',
    hasil_pemain_1: 1 as 1 | 0 | 0.5 | null,
    pemain_2_id: '',
    hasil_pemain_2: 0 as 1 | 0 | 0.5 | null
  });

  // Buat options hanya dari peserta yang hadir
  const playerOptions = attendees
    .filter(a => a.isAttending)
    .map(a => ({
      value: a.user_id,
      label: users[a.user_id]?.name || a.user_id
    }));

  // Konversi angka ke teks untuk tampilan
  const getResultText = (result: number | null) => {
    switch (result) {
      case 1: return 'Menang';
      case 0: return 'Kalah';
      case 0.5: return 'Seri';
      default: return '-';
    }
  };

  // Warna untuk masing-masing hasil
  const getResultColor = (result: number | null) => {
    switch (result) {
      case 1: return 'text-green-600 bg-green-100';
      case 0: return 'text-red-600 bg-red-100';
      case 0.5: return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Hitung match_ke berdasarkan matches yang sudah ada
  const getNextMatchNumber = () => {
    if (matches.length === 0) return 1;
    const maxMatchKe = Math.max(...matches.map(match => match.match_ke || 0));
    return maxMatchKe + 1;
  };

  const handleAddMatch = async () => {
    setAddError(null);

    // Validasi
    if (!newMatch.pemain_1_id || !newMatch.pemain_2_id) {
      setAddError('Silakan pilih kedua pemain.');
      return;
    }
    if (newMatch.pemain_1_id === newMatch.pemain_2_id) {
      setAddError('Pemain tidak boleh sama.');
      return;
    }
    if (newMatch.hasil_pemain_1 === null) {
      setAddError('Hasil pertandingan tidak valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      const matchData = {
        p_pemain_1_id: newMatch.pemain_1_id,
        p_hasil_pemain_1: newMatch.hasil_pemain_1,
        p_pemain_2_id: newMatch.pemain_2_id,
        p_hasil_pemain_2: newMatch.hasil_pemain_2,
        p_match_ke: getNextMatchNumber(),
        p_pertemuan_id: id,
      };

      const { error } = await supabase.rpc('add_match_result', matchData);

      if (error) {
        throw error;
      }

      // Reset form, close modal, and refresh data
      setNewMatch({
        pemain_1_id: '',
        hasil_pemain_1: 1,
        pemain_2_id: '',
        hasil_pemain_2: 0,
      });
      setShowAddForm(false);
      if (onMatchAdded) {
        onMatchAdded();
      }

    } catch (error: any) {
      console.error('Gagal menambah match:', error);
      setAddError(error.message || 'Terjadi kesalahan saat menambah match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMatch = async (match: TournamentMatch) => {
    setMatchToDelete(match);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;

    setDeletingMatchId(matchToDelete.id ?? null);
    setDeleteError(null);

    try {
      // Decrement score pemain 1 (mengurangi score yang sudah ditambahkan sebelumnya)
      const { error: decrementError1 } = await supabase.rpc('increment_score', {
        user_id: matchToDelete.pemain_1_id,
        increment_value: -(matchToDelete.hasil_pemain_1 || 0) // negative value untuk mengurangi
      });

      // Decrement score pemain 2 (mengurangi score yang sudah ditambahkan sebelumnya)
      const { error: decrementError2 } = await supabase.rpc('increment_score', {
        user_id: matchToDelete.pemain_2_id,
        increment_value: -(matchToDelete.hasil_pemain_2 || 0) // negative value untuk mengurangi
      });

      if (decrementError1 || decrementError2) {
        throw decrementError1 || decrementError2;
      }

      // Hapus match dari database
      const { error: deleteError } = await supabase
        .from('turnamen')
        .delete()
        .eq('id', matchToDelete.id);

      if (deleteError) throw deleteError;

      // Close modal and refresh data
      setShowDeleteModal(false);
      setMatchToDelete(null);
      if (onMatchAdded) {
        onMatchAdded();
      }

    } catch (error: any) {
      console.error('Gagal menghapus match:', error);
      setDeleteError(error.message || 'Terjadi kesalahan saat menghapus match');
    } finally {
      setDeletingMatchId(null);
    }
  };

  const closeDeleteModal = () => {
    if (deletingMatchId) return; // Prevent closing while deleting
    setShowDeleteModal(false);
    setMatchToDelete(null);
    setDeleteError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-500" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Rekap Pertandingan</h3>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Tambah Match</span>
        </button>
      </div>

      {matches.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Match</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Pemain 1</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Hasil</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Pemain 2</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Hasil</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{match.id}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {match.pemain_1_name || users[match.pemain_1_id]?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(match.hasil_pemain_1 ?? null)}`}>
                      {getResultText(match.hasil_pemain_1 ?? null)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {match.pemain_2_name || users[match.pemain_2_id]?.name || 'Unknown'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getResultColor(match.hasil_pemain_2 ?? null)}`}>
                      {getResultText(match.hasil_pemain_2 ?? null)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDeleteMatch(match)}
                      disabled={deletingMatchId === match.id}
                      className={`p-1 rounded transition-colors ${
                        deletingMatchId === match.id
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title="Hapus pertandingan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Belum ada pertandingan</p>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Tambah Match Baru</h4>
            
            <div className="space-y-4">
              {addError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {addError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Match ke-{getNextMatchNumber()}
                </label>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pemain 1
                </label>
                <Select
                  options={playerOptions}
                  value={playerOptions.find(opt => opt.value === newMatch.pemain_1_id) || null}
                  onChange={(selected) =>
                    setNewMatch({ ...newMatch, pemain_1_id: selected?.value || '' })
                  }
                  placeholder="Cari atau pilih pemain 1..."
                  isSearchable
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasil Pemain 1
                </label>
                <select
                  value={newMatch.hasil_pemain_1 || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const hasilPemain1 = value === '1' ? 1 : value === '0' ? 0 : value === '0.5' ? 0.5 : null;
                    setNewMatch({ 
                      ...newMatch, 
                      hasil_pemain_1: hasilPemain1,
                      hasil_pemain_2: hasilPemain1 === 1 ? 0 : hasilPemain1 === 0 ? 1 : 0.5
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Menang (1)</option>
                  <option value="0">Kalah (0)</option>
                  <option value="0.5">Seri (0.5)</option>
                </select>
              </div>

               <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pemain 2
                  </label>
                  <Select
                    options={playerOptions.filter(option => option.value !== newMatch.pemain_1_id)}
                    value={playerOptions.find(opt => opt.value === newMatch.pemain_2_id) || null}
                    onChange={(selected) =>
                      setNewMatch({ ...newMatch, pemain_2_id: selected?.value || '' })
                    }
                    placeholder="Cari atau pilih pemain 2..."
                    isSearchable
                  />
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hasil Pemain 2
                </label>
                <div className={`px-3 py-2 rounded-lg ${getResultColor(newMatch.hasil_pemain_2)}`}>
                  {getResultText(newMatch.hasil_pemain_2)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddMatch}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && matchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="text-red-500">
                  <Trash2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 ml-2">Konfirmasi Penghapusan</h2>
              </div>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 p-1"
                disabled={!!deletingMatchId}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {deleteError}
                </div>
              )}
              
              <p className="text-gray-700">
                Apakah Anda yakin ingin menghapus pertandingan antara{' '}
                <strong>{matchToDelete.pemain_1_name || users[matchToDelete.pemain_1_id]?.name}</strong> vs{' '}
                <strong>{matchToDelete.pemain_2_name || users[matchToDelete.pemain_2_id]?.name}</strong>?
              </p>
              
              <p className="text-sm text-gray-600">
                Tindakan ini akan mengurangi score kedua pemain dan tidak dapat dibatalkan.
              </p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeDeleteModal}
                  disabled={!!deletingMatchId}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDeleteMatch}
                  disabled={!!deletingMatchId}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingMatchId === matchToDelete.id ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menghapus...
                    </>
                  ) : (
                    'Hapus Pertandingan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};