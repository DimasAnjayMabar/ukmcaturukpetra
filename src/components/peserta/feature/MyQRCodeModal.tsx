import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import QrCodePeserta from "./QrCodePeserta";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const MyQRCodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4"
      onClick={onClose}
    >
      <div 
        className={`relative w-full bg-white rounded-lg shadow-xl overflow-hidden ${
          isMobile ? 'max-w-xs' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Tutup"
        >
          <X size={16} className="text-gray-600" />
        </button>

        {/* QR Code content */}
        <div className={isMobile ? "p-3" : "p-4"}>
          <QrCodePeserta isOpen={isOpen} onClose={onClose} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
};

export default MyQRCodeModal;