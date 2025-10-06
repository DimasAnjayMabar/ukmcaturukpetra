import React, { useEffect, useState } from "react";
import { CheckCircle, LogIn } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../../db_client/client";
import { ErrorModal } from "../../error_modal/ErrorModal";

const EmailVerificationSuccessPeserta: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<"other" | undefined>();
  const [customMessage, setCustomMessage] = useState<string>("");

  const verifyAndLogout = async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // 🔹 Ambil session langsung dari Supabase
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = sessionData.session?.user;
      if (!user) {
        throw new Error("Session tidak ditemukan. Silakan klik ulang link verifikasi.");
      }

      // 🔹 Update user_profile
      const { error: updateError } = await supabase
        .from("user_profile")
        .update({ email_verified_at: new Date().toISOString() })
        .eq("id", user.id); // atau .eq("email", user.email)

      if (updateError) {
        console.warn("Gagal update user_profile:", updateError.message);
      }

      // 🔹 Tandai sukses & logout
      setIsVerified(true);
      await supabase.auth.signOut();

      return true;
    } catch (err) {
      console.error("Verification error:", err);
      setErrorType("other");
      setCustomMessage(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat verifikasi email. Silakan coba lagi nanti."
      );
      setIsModalOpen(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initVerification = async () => {
      const success = await verifyAndLogout();
      if (success) {
        const timer = setTimeout(() => {
          navigate("/peserta/login");
        }, 5000);
        return () => clearTimeout(timer);
      }
    };
    initVerification();
  }, [navigate, searchParams]);

  const handleLoginClick = async () => {
    if (!isVerified) {
      const success = await verifyAndLogout();
      if (!success) return;
    }
    navigate("/peserta/login");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md text-center">
          <div className="flex justify-center">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            {isVerified ? "Email Berhasil Diverifikasi!" : "Memverifikasi Email..."}
          </h2>
          <p className="text-gray-600">
            {isVerified
              ? "Akun Anda telah berhasil diverifikasi. Anda akan diarahkan ke halaman login dalam beberapa detik."
              : "Sedang memverifikasi email Anda..."}
          </p>

          {isVerified && (
            <div className="pt-6">
              <button
                onClick={handleLoginClick}
                disabled={isLoading}
                className={`inline-flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLoading ? (
                  "Memproses..."
                ) : (
                  <>
                    <LogIn size={16} className="mr-2" />
                    Pergi ke Halaman Login Sekarang
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <ErrorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        errorType={errorType}
        customMessage={customMessage}
      />
    </>
  );
};

export default EmailVerificationSuccessPeserta;
