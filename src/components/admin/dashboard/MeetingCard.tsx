import React from 'react';
import { Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import { Pertemuan } from '../../../types';

interface MeetingCardProps {
  meeting: Pertemuan;
  onEditClick: (meetingId: string) => void;
  onViewDetails: (meetingId: string) => void;
  onDeleteClick: (id: string) => void; // Tambahkan ini
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ 
  meeting, 
  onEditClick,
  onViewDetails,
  onDeleteClick 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
      <div className="p-6">
        {/* Header with title and tournament badge */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 leading-tight">
            {meeting.judul_pertemuan}
          </h3>
          {meeting.is_tournament && (
            <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Trophy size={12} />
              Tournament
            </div>
          )}
        </div>
        
        {/* Meeting details */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center text-gray-600">
            <Calendar size={16} className="mr-3 text-blue-500" />
            <span className="text-sm">{meeting.tanggal}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Clock size={16} className="mr-3 text-green-500" />
            <span className="text-sm">
              {meeting.waktu_mulai} - {meeting.waktu_selesai || 'Selesai'}
            </span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin size={16} className="mr-3 text-red-500" />
            <span className="text-sm">{meeting.lokasi}</span>
          </div>
        </div>
        
        {/* Description */}
        {meeting.deskripsi && (
          <p className="text-gray-600 text-sm mb-5 line-clamp-2">
            {meeting.deskripsi}
          </p>
        )}
        
        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => onViewDetails(meeting.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={!onViewDetails}
          >
            Lihat Detail
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onEditClick(meeting.id)}
              className="bg-white hover:bg-gray-50 text-blue-600 font-medium py-2 px-4 rounded-lg border border-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteClick?.(meeting.id)}
              className="bg-white hover:bg-gray-50 text-red-600 font-medium py-2 px-4 rounded-lg border border-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              disabled={!onDeleteClick}
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};