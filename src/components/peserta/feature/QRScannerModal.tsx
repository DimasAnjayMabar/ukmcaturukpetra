import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../../db_client/client';
import { X, Loader2, AlertTriangle, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const cleanUpScanner = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
    }
  };

  const processScan = async (decodedText: string) => {
    await cleanUpScanner();
    setIsLoading(true);
    setScanResult(decodedText);

    try {
      const { data: pertemuan, error: pertemuanError } = await supabase
        .from("pertemuan")
        .select("id, judul_pertemuan")
        .eq("qr_code", decodedText)
        .single();

      if (pertemuanError || !pertemuan) {
        throw new Error("QR Code tidak valid atau pertemuan tidak ditemukan.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Anda harus login untuk mencatat kehadiran.");
      }

      const { data: existingAttendance, error: attendanceError } = await supabase
        .from("kehadiran")
        .select("id")
        .eq("user_id", user.id)
        .eq("pertemuan_id", pertemuan.id)
        .maybeSingle();
      
      if (attendanceError) throw attendanceError;

      const today = new Date().toISOString();

      if (existingAttendance) {
        const { error: updateError } = await supabase
          .from("kehadiran")
          .update({ isAttending: true, waktu_kehadiran: today })
          .eq("id", existingAttendance.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("kehadiran")
          .insert({
            user_id: user.id,
            pertemuan_id: pertemuan.id,
            isAttending: true,
            waktu_kehadiran: today
          });
        if (insertError) throw insertError;
      }

      alert(`Attendance successful: ${pertemuan.judul_pertemuan}`);
    } catch (err) {
      console.error("Error:", err);
      alert(`Attendance failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScanError(null);
      if (!isMobile) {
        setScanError("QR Scan is only available on mobile.");
        return;
      }

      const qrCodeRegionId = "qr-reader-modal";
      if (document.getElementById(qrCodeRegionId) && !html5QrCodeRef.current) {
        const html5QrCode = new Html5Qrcode(qrCodeRegionId);
        html5QrCodeRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => { if (html5QrCodeRef.current?.isScanning) processScan(decodedText); },
          (errorMessage) => {}
        ).catch((err) => {
          setScanError(`Cannot access camera. Make sure camera permissions are allowed.`);
        });
      }
    } else {
      cleanUpScanner();
    }
    return () => { cleanUpScanner(); };
  }, [isOpen, isMobile]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="bg-gradient-to-br from-[#1D252D] to-[#0c1015] border border-[#363E53]/50 rounded-3xl shadow-2xl w-full max-w-md relative p-6 sm:p-8 text-[#DADBD3]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
              {/* <QrCode className="text-[#FFD700]" /> */}
              QR SCAN
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Loader2 className="animate-spin w-12 h-12 text-[#FFD700]" />
                <p className="mt-4 text-gray-300">Processing...</p>
              </div>
            ) : scanError ? (
              <div className="text-center p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 flex flex-col items-center">
                <AlertTriangle className="w-10 h-10 mb-4 text-red-400" />
                <p className="font-semibold mb-2">Error</p>
                <p className="text-sm">{scanError}</p>
              </div>
            ) : (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-[#363E53]">
                <div id="qr-reader-modal" className="w-full h-full"></div>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QrScannerModal;