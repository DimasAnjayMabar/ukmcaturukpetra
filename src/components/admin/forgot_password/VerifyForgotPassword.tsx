import React, { useState, useEffect } from 'react';
import { MailCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';

const VerifyForgotPassword: React.FC = () => {
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorType, setErrorType] = useState<'other' | undefined>();
  const [customMessage, setCustomMessage] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleResend = async () => {
    try {
      setIsLoading(true);
      // 1. Get email from localStorage
      const email = localStorage.getItem('email');
      
      if (!email) {
        throw new Error('Email not found in localStorage');
      }

      // 2. Resend verification email using Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/forgot-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      // 3. Start countdown and disable button
      setCanResend(false);
      setCountdown(30);
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Resend error:', error);
      setErrorType('other');
      setCustomMessage(
        error instanceof Error 
          ? error.message 
          : 'Failed to resend verification email. Please try again later.'
      );
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleBack = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md text-center">
          <div className="flex justify-center">
            <MailCheck size={48} className="text-green-500" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Forgot Password
          </h2>
          <p className="text-gray-600">
            Email verifikasi terkirim. Harap klik link untuk mereset passwordnya. Pastikan cek email yang terbaru ketika click resend email. Jika link verifikasi tidak muncul, click "show quoted text" atau "tampilkan kutipan teks"
          </p>
          
          <div className="pt-4">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isLoading}
                className={`text-blue-600 hover:text-blue-500 font-medium ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Sending...' : 'Resend verification email'}
              </button>
            ) : (
              <p className="text-gray-500 text-sm">
                Pengiriman ulang dalam {countdown} detik
              </p>
            )}
          </div>

          <div className="pt-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-blue-600 hover:text-blue-500 font-medium"
            >
              Back to login page <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
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

export default VerifyForgotPassword;