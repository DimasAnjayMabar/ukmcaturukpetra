import { X } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { supabase } from "../../../db_client/client";
import QRCode from 'react-qr-code'; // Library untuk generate QR code

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pertemuanId: string; // ID pertemuan untuk mengambil data QR code
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ onClose, isOpen, pertemuanId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pertemuanId) {
      fetchQRCode();
    }
  }, [isOpen, pertemuanId]);

  const fetchQRCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Ambil data pertemuan dari Supabase
      const { data, error: fetchError } = await supabase
        .from('pertemuan')
        .select('qr_code')
        .eq('id', pertemuanId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!data?.qr_code) {
        throw new Error('QR code tidak ditemukan');
      }
      
      setQrCodeData(data.qr_code);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat mengambil QR code');
      }
      console.error('Error fetching QR code:', err);
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
            <div className="text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 ml-2">QR Code Pertemuan</h2>
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
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex flex-col items-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-gray-600">Memuat QR code...</p>
              </div>
            ) : qrCodeData ? (
              <>
                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <QRCode 
                    value={qrCodeData} 
                    size={256}
                    level="H" // High error correction
                  />
                </div>
                <p className="mt-4 text-sm text-gray-500 text-center">
                  Scan QR code ini untuk mengakses pertemuan
                </p>
              </>
            ) : (
              <p className="py-8 text-gray-500">QR code tidak tersedia</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};