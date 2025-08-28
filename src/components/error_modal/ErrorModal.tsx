import React from 'react';
import { X, Mail, AlertTriangle, Lock, AlertCircle } from 'lucide-react';

export interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorType?: 
    | 'email_not_registered' 
    | 'email_not_verified' 
    | 'wrong_password'
    | 'email_registered'
    | 'username_registered'
    | 'nrp_registered'
    | 'invalid_email'
    | 'invalid_nrp'
    | 'weak_password'
    | 'other';
  onResendVerification?: () => void;
  customMessage?: string;
}


export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  isOpen, 
  onClose,
  errorType,
  onResendVerification,
  customMessage
}) => {
  if (!isOpen) return null;

  // Fungsi untuk menentukan konten berdasarkan jenis error
  const getModalContent = () => {
    if (customMessage) {
      return {
        icon: <AlertCircle className="text-red-500" size={20} />,
        title: "Terjadi Kesalahan",
        message: customMessage,
        showResendButton: false
      };
    }

    switch (errorType) {
      case 'email_not_registered':
        return {
          icon: <Mail className="text-red-500" size={20} />,
          title: "Email Tidak Terdaftar",
          message: "Email yang Anda masukkan tidak terdaftar dalam sistem kami.",
          showResendButton: false
        };
      case 'email_not_verified':
        return {
          icon: <AlertTriangle className="text-yellow-500" size={20} />,
          title: "Email Belum Terverifikasi",
          message: "Email Anda belum terverifikasi. Silakan cek inbox email Anda untuk tautan verifikasi.",
          showResendButton: true
        };
      case 'wrong_password':
        return {
          icon: <Lock className="text-red-500" size={20} />,
          title: "Password Salah",
          message: "Password yang Anda masukkan tidak sesuai. Silakan coba lagi.",
          showResendButton: false
        };
      default:
        return {
          icon: <AlertCircle className="text-red-500" size={20} />,
          title: "Terjadi Kesalahan",
          message: "Terjadi kesalahan saat melakukan login. Silakan coba lagi nanti.",
          showResendButton: false
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {content.icon}
            <h2 className="text-xl font-bold text-gray-800 ml-2">{content.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start">
            <div className="text-gray-700">
              <p>{content.message}</p>
              {errorType === 'email_not_verified' && (
                <p className="text-sm text-gray-500 mt-2">
                  Jika Anda tidak menerima email verifikasi, Anda bisa meminta kirim ulang.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
            {content.showResendButton && onResendVerification && (
              <button
                type="button"
                onClick={onResendVerification}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kirim Ulang Email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
