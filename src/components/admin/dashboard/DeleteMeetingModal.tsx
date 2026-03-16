import { X } from "lucide-react";
import React, { useState } from 'react';
import { supabase } from "../../../db_client/client";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string | null;
  onDeleteSuccess: () => void; // Callback setelah penghapusan berhasil
  onError: (error: string) => void; // Add this line
}

export const DeleteMeetingModal: React.FC<DeleteModalProps> = ({ 
  isOpen, 
  onClose, 
  meetingId,
  onDeleteSuccess,
  onError // Add this to destructured props
}) => {
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null); // Renamed from error to avoid confusion

  const handleDeleteMeeting = async () => {
    if (!meetingId) return;
    
    setLoading(true);
    setLocalError(null);
    
    try {
      // We'll handle the transaction manually since Supabase doesn't support direct RPC transactions
      // Delete order: child tables first, then parent table

      // 1. Delete all related tournament matches
      const { error: tournamentError } = await supabase
        .from('turnamen')
        .delete()
        .eq('pertemuan_id', meetingId);
      
      if (tournamentError) throw tournamentError;

      // 2. Delete all related attendance records
      const { error: attendanceError } = await supabase
        .from('kehadiran')
        .delete()
        .eq('pertemuan_id', meetingId);
      
      if (attendanceError) throw attendanceError;

      // 3. Delete the meeting itself
      const { error: meetingError } = await supabase
        .from('pertemuan')
        .delete()
        .eq('id', meetingId);
      
      if (meetingError) throw meetingError;

      // If we get here, all deletions were successful
      onDeleteSuccess();
      onClose();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal menghapus pertemuan';
      setLocalError(errorMessage);
      onError(errorMessage);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 ml-2">Konfirmasi Penghapusan</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {localError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {localError}
            </div>
          )}
          
          <p className="text-gray-700">
            Apakah Anda yakin ingin menghapus pertemuan ini? Tindakan ini tidak dapat dibatalkan.
          </p>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDeleteMeeting}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Menghapus...
                </>
              ) : (
                'Hapus Pertemuan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};