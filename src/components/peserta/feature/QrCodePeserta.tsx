import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "../../../db_client/client";

/**
 * Base32 decode (RFC 4648, no padding) -> Uint8Array
 */
const base32ToBytes = (b32: string): Uint8Array => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = b32.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of cleaned) {
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(out);
};

/**
 * Generate TOTP (HMAC-SHA1) with 30s step and 6 digits.
 */
const generateTotp = async (
  secretBase32: string,
  timeStepSec = 30,
  digits = 6
): Promise<string> => {
  const keyBytes = base32ToBytes(secretBase32);

  // Create a fresh ArrayBuffer (not SharedArrayBuffer) and copy bytes in
  const ab = new ArrayBuffer(keyBytes.byteLength);
  new Uint8Array(ab).set(keyBytes);

  const counter = Math.floor(Date.now() / 1000 / timeStepSec);

  // 8-byte big-endian buffer
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter % 0x100000000);

  const subtle = (globalThis.crypto as Crypto).subtle;

  const cryptoKey = await subtle.importKey(
    "raw",
    ab, // ArrayBuffer (not SharedArrayBuffer)
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const hmac = await subtle.sign("HMAC", cryptoKey, msg);
  const h = new Uint8Array(hmac);

  const offset = h[h.length - 1] & 0x0f;
  const bin =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);

  const mod = 10 ** digits;
  return (bin % mod).toString().padStart(digits, "0");
};

interface QrCodePesertaProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const QrCodePeserta: React.FC<QrCodePesertaProps> = ({ isOpen, onClose, isMobile }) => {
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(30);

  const stepSec = 30;
  const digits = 6;

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Fetch secret milik user yang login
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchSecret = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!user) throw new Error("Silakan login terlebih dahulu.");

        const { data, error: profileErr } = await supabase
          .from("user_profile")
          .select("qr_code, name, nrp")
          .eq("id", user.id)
          .single();

        if (profileErr) throw profileErr;
        if (!data?.qr_code) {
          throw new Error("Secret QR tidak ditemukan pada profil.");
        }
        setSecret(data.qr_code);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Gagal mengambil secret pengguna.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchSecret();
  }, [isOpen]);

  // Hitung countdown detik sisa ke window berikutnya
  const calcRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    const r = stepSec - (now % stepSec);
    return r === stepSec ? 0 : r;
  };

  // Update token tiap detik (dan otomatis ganti tiap 30s)
  useEffect(() => {
    if (!isOpen) return;
    
    let timer: number | undefined;

    const tick = async () => {
      if (!secret) return;
      try {
        const t = await generateTotp(secret, stepSec, digits);
        setToken(t);
        setRemaining(calcRemaining());
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Gagal menghasilkan token TOTP."
        );
      }
    };

    // initial
    void tick();
    timer = window.setInterval(tick, 1000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [secret, isOpen]);

  const qrValue = useMemo(() => token, [token]);

 if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-center text-gray-600 text-sm">Memuat QR Code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4">
        <p className="text-center text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
        >
          Tutup
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className={`font-semibold text-gray-900 text-center mb-1 ${isMobile ? 'text-lg' : 'text-xl'}`}>
        QR Dinamis Kehadiran
      </h2>
      <p className={`text-gray-600 text-center mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        Tunjukkan QR ini ke panitia. Kode berubah tiap 30 detik.
      </p>

      <div className="flex justify-center mb-4">
        <div className="p-2 bg-white rounded-lg border border-gray-200">
          <QRCode 
            value={qrValue || "-"} 
            size={isMobile ? 160 : 220} 
            level="H" 
          />
        </div>
      </div>

      <div className="text-center mb-4">
        <p className={`font-mono tracking-widest ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>
          {token || "------"}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mx-auto max-w-xs">
          <div 
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
            style={{ width: `${(remaining / stepSec) * 100}%` }}
          ></div>
        </div>
        <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Refresh dalam {remaining}s
        </p>
      </div>

      <div className="rounded-lg bg-blue-50 p-3 mb-4">
        <p className={`text-center text-blue-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Privasi aman: kode hanya valid singkat. Screenshot akan cepat kedaluwarsa.
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
      >
        Tutup
      </button>
    </div>
  );
};

export default QrCodePeserta;