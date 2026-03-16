import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, MapPin, FileText, Users } from "lucide-react";
import { Pertemuan } from "../../../types";
import { supabase } from "../../../db_client/client";

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  setMeetings: React.Dispatch<React.SetStateAction<Pertemuan[]>>;
  meetingId: string | null;
  onError: (error: string) => void;
}

export const EditMeetingModal: React.FC<EditMeetingModalProps> = ({
  isOpen,
  onClose,
  setMeetings,
  meetingId,
  onError,
}) => {
  const [judul_pertemuan, setJudulPertemuan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [waktu_mulai, setWaktuMulai] = useState("");
  const [waktu_selesai, setWaktuSelesai] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [is_tournament, setIsTournament] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch existing meeting data
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) return;

      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from("pertemuan")
          .select("*")
          .eq("id", meetingId)
          .single();

        if (error) throw error;

        if (data) {
          setJudulPertemuan(data.judul_pertemuan);
          setTanggal(data.tanggal);
          setWaktuMulai(data.waktu_mulai);
          setWaktuSelesai(data.waktu_selesai || "");
          setLokasi(data.lokasi);
          setDeskripsi(data.deskripsi || "");
          setIsTournament(data.is_tournament || false);
        }
      } catch (err) {
        const errorMessage = "Failed to load meeting data.";
        setLocalError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, onError]);

  const handleUpdateMeeting = async (meetingData: Partial<Pertemuan>) => {
    if (!meetingId) return;

    setIsLoading(true);
    setLocalError(null);
    try {
      const { data, error: updateError } = await supabase
        .from("pertemuan")
        .update(meetingData)
        .eq("id", meetingId)
        .select();

      if (updateError) throw updateError;

      if (data?.[0]) {
        setMeetings((prev) =>
          prev.map((meeting) =>
            meeting.id === meetingId ? { ...meeting, ...data[0] } : meeting
          )
        );
        onClose();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Gagal mengupdate pertemuan";
      setLocalError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul_pertemuan || !tanggal || !waktu_mulai || !lokasi) {
      const errorMessage = "Harap isi semua field yang wajib diisi";
      setLocalError(errorMessage);
      onError(errorMessage);
      return;
    }

    await handleUpdateMeeting({
      judul_pertemuan,
      tanggal,
      waktu_mulai,
      waktu_selesai,
      lokasi,
      deskripsi,
      is_tournament,
    });
  };

  const resetForm = () => {
    setJudulPertemuan("");
    setTanggal("");
    setWaktuMulai("");
    setWaktuSelesai("");
    setLokasi("");
    setDeskripsi("");
    setIsTournament(false);
    setLocalError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

return (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
    <div className="bg-[#f5fafd] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-all duration-300">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0c1015] to-[#1f2038] flex items-center justify-between p-6 rounded-t-xl border-b border-gray-700">
        <h2 className="text-xl font-bold text-sky-50">
          {isFetching ? "Loading..." : "Edit Meeting"}
        </h2>
        <button 
          onClick={handleClose} 
          className="text-gray-300 hover:text-white p-1 transition-colors"
          disabled={isLoading || isFetching}
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-gray-900">
        {localError && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm font-medium">
            {localError}
          </div>
        )}

        {isFetching ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          </div>
        ) : (
          <>
            {/* Field shared classes */}
            {[
              {
                label: "Meeting Title",
                icon: <FileText size={16} className="inline mx-1 text-slate-500" />,
                element: (
                  <input
                    type="text"
                    value={judul_pertemuan}
                    onChange={(e) => setJudulPertemuan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg 
                    focus:ring-2 focus:ring-yellow-400 placeholder:text-gray-400"
                    placeholder="Enter a title for the meeting"
                    required
                  />
                )
              },
              {
                label: "Date",
                icon: <Calendar size={16} className="inline mx-1 text-[#178be4]" />,
                element: (
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg 
                    focus:ring-2 focus:ring-yellow-400"
                    required
                  />
                )
              }
            ].map((field, idx) => (
              <div key={idx}>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {field.icon} {field.label}
                </label>
                {field.element}
              </div>
            ))}

            {/* Time grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Clock size={16} className="inline mx-1 text-[#0bde7b]" />
                  Start
                </label>
                <input
                  type="time"
                  value={waktu_mulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  <Clock size={16} className="inline mx-1 text-[#0bde7b]" />
                  End
                </label>
                <input
                  type="time"
                  value={waktu_selesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <MapPin size={16} className="inline mx-1 text-[#FE0081]" />
                Location
              </label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-400 placeholder:text-gray-400"
                placeholder="Masukkan lokasi"
                required
              />
            </div>

            {/* Deskripsi */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <FileText size={16} className="inline mx-1 text-slate-500" />
                Description
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-yellow-400 placeholder:text-gray-400"
                rows={3}
                placeholder="Deskripsi pertemuan (opsional)"
              />
            </div>
          </>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-[#FE0031] text-[#FE0031] rounded-lg hover:bg-[#CE0031] hover:text-white font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 font-medium transition-colors"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

};