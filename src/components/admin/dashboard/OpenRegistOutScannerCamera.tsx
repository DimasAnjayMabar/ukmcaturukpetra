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

export const OpenRegistOutScannerCamera: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  pertemuanId,
}) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanningPaused, setIsScanningPaused] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-admin-scanner";

  const cleanup = async () => {
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

  const processDecoded = async (decodedText: string) => {
    if (isProcessing || isScanningPaused) return;

    setIsProcessing(true);
    setIsScanningPaused(true);

    const timezoneOffset = -new Date().getTimezoneOffset();
    const clientTime = new Date().toISOString();

    // simpan payload supaya bisa tampil di snackbar kalau gagal
    const payload = {
      token: decodedText,
      pertemuanId: Number(pertemuanId),
      timezoneOffset,
      clientTime,
    };

    try {
      const { data, error } = await supabase.functions.invoke<ValidateResponse>(
        "swift-worker",
        { body: payload }
      );

      if (error) {
        console.error("Supabase Edge Function Error:", error);
        throw error;
      }

      if (!data?.success) {
        console.error("Edge Function Response:", data);
        throw new Error(data?.message || "Token tidak valid / kedaluwarsa.");
      }

      const userName = data.user?.name || "Peserta";
      const userNrp = data.user?.nrp;

      const statusText =
        data.status === "inserted"
          ? "Regis Out dicatat"
          : data.status === "updated"
          ? "Regis Out diperbarui"
          : "Berhasil";

      setSnackbarMsg(
        `✅ ${statusText} - ${userName}${userNrp ? ` (${userNrp})` : ""}`
      );
      setTimeout(() => setSnackbarMsg(null), 3000);
    } catch (err) {
      console.error("Full Error:", err);

      let errorString: string;

      try {
        if (err instanceof Error) {
          errorString = `${err.name}: ${err.message}\n${err.stack || ""}`;
        } else if (typeof err === "object") {
          errorString = JSON.stringify(err, null, 2);
        } else {
          errorString = String(err);
        }
      } catch {
        errorString = "Tidak bisa membaca detail error.";
      }

      // tampilkan format payload dan error terpisah
      const formattedMsg = `❌ payload: ${JSON.stringify(payload, null, 2)}\nerror: ${errorString}`;

      setSnackbarMsg(formattedMsg);
      setTimeout(() => setSnackbarMsg(null), 10000);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setIsScanningPaused(false), 2000);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setScanError(null);
      setSnackbarMsg(null);
      setIsProcessing(false);
      setIsScanningPaused(false);
      return;
    }

    // Init scanner saat modal dibuka
    const start = async () => {
      setScanError(null);
      setSnackbarMsg(null);
      setIsProcessing(false);
      setIsScanningPaused(false);

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
            <h2 className="text-lg font-semibold">Regist Out Peserta</h2>
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
                  Arahkan kamera ke QR dinamis milik peserta. Scanner akan terus aktif untuk scan berikutnya.
                </p>
                {isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Memproses...</span>
                  </div>
                )}
                {isScanningPaused && !isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-gray-500">
                    <span className="text-sm">Scanner dijeda...</span>
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