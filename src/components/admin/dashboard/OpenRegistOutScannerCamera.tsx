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
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // <-- REPLACED

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerId = "qr-admin-scanner-out";
  const SCAN_COOLDOWN = 3000; // 3 detik cooldown (FROM REGIST IN)
  const DUPLICATE_THRESHOLD = 5000; // 5 detik (FROM REGIST IN)

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
    
    // Cek apakah sedang dalam cooldown (FROM REGIST IN)
    if (isProcessing || cooldownRemaining > 0) {
      return;
    }
    
    // Cek apakah ini duplikat scan yang sangat dekat waktunya (FROM REGIST IN)
    if (
      lastScannedRef.current === decodedText &&
      now - lastScanTimeRef.current < DUPLICATE_THRESHOLD
    ) {
      console.log("Duplikat scan diabaikan:", decodedText);
      return;
    }

    // Update tracking (FROM REGIST IN)
    lastScannedRef.current = decodedText;
    lastScanTimeRef.current = now;
    
    setIsProcessing(true);
    startCooldownTimer(); // (FROM REGIST IN)

    // --- YOUR ORIGINAL REGIST OUT LOGIC STARTS HERE ---
    const timezoneOffset = -new Date().getTimezoneOffset();
    const clientTime = new Date().toISOString();

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
        throw new Error(data?.message || "Invalid token.");
      }

      const userName = data.user?.name || "Peserta";
      const userNrp = data.user?.nrp;

      const statusText =
        data.status === "inserted"
          ? "Regis Out listed"
          : data.status === "updated"
          ? "Regis Out updated"
          : "Success";

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

      const formattedMsg = `❌ payload: ${JSON.stringify(payload, null, 2)}\nerror: ${errorString}`;

      setSnackbarMsg(formattedMsg);
      setTimeout(() => setSnackbarMsg(null), 10000);
    } finally {
      
      setIsProcessing(false); 
      // The old setTimeout for isScanningPaused is no longer needed.
      // The startCooldownTimer() handles the pause.
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
            processDecoded(decodedText);
          },
          () => {
            // ignore scan failures
          }
        );
      } catch {
        setScanError(
          "Camera inaccessible. Make sure camera permissions are enabled."
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
        <div className="bg-gradient-to-b from-[#0c1015] to-[#2f3054] text-[#f6fbff] rounded-2xl max-w-md w-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-500">
            <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#ff3d3d] to-[#ffa5c3]">Register Out Scanner</h2>
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
                  className="rounded border border-slate-500 overflow-hidden mb-2"
                />
                
                {isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-[#679dfb]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
                {cooldownRemaining > 0 && !isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-orange-600">
                    <div className="h-4 w-4 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
                    <span className="text-sm font-medium">
                      Scanner paused: {cooldownRemaining}s
                    </span>
                  </div>
                )}
                {cooldownRemaining === 0 && !isProcessing && (
                  <div className="mt-2 flex items-center gap-2 text-[#4dffac]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Ready</span>
                  </div>
                )}
                <p className="mt-2 text-sm text-slate-400 text-center">
                  Point your camera towards the participant's QR code.
                </p>
                <p className="text-sm text-slate-500 text-center">
                  The scanner will pause after a successful scan.
                </p>
              </div>
            )}

            <div className="flex pt-2">
              <button
                type="button"
                onClick={() => onClose()}
                className="flex-1 px-4 py-2 bg-gradient-to-tl from-[#0600a8] to-[#679dfb] text-[#fefff9] rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

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
            <span className="text-sm font-medium whitespace-pre-wrap">{snackbarMsg}</span>
          </div>
        </div>
      )}
    </>
  );
};