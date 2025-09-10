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

const QrCodePeserta: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(30);

  const stepSec = 30;
  const digits = 6;

  // Fetch secret milik user yang login
  useEffect(() => {
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
  }, []);

  // Hitung countdown detik sisa ke window berikutnya
  const calcRemaining = () => {
    const now = Math.floor(Date.now() / 1000);
    const r = stepSec - (now % stepSec);
    return r === stepSec ? 0 : r;
  };

  // Update token tiap detik (dan otomatis ganti tiap 30s)
  useEffect(() => {
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
  }, [secret]);

  const qrValue = useMemo(() => token, [token]);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto rounded-lg bg-white p-6 shadow">
        <p className="text-center text-gray-600">Memuat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto rounded-lg bg-white p-6 shadow">
        <p className="text-center text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-lg bg-white p-6 shadow">
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        QR Dinamis Kehadiran
      </h2>
      <p className="mb-4 text-gray-600 text-sm">
        Tunjukkan QR ini ke panitia. Kode berubah tiap 30 detik.
      </p>

      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <QRCode value={qrValue || "-"} size={240} level="H" />
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-2xl font-mono tracking-widest">{token || "------"}</p>
        <p className="text-sm text-gray-500 mt-1">
          Refresh dalam {remaining}s
        </p>
      </div>

      <div className="mt-6 rounded-lg bg-blue-50 p-3">
        <p className="text-center text-sm text-blue-700">
          Privasi aman: kode hanya valid singkat. Screenshot akan cepat
          kedaluwarsa.
        </p>
      </div>
    </div>
  );
};

export default QrCodePeserta;