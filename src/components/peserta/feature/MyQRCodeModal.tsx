import React from "react";
import { X } from "lucide-react";
import QrCodePeserta from "./QrCodePeserta"; // adjust path if needed

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const MyQRCodeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
                    bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-4">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-2 text-gray-500
                     hover:bg-gray-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* This renders the participant's dynamic TOTP QR (no camera) */}
        <QrCodePeserta />
      </div>
    </div>
  );
};

export default MyQRCodeModal;