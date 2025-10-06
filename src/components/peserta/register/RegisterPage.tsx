import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Mail, Loader2, CreditCard } from "lucide-react";
import { RegisterFormData } from "../../../types";
import { supabase } from "../../../db_client/client";
import { ErrorModal } from "../../error_modal/ErrorModal";

// Generate a Base32 (RFC 4648) secret using Web Crypto.
// Default 20 bytes (~160-bit), suitable for TOTP.
const generateBase32Secret = (byteLength = 20): string => {
  const bytes = new Uint8Array(byteLength);
  // Use browser Web Crypto for strong randomness
  window.crypto.getRandomValues(bytes);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";

  for (const b of bytes) {
    bits += b.toString(2).padStart(8, "0");
  }

  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const val = parseInt(chunk.padEnd(5, "0"), 2);
    out += alphabet[val];
  }

  return out; // no padding needed
};

const RegisterPagePeserta: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    password: "",
    name: "",
    nrp: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<
    | "email_registered"
    | "username_registered"
    | "nrp_registered"
    | "invalid_email"
    | "invalid_nrp"
    | "weak_password"
    | "other"
  >("other");
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsModalOpen(false);

    // Basic validations
    if (
      !formData.username ||
      !formData.password ||
      !formData.name ||
      !formData.nrp ||
      !formData.email
    ) {
      setError("Harap isi semua field!");
      setIsLoading(false);
      return;
    }

    // Email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorType("invalid_email");
      setError("Format email tidak valid");
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    // NRP format (example: c14230012)
    if (!/^[a-z]\d+$/.test(formData.nrp)) {
      setErrorType("invalid_nrp");
      setError("Format NRP tidak valid. Contoh: c14230012");
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    // Password length
    if (formData.password.length < 6) {
      setErrorType("weak_password");
      setError("Password harus minimal 6 karakter");
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    try {
      // 1) Check duplicates (username/email/nrp)
      const { data: existingUsers, error: checkError } = await supabase
        .from("user_profile")
        .select("username, email, nrp")
        .or(
          `username.eq.${formData.username},email.eq.${formData.email},nrp.eq.${formData.nrp}`
        );

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.username === formData.username) {
          setErrorType("username_registered");
          throw new Error("Username sudah terdaftar");
        }
        if (existingUser.email === formData.email) {
          setErrorType("email_registered");
          throw new Error("Email sudah terdaftar");
        }
        if (existingUser.nrp === formData.nrp) {
          setErrorType("nrp_registered");
          throw new Error("NRP sudah terdaftar");
        }
      }

      // 2) Register user in Supabase Auth
      const { data: authResponse, error: authError } = await supabase.auth
        .signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              role: "peserta",
              username: formData.username,
            },
            emailRedirectTo: `${window.location.origin}/peserta/verifikasi-registrasi-sukses`,
          },
        });

      if (authError) throw authError;

      const authUserId = authResponse.user?.id;
      if (!authUserId) {
        throw new Error("Registrasi gagal: user ID tidak ditemukan.");
      }

      // 3) Generate TOTP secret (repurpose user_profile.qr_code to store secret)
      const totpSecret = generateBase32Secret(20);

      // 4) Insert profile row
      const { error: profileError } = await supabase
        .from("user_profile")
        .insert({
          id: authUserId,
          username: formData.username,
          name: formData.name,
          nrp: formData.nrp,
          email: formData.email,
          role: "peserta",
          // IMPORTANT: qr_code here is the user's TOTP secret.
          // Do not expose it to other users.
          qr_code: totpSecret,
        });

      if (profileError) throw profileError;

      // 5) Persist email locally and navigate
      localStorage.setItem("email", formData.email);
      navigate("/peserta/verifikasi-email-registrasi");
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat registrasi";
      setError(errorMessage);

      if (!errorType) {
        setErrorType("other");
      }

      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden  bg-gradient-to-b from-[#47618a] to-[#E3E1DA]  text-white p-4">
      <div className="absolute inset-0 z-0 hidden md:block">
        <img
          src="/svg/blocks/block w m.svg"
          alt="Decoration"
          className="absolute bottom-[10%] left-[0%] w-[22%] opacity-100"
        />
        <img
          src="/svg/blocks/block w m.svg"
          alt="Decoration"
          className="absolute bottom-[-10%] left-[-6%] w-[18%] opacity-100"
        />
        <img
          src="/svg/blocks/block w m.svg"
          alt="Decoration"
          className="absolute bottom-[-5%] left-[15%] w-[14%] opacity-100"
        />
        <img
          src="/svg/blocks/block w main.svg"
          alt="Decoration"
          className="absolute bottom-[-20%] left-[5%] w-[15%]"
        />

        <img
          src="/svg/blocks/block b m.svg"
          alt="Decoration"
          className="absolute bottom-[10%] right-[0%] w-[22%] opacity-100"
        />
        <img
          src="/svg/blocks/block b m.svg"
          alt="Decoration"
          className="absolute bottom-[-10%] right-[-6%] w-[18%] opacity-100"
        />
        <img
          src="/svg/blocks/block b m.svg"
          alt="Decoration"
          className="absolute bottom-[-5%] right-[15%] w-[14%] opacity-100"
        />
        <img
          src="/svg/blocks/block b main.svg"
          alt="Decoration"
          className="absolute bottom-[-20%] right-[5%] w-[15%]"
        />
      </div>

      <div className="relative z-10 max-w-md w-full space-y-6 p-8">
        <Link
          to="/"
          className="flex justify-center items-center space-x-2 group z-10"
        >
          <img
            src="/svg/chess logo.svg"
            alt="UKM Chess Logo"
            className="h-8 md:h-10 w-auto transition-transform duration-200 group-hover:scale-105"
          />
          <span className="text-center text-3xl font-bold tracking-wider text-[#ece7d8] uppercase">
            UKM CATUR
          </span>
        </Link>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User className="h-5 w-5 text-[#DADBD3]/60" />
              </span>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
                placeholder="Username"
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="h-5 w-5 text-[#DADBD3]/60" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
                placeholder="Password (min. 6 characters)"
                minLength={6}
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User className="h-5 w-5 text-[#DADBD3]/60" />
              </span>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
                placeholder="Full Name"
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <CreditCard className="h-5 w-5 text-[#DADBD3]/60" />
              </span>
              <input
                id="nrp"
                name="nrp"
                type="text"
                required
                value={formData.nrp}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
                placeholder="NRP (e.g., c14230012)"
                pattern="[a-z][0-9]+"
                title="Format: huruf kecil diikuti angka (contoh: c14230012)"
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="h-5 w-5 text-[#DADBD3]/60" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-[#0c1015] text-[#DADBD3] placeholder-[#DADBD3]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all duration-300"
                placeholder="Email Address"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-md shadow-sm text-sm font-medium text-[#ece7d8] bg-gradient-to-b from-[#0a0007] to-[#0f1028] focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2 focus:ring-offset-[#0c1015] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-[#0a0007]/50">
          Already ave an account{" "}
          <a
            href="/peserta/login"
            className="font-medium text-[#0a0007] hover:text-[#0a0007]/80 transition-colors"
          >
            Log in
          </a>
        </p>
      </div>

      <ErrorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        errorType={errorType}
        customMessage={error || undefined}
      />
    </div>
  );
};

export default RegisterPagePeserta;