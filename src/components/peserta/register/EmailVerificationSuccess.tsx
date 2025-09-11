import React, { useEffect, useState } from 'react';
import { CheckCircle, LogIn } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';

const EmailVerificationSuccessPeserta: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<'other' | undefined>();
  const [customMessage, setCustomMessage] = useState<string>('');

  const getEmailFromToken = async (token: string): Promise<string | null> => {
    try {
      // Verifikasi token dengan Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        console.error('Token verification error:', error);
        return null;
      }

      return data.user?.email || null;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  };

  const verifyEmail = async (email: string): Promise<boolean> => {
    try {
      // 1. Update email_verified_at di tabel user_profile
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profile')
        .update({ 
          email_verified_at: new Date().toISOString() 
        })
        .eq('email', email)
        .select();

      if (updateError) {
        throw new Error(`Gagal update verifikasi email: ${updateError.message}`);
      }

      if (!updatedUser || updatedUser.length === 0) {
        throw new Error('User dengan email tersebut tidak ditemukan');
      }

      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const verifyAndLogout = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      let email: string | null = null;

      // Coba ambil email dari localStorage terlebih dahulu
      email = localStorage.getItem('email');

      // Jika tidak ada di localStorage, coba ambil dari token URL
      if (!email) {
        const token = searchParams.get('token');
        if (token) {
          email = await getEmailFromToken(token);
          if (!email) {
            throw new Error('Token verifikasi tidak valid atau sudah kedaluwarsa');
          }
        } else {
          throw new Error('Tidak ditemukan metode verifikasi yang valid');
        }
      }

      if (!email) {
        throw new Error('Email tidak ditemukan');
      }

      // Verifikasi email
      await verifyEmail(email);

      // 2. Sign out user dari Supabase (jika user sedang login)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.warn('Gagal sign out:', signOutError.message);
          // Tidak throw error karena sign out bukan operasi kritis
        }
      }

      // 3. Bersihkan localStorage dan update state
      localStorage.removeItem('email');
      setIsVerified(true);
      
      return true;
    } catch (error) {
      console.error('Verification error:', error);
      setErrorType('other');
      setCustomMessage(
        error instanceof Error 
          ? error.message 
          : 'Terjadi kesalahan saat verifikasi email. Silakan coba lagi nanti.'
      );
      setIsModalOpen(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Panggil verifyAndLogout saat komponen di-mount
    const initVerification = async () => {
      const success = await verifyAndLogout();
      
      if (success) {
        // Set timer untuk redirect setelah verifikasi selesai
        const timer = setTimeout(() => {
          navigate('/peserta/login');
        }, 5000);

        return () => clearTimeout(timer);
      }
    };

    initVerification();
  }, [navigate, searchParams]);

  const handleLoginClick = async () => {
    // Jika belum terverifikasi, coba verifikasi lagi
    if (!isVerified) {
      const success = await verifyAndLogout();
      if (!success) return;
    }
    navigate('/peserta/login');
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
            {isVerified ? 'Email Berhasil Diverifikasi!' : 'Memverifikasi Email...'}
          </h2>
          <p className="text-gray-600">
            {isVerified 
              ? 'Akun Anda telah berhasil diverifikasi. Anda akan diarahkan ke halaman login dalam beberapa detik.'
              : 'Sedang memverifikasi email Anda...'
            }
          </p>
          
          {isVerified && (
            <div className="pt-6">
              <button
                onClick={handleLoginClick}
                disabled={isLoading}
                className={`inline-flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  'Memproses...'
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