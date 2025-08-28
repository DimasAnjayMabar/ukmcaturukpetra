import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../../db_client/client';

const QrCodePeserta: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const cleanUpScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
      html5QrCodeRef.current.clear();
      html5QrCodeRef.current = null;
    }

    // Bersihkan DOM secara manual jika diperlukan
    if (scannerContainerRef.current) {
      scannerContainerRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!showScanner) return;
    if (!isMobile) {
      alert("Fitur scan QR hanya tersedia di perangkat mobile");
      return;
    }

    const qrCodeRegionId = "qr-reader";
    html5QrCodeRef.current = new Html5Qrcode(qrCodeRegionId);

    html5QrCodeRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          await cleanUpScanner();
          setShowScanner(false);
          setIsLoading(true);
          setScanResult(decodedText);

          try {
            // 1. Cari pertemuan berdasarkan qr_code yang discan
            const { data: pertemuan, error: pertemuanError } = await supabase
              .from("pertemuan")
              .select("id, judul_pertemuan")
              .eq("qr_code", decodedText)
              .single();

            if (pertemuanError || !pertemuan) {
              alert("QR Code tidak valid atau pertemuan tidak ditemukan");
              return;
            }

            // 2. Dapatkan user yang sedang login
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              alert("Anda harus login untuk mencatat kehadiran");
              return;
            }

            // 3. Cek apakah sudah pernah absen
            const { data: existingAttendance, error: attendanceError } = await supabase
              .from("kehadiran")
              .select("id")
              .eq("user_id", user.id)
              .eq("pertemuan_id", pertemuan.id)
              .maybeSingle();

            if (attendanceError) throw attendanceError;

            const today = new Date().toISOString().split('T')[0];

            if (existingAttendance) {
              // Update existing record
              const { error: updateError } = await supabase
                .from("kehadiran")
                .update({ 
                  isAttending: true,
                  waktu_kehadiran: today 
                })
                .eq("id", existingAttendance.id);

              if (updateError) throw updateError;
            } else {
              // Create new attendance record
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

            alert(`✅ Kehadiran berhasil dicatat untuk pertemuan: ${pertemuan.judul_pertemuan}`);
          } catch (err) {
            console.error("Error:", err);
            alert("Gagal mencatat kehadiran. Silakan coba lagi.");
          } finally {
            setIsLoading(false);
          }
        },
        (err) => {
          console.warn("Scan error:", err);
        }
      )
      .catch((err) => {
        console.error("Gagal mengakses kamera:", err);
        alert("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
        setShowScanner(false);
        setIsLoading(false);
      });

    return () => {
     cleanUpScanner();
    };
  }, [showScanner, isMobile]);

  const handleCloseScanner = () => {
    setShowScanner(false);
    cleanUpScanner();
  }

  return (
    <div> 
      
    <div className="w-full max-w-md mx-auto rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Scan QR Pertemuan</h2>
      <p className="mb-6 text-gray-600">
        Scan QR Code pertemuan untuk mencatat kehadiran Anda.
      </p>

      {scanResult && (
        <div className="mb-6 rounded-lg bg-gray-100 p-4">
          <p className="text-center font-mono text-sm text-gray-700 break-all">
            Terakhir discan: {scanResult}
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => setShowScanner(true)}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Memproses...' : 'Buka Scanner QR'}
        </button>
      </div>

      {showScanner && (
        <div className="mt-6">
          <div id="qr-reader" style={{ width: '100%' }}></div>
          <button
            onClick={handleCloseScanner}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            Tutup Scanner
          </button>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <p className="text-center text-sm text-blue-700">
          Pastikan Anda mengarahkan kamera ke QR Code pertemuan yang valid
        </p>
      </div>
    </div>
    </div>
  );
};

export default QrCodePeserta;