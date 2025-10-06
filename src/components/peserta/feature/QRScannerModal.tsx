import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../../db_client/client";
import { X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ValidateResponse = {
  success: boolean;
  status?: "inserted" | "updated";
  user?: { id: string; name: string; nrp?: string };
  message?: string;
};

const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { id: pertemuanId } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultUser, setResultUser] = useState<
    { name: string; nrp?: string } | undefined
  >(undefined);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader-admin";

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

  const processScan = async (decodedText: string) => {
    await cleanup();
    setIsLoading(true);
    setScanError(null);
    setResultMsg(null);
    setResultUser(undefined);

    try {
      if (!pertemuanId) {
        throw new Error("ID pertemuan tidak ditemukan di URL.");
      }

      // Call Edge Function to validate token and record attendance
      const { data, error } = await supabase.functions.invoke<ValidateResponse>(
        "validate-attendance",
        {
          body: { token: decodedText, pertemuanId },
        }
      );

      if (error) throw new Error(error.message || "Gagal memproses token.");
      if (!data?.success) {
        throw new Error(data?.message || "Token tidak valid/kedaluwarsa.");
      }

      setResultUser(
        data.user ? { name: data.user.name, nrp: data.user.nrp } : undefined
      );

      const statusText =
        data.status === "inserted"
          ? "Kehadiran dicatat"
          : data.status === "updated"
          ? "Kehadiran diperbarui"
          : "Berhasil";

      setResultMsg(`✅ ${statusText}.`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal memproses kehadiran.";
      setScanError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      void cleanup();
      setScanError(null);
      setResultMsg(null);
      setResultUser(undefined);
      return;
    }

    const start = async () => {
      setScanError(null);
      setResultMsg(null);
      setResultUser(undefined);

      try {
        const node = document.getElementById(containerId);
        if (!node) return;

        const scanner = new Html5Qrcode(containerId);
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (html5QrCodeRef.current?.isScanning) {
              void processScan(decodedText);
            }
          },
          () => {}
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
    <AnimatePresence>
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
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="bg-gradient-to-br from-[#1D252D] to-[#0c1015] border border-[#363E53]/50 rounded-3xl shadow-2xl w-full max-w-md relative p-6 sm:p-8 text-[#DADBD3]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <h2 className="text-2xl lg:text-3xl font-bold mb-6">QR SCAN</h2>

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
          ) : resultMsg ? (
            <div className="text-center p-6 bg-green-900/20 border border-green-500/30 rounded-lg text-green-300 flex flex-col items-center">
              <CheckCircle2 className="w-10 h-10 mb-4 text-green-400" />
              <p className="font-semibold mb-2">{resultMsg}</p>
              {resultUser && (
                <p className="text-sm">
                  {resultUser.name}
                  {resultUser.nrp ? ` — ${resultUser.nrp}` : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-[#363E53]">
              <div id={containerId} className="w-full h-full" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-white/80 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-white/80 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-white/80 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-white/80 rounded-br-lg" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tutup
            </button>
            {!isLoading && (scanError || resultMsg) && (
              <button
                type="button"
                onClick={async () => {
                  setScanError(null);
                  setResultMsg(null);
                  setResultUser(undefined);
                  const node = document.getElementById(containerId);
                  if (node) node.innerHTML = "";
                  try {
                    const scanner = new Html5Qrcode(containerId);
                    html5QrCodeRef.current = scanner;
                    await scanner.start(
                      { facingMode: "environment" },
                      { fps: 10, qrbox: { width: 260, height: 260 } },
                      (decodedText) => {
                        if (html5QrCodeRef.current?.isScanning) {
                          void processScan(decodedText);
                        }
                      },
                      () => {}
                    );
                  } catch {
                    setScanError(
                      "Tidak bisa mengakses kamera. Coba tutup dan buka lagi."
                    );
                  }
                }}
                className="px-4 py-2 border rounded-lg text-gray-200 hover:bg-white/10 transition-colors"
              >
                Scan Lagi
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QrScannerModal;