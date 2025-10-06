import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Loader2, CreditCard } from 'lucide-react';
import { RegisterFormData } from '../../../types';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    password: '',
    name: '',
    nrp: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<
    'email_registered' | 'username_registered' | 'nrp_registered' | 
    'invalid_email' | 'invalid_nrp' | 'weak_password' | 'other'
  >('other');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setIsModalOpen(false);

    // Validasi input
    if (!formData.password || !formData.name || !formData.nrp || !formData.email) {
      setError('Harap isi semua field!');
      setIsLoading(false);
      return;
    }

    // Validasi format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorType('invalid_email');
      setError('Format email tidak valid');
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    // Validasi format NRP (contoh: c14230012)
    if (!/^[a-z]\d+$/.test(formData.nrp)) {
      setErrorType('invalid_nrp');
      setError('Format NRP tidak valid. Contoh: c14230012');
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    // Validasi panjang password
    if (formData.password.length < 6) {
      setErrorType('weak_password');
      setError('Password harus minimal 6 karakter');
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Cek username/email/nrp yang sudah terdaftar
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profile')
        .select('username, email, nrp')
        .or(`email.eq.${formData.email},nrp.eq.${formData.nrp}`);

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];
        if (existingUser.email === formData.email) {
          setErrorType('email_registered');
          throw new Error('Email sudah terdaftar');
        }
        if (existingUser.nrp === formData.nrp) {
          setErrorType('nrp_registered');
          throw new Error('NRP sudah terdaftar');
        }
      }

      // 2. Register user di Supabase Auth
      const { data: authResponse, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'admin',
          },
          emailRedirectTo: `${window.location.origin}/admin/verifikasi-registrasi-sukses`
        }
      });

      if (authError) throw authError;

      // 4. Simpan user ke tabel user_profile
      const { error: profileError } = await supabase
        .from('user_profile')
        .insert({
          id: authResponse.user?.id,
          name: formData.name,
          nrp: formData.nrp,
          email: formData.email,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // 5. Simpan email dan navigasi ke halaman sukses
      localStorage.setItem('email', formData.email);
      navigate('/admin/verifikasi-email-registrasi');

    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat registrasi';
      setError(errorMessage);
      
      // Jika errorType belum di-set (untuk error yang tidak kita throw sendiri)
      if (!errorType) {
        setErrorType('other');
      }
      
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Buat Akun Baru
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Isi form berikut untuk mendaftar
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={16} className="inline mr-2" />
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
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
              required
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              minLength={6}
            />
            <p className="mt-1 text-xs text-gray-500">Minimal 6 karakter</p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              <User size={16} className="inline mr-2" />
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label htmlFor="nrp" className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard size={16} className="inline mr-2" />
              NRP
            </label>
            <input
              id="nrp"
              name="nrp"
              type="text"
              required
              value={formData.nrp}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: c14230012"
              pattern="[a-z][0-9]+"
              title="Format: huruf kecil diikuti angka (contoh: c14230012)"
            />
            <p className="mt-1 text-xs text-gray-500">Format: huruf kecil diikuti angka (contoh: c14230012)</p>
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
                  Mendaftarkan...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <button
            onClick={() => navigate('/admin/login')}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Masuk di sini
          </button>
        </div>
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

export default RegisterPage;