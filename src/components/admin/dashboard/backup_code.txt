import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../../db_client/client";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pertemuanId: string; // meeting id untuk pencatatan kehadiran
}

type ValidateResponse = {
  success: boolean;
  status?: "inserted" | "updated";
  user?: { id: string; name: string; nrp?: string };
  message?: string;
};

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  pertemuanId,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultUser, setResultUser] = useState<
    { name: string; nrp?: string } | undefined
  >(undefined);

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
    // Hentikan scan saat sudah dapat 1 token
    await cleanup();
    setIsLoading(true);
    setScanError(null);
    setResultMsg(null);
    setResultUser(undefined);

    try {
      // Panggil Edge Function untuk validasi token TOTP dan catat kehadiran
      // Buat Edge Function bernama "validate-attendance"
      // Body: { token, pertemuanId }
      const { data, error } = await supabase.functions.invoke<ValidateResponse>(
        "validate-attendance",
        {
          body: { token: decodedText,  pertemuanId: Number(pertemuanId) },
        }
      );

      if (error) {
        throw new Error(error.message || "Gagal memproses token.");
      }
      if (!data?.success) {
        throw new Error(data?.message || "Token tidak valid / kedaluwarsa.");
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
      cleanup();
      setScanError(null);
      setResultMsg(null);
      setResultUser(undefined);
      return;
    }

    // Init scanner saat modal dibuka
    const start = async () => {
      setScanError(null);
      setResultMsg(null);
      setResultUser(undefined);

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
            // Debounce: hanya proses sekali saat masih scanning
            if (html5QrCodeRef.current?.isScanning) {
              processDecoded(decodedText);
            }
          },
          () => {
            // ignore scan failures
          }
        );
      } catch (e) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Scan QR Peserta</h2>
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
          {isLoading && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-2 text-gray-600">Memproses...</p>
            </div>
          )}

          {!isLoading && scanError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded">
              <AlertTriangle className="mt-0.5" size={18} />
              <div>
                <p className="font-medium">Gagal</p>
                <p className="text-sm">{scanError}</p>
              </div>
            </div>
          )}

          {!isLoading && resultMsg && (
            <div className="flex items-start gap-2 bg-green-50 text-green-700 p-3 rounded">
              <CheckCircle2 className="mt-0.5" size={18} />
              <div>
                <p className="font-medium">{resultMsg}</p>
                {resultUser && (
                  <p className="text-sm">
                    {resultUser.name}
                    {resultUser.nrp ? ` — ${resultUser.nrp}` : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {!isLoading && !scanError && !resultMsg && (
            <div className="flex flex-col items-center">
              <div
                id={containerId}
                style={{ width: "100%", aspectRatio: "1 / 1" }}
                className="rounded border border-gray-200 overflow-hidden"
              />
              <p className="mt-3 text-sm text-gray-500 text-center">
                Arahkan kamera ke QR dinamis milik peserta. Token berlaku
                singkat.
              </p>
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
            {!isLoading && (scanError || resultMsg) && (
              <button
                type="button"
                onClick={() => {
                  // restart scanner untuk scan berikutnya
                  setScanError(null);
                  setResultMsg(null);
                  setResultUser(undefined);
                  const node = document.getElementById(containerId);
                  if (node) node.innerHTML = "";
                  // restart async
                  (async () => {
                    try {
                      const scanner = new Html5Qrcode(containerId);
                      html5QrCodeRef.current = scanner;
                      await scanner.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 260, height: 260 } },
                        (decodedText) => {
                          if (html5QrCodeRef.current?.isScanning) {
                            processDecoded(decodedText);
                          }
                        },
                        () => {}
                      );
                    } catch (e) {
                      setScanError(
                        "Tidak bisa mengakses kamera. Coba tutup dan buka lagi."
                      );
                    }
                  })();
                }}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Scan Lagi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};