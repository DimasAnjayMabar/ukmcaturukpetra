import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../../db_client/client";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pertemuanId: string;
}

type ValidateResponse = {
  success: boolean;
  status?: "inserted" | "updated";
  user?: { id: string; name: string; nrp?: string };
  message?: string;
};

export const OpenRegistInScannerCamera: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  pertemuanId,
}) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerId = "qr-admin-scanner";
  const SCAN_COOLDOWN = 3000; // 3 detik cooldown
  const DUPLICATE_THRESHOLD = 5000; // 5 detik untuk menganggap QR yang sama sebagai duplikat

  const cleanup = async () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      await html5QrCodeRef.current?.clear();
    } catch {
      // ignore
    } finally {
      html5QrCodeRef.current = null;
      const node = document.getElementById(containerId);
      if (node) node.innerHTML = "";
    }
  };

  const startCooldownTimer = () => {
    setCooldownRemaining(SCAN_COOLDOWN / 1000);
    
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const processDecoded = async (decodedText: string) => {
    const now = Date.now();
    
    // Cek apakah sedang dalam cooldown
    if (isProcessing || cooldownRemaining > 0) {
      return;
    }
    
    // Cek apakah ini duplikat scan yang sangat dekat waktunya
    if (
      lastScannedRef.current === decodedText &&
      now - lastScanTimeRef.current < DUPLICATE_THRESHOLD
    ) {
      console.log("Duplikat scan diabaikan:", decodedText);
      return;
    }

    // Update tracking
    lastScannedRef.current = decodedText;
    lastScanTimeRef.current = now;
    
    setIsProcessing(true);
    startCooldownTimer();

    try {
      // Dapatkan waktu lokal dan timezone offset dari client
      const timezoneOffset = -new Date().getTimezoneOffset(); // Konversi ke UTC offset (dalam menit)
      const clientTime = new Date().toISOString(); // Waktu client sebagai ISO string

      // Panggil Edge Function dengan tambahan timezone info
      const { data, error } = await supabase.functions.invoke<ValidateResponse>(
        "validate-attendance",
        {
          body: { 
            token: decodedText, 
            pertemuanId: Number(pertemuanId),
            timezoneOffset: timezoneOffset, // Kirim offset timezone
            clientTime: clientTime // Kirim waktu client (optional backup)
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Gagal memproses token.");
      }
      if (!data?.success) {
        throw new Error(data?.message || "Token tidak valid / kedaluwarsa.");
      }

      const userName = data.user?.name || "Peserta";
      const userNrp = data.user?.nrp;

      const statusText =
        data.status === "inserted"
          ? "Kehadiran dicatat"
          : data.status === "updated"
          ? "Kehadiran diperbarui"
          : "Berhasil";

      setSnackbarMsg(`✅ ${statusText} - ${userName}${userNrp ? ` (${userNrp})` : ""}`);

      // Auto hide snackbar setelah 3 detik
      setTimeout(() => {
        setSnackbarMsg(null);
      }, 3000);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal memproses kehadiran.";
      
      // Tampilkan error di snackbar
      setSnackbarMsg(`❌ ${msg}`);
      setTimeout(() => {
        setSnackbarMsg(null);
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setScanError(null);
      setSnackbarMsg(null);
      setIsProcessing(false);
      setCooldownRemaining(0);
      lastScannedRef.current = "";
      lastScanTimeRef.current = 0;
      return;
    }

    // Init scanner saat modal dibuka
    const start = async () => {
      setScanError(null);
      setSnackbarMsg(null);
      setIsProcessing(false);
      setCooldownRemaining(0);

      try {
        // Pastikan container ada
        const node = document.getElementById(containerId);
        if (!node) return;

        const scanner = new Html5Qrcode(containerId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            // Proses setiap scan tanpa menghentikan scanner
            processDecoded(decodedText);
          },
          () => {
            // ignore scan failures
          }
        );
      } catch {
        setScanError(
          "Tidak bisa mengakses kamera. Pastikan izin kamera diberikan."
        );
      }
    };

    void start();

    return () => {
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Regist In Peserta</h2>
            <button
              onClick={() => {
                onClose();
              }}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {scanError && (
              <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded">
                <AlertTriangle className="mt-0.5" size={18} />
                <div>
                  <p className="font-medium">Gagal</p>
                  <p className="text-sm">{scanError}</p>
                </div>
              </div>
            )}

            {!scanError && (
              <div className="flex flex-col items-center">
                <div
                  id={containerId}
                  style={{ width: "100%", aspectRatio: "1 / 1" }}
                  className="rounded border border-gray-200 overflow-hidden"
                />
                <p className="mt-3 text-sm text-gray-500 text-center">
                  Arahkan kamera ke QR dinamis milik peserta. Scanner akan dijeda otomatis setelah scan berhasil.
                </p>
                {isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Memproses...</span>
                  </div>
                )}
                {cooldownRemaining > 0 && !isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-orange-600">
                    <div className="h-4 w-4 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
                    <span className="text-sm font-medium">
                      Scanner dijeda: {cooldownRemaining}s
                    </span>
                  </div>
                )}
                {cooldownRemaining === 0 && !isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Scanner siap</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Snackbar Notification */}
      {snackbarMsg && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[60] animate-slide-up">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              snackbarMsg.startsWith("✅")
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {snackbarMsg.startsWith("✅") ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <span className="text-sm font-medium">{snackbarMsg}</span>
          </div>
        </div>
      )}
    </>
  );
};