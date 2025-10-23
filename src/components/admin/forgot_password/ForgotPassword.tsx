import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal'; 

const ForgotPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const backToLoginPage = async () => {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      // Update password via Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      // Validasi kesamaan password
      if (password !== confirmPassword) {
        setErrorMessage('Password dan konfirmasi password tidak sama.');
        setErrorModalOpen(true);
        return;
      }

      if (updateError) throw updateError;

      setIsSuccess(true);
      localStorage.removeItem('email');
      await supabase.auth.signOut();
      setTimeout(() => navigate('/admin/login'), 3000);
    } catch (err) {
      console.error('Reset password error:', err);

      // Tangkap pesan asli dari Supabase jika ada
      const supabaseMessage = err?.message || 'Gagal mengubah password. Silakan coba lagi.';

      setErrorMessage(supabaseMessage);
      setErrorModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Jika sudah berhasil ubah password
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-bold">Password berhasil diubah!</h2>
          <p>Anda akan diarahkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Atur Ulang Password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block mb-1">Konfirmasi Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              'Atur Password'
            )}
          </button>
          <button
            onClick={backToLoginPage}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              'Kembali ke Login Page'
            )}
          </button>
        </form>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        customMessage={errorMessage}
        errorType="other"
      />
    </div>
  );
};

export default ForgotPassword;
