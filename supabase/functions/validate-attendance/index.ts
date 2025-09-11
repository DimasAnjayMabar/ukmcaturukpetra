// supabase/functions/validate-attendance/index.ts
// Deno Edge Function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';

type Body = { token: string; pertemuanId: string };
type Resp =
  | {
      success: true;
      status: "inserted" | "updated";
      user: { id: string; name: string; nrp?: string };
    }
  | { success: false; message: string };

// Base32 decode (RFC 4648, no padding)
const base32ToBytes = (b32: string): Uint8Array => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = b32.replace(/=+$/g, "").toUpperCase();
  let bits = "";
  for (const ch of cleaned) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    out.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(out);
};

async function totp(
  secretB32: string,
  counter: number,
  digits = 6
): Promise<string> {
  const keyBytes = base32ToBytes(secretB32);
  const ab = new ArrayBuffer(keyBytes.byteLength);
  new Uint8Array(ab).set(keyBytes);

  // 8-byte big-endian
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter % 0x100000000);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    ab,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const h = new Uint8Array(sig);
  const off = h[h.length - 1] & 0x0f;
  const bin =
    ((h[off] & 0x7f) << 24) |
    ((h[off + 1] & 0xff) << 16) |
    ((h[off + 2] & 0xff) << 8) |
    (h[off + 3] & 0xff);
  const mod = 10 ** digits;
  return (bin % mod).toString().padStart(digits, "0");
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { token, pertemuanId } = (await req.json()) as Body;
    if (!token || !pertemuanId) {
      return Response.json({
        success: false,
        message: "Bad Payload",
      });
    }

    const supabase = createClient(
      Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!,
      Deno.env.get("VITE_PUBLIC_SUPABASE_KEY")! // service role for write
    );

    // Fetch small set (80 users is fine)
    const { data: users, error: usersErr } = await supabase
      .from("user_profile")
      .select("id, name, nrp, qr_code");
    if (usersErr) throw usersErr;

    const now = Math.floor(Date.now() / 1000);
    const step = 30;
    const ctr = Math.floor(now / step);

    // Accept small drift: -1, 0, +1
    const windows = [ctr - 1, ctr, ctr + 1];

    let matched:
      | { id: string; name: string; nrp?: string }
      | undefined;

    if (users) {
      for (const u of users) {
        const secret = u.qr_code as string | null;
        if (!secret) continue;

        for (const w of windows) {
          const code = await totp(secret, w, 6);
          if (code === token) {
            matched = { id: u.id as string, name: u.name as string, nrp: u.nrp as string | undefined };
            break;
          }
        }
        if (matched) break;
      }
    }

    if (!matched) {
      return Response.json({
        success: false,
        message: "Token tidak valid / kedaluwarsa",
      });
    }

    // Upsert kehadiran
    const { data: existing, error: existErr } = await supabase
      .from("kehadiran")
      .select("id")
      .eq("user_id", matched.id)
      .eq("pertemuan_id", pertemuanId)
      .maybeSingle();
    if (existErr) throw existErr;

    const nowIso = new Date().toISOString();
    let status: "inserted" | "updated" = "inserted";

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("kehadiran")
        .update({ isAttending: true, waktu_kehadiran: nowIso })
        .eq("id", existing.id);
      if (updErr) throw updErr;
      status = "updated";
    } else {
      const { error: insErr } = await supabase.from("kehadiran").insert({
        user_id: matched.id,
        pertemuan_id: pertemuanId,
        isAttending: true,
        waktu_kehadiran: nowIso,
      });
      if (insErr) throw insErr;
      status = "inserted";
    }

    return Response.json({
      success: true,
      status,
      user : matched
    });
  } catch (e) {
    return Response.json({
      success: false,
      message: e instanceof Error ? e.message : "Error",
      status: 500
    });
  }
});