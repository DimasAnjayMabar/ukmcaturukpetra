import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { LoginFormData } from '../../../types';
import { ErrorModal } from '../../error_modal/ErrorModal';
import { supabase } from '../../../db_client/client';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<
    'email_not_registered' | 'email_not_verified' | 'wrong_password' | 'other'
  >();
  const [customMessage, setCustomMessage] = useState('');
  const navigate = useNavigate();

  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
        // Verify user profile and role before redirecting
        const { data: userProfile } = await supabase
          .from('user_profile')
          .select('role, email_verified_at')
          .eq('email', session.user.email)
          .single();

        if (userProfile?.role === 'admin' && userProfile.email_verified_at) {
          navigate('/admin/dashboard');
        }
      }
    };

    checkSession();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrorType('other');
      setCustomMessage('Silakan masukkan alamat email terlebih dahulu');
      setIsModalOpen(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Cek apakah email terdaftar
      const { data: user } = await supabase
        .from('user_profile')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (!user) {
        setErrorType('email_not_registered');
        setIsModalOpen(true);
        return;
      }

      // Kirim email reset password
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/admin/forgot-password`,
      });

      if (error) throw error;

      localStorage.setItem("email", formData.email);
      navigate('/admin/verifikasi-email-forgot-password');
    } catch (error) {
      console.error('Error:', error);
      setErrorType('other');
      setCustomMessage('Gagal mengirim email reset password');
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsModalOpen(false);
    setErrorType(undefined);
    setCustomMessage('');

    try {
      // 1. Login dengan Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          // Cek apakah email terdaftar
          const { data: user } = await supabase
            .from('user_profile')
            .select('email')
            .eq('email', formData.email)
            .single();

          if (!user) {
            setErrorType('email_not_registered');
          } else {
            setErrorType('wrong_password');
          }
        } else {
          setErrorType('other');
          setCustomMessage(authError.message || 'Terjadi kesalahan saat login');
        }
        setIsModalOpen(true);
        return;
      }

      // 2. Verifikasi user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profile')
        .select('id, email, name, role, email_verified_at')
        .eq('email', formData.email)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!userProfile) {
        setErrorType('email_not_registered');
        setIsModalOpen(true);
        return;
      }

      // 3. Cek verifikasi email
      if (!userProfile.email_verified_at) {
        localStorage.setItem("email", formData.email);
        setErrorType('email_not_verified');
        setIsModalOpen(true);
        return;
      }

      // 4. Cek role admin
      if (userProfile.role !== 'admin') {
        setErrorType('other');
        setCustomMessage('Anda tidak memiliki akses admin');
        setIsModalOpen(true);
        return;
      }

      navigate('/admin/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setErrorType('other');
      setCustomMessage(
        err instanceof Error 
          ? err.message 
          : 'Terjadi kesalahan koneksi'
      );
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      
      // 1. Simpan email ke localStorage
      localStorage.setItem("email", formData.email);

      // 2. Kirim ulang email verifikasi menggunakan Supabase client
      const { error } = await supabase.auth.resend({
        email: formData.email,
        type: 'signup' // atau 'email_change' sesuai kebutuhan
      });

      if (error) {
        throw new Error(error.message);
      }

      // 3. Tutup modal dan arahkan ke halaman sukses
      setIsModalOpen(false);
      navigate('/admin/verifikasi-email-registrasi');

    } catch (error) {
      console.error('Resend verification error:', error);
      setCustomMessage(
        error instanceof Error 
          ? error.message 
          : 'Gagal mengirim ulang email verifikasi. Silakan coba lagi nanti.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Masuk ke Akun Anda
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={16} className="inline mr-2" />
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@contoh.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                <Lock size={16} className="inline mr-2" />
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a 
                href="admin/verifikasi-email-forgot-password" 
                onClick={handleForgotPassword}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Lupa password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <a href="/admin/registrasi" className="font-medium text-blue-600 hover:text-blue-500">
            Daftar sekarang
          </a>
        </div>
      </div>

      <ErrorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        errorType={errorType}
        onResendVerification={handleResendVerification}
        customMessage={customMessage}
      />
    </div>
  );
};

export default LoginPage;