import React from 'react';
import { Calendar, Clock, MapPin, Trophy, Trash2, Bolt } from 'lucide-react';
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
    <div className="group bg-[#f5fafd] hover:bg-[#f5fafd] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-500"
      onClick={() => onViewDetails(meeting.id)}
    >
        {/* Header with title and tournament badge */}
        <div className="bg-gradient-to-r from-[#0c1015] to-[#1f2038] rounded-t-xl flex items-start justify-between px-6 pb-4 pt-6">
          <h3 className="text-xl font-bold text-sky-50 leading-tight">
            {meeting.judul_pertemuan}
          </h3>
          {meeting.is_tournament && (
            <div className="bg-gradient-to-tr from-[#ffb300] to-[#fff27d] text-amber-900 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Trophy size={12} />
              Tournament
            </div>
          )}
        </div>

        <hr className="mb-4 border-slate-500" />

        {/* Description */}
        {meeting.deskripsi && (
          <p className="text-gray-600 text-sm mb-5 line-clamp-2 px-6">
            {meeting.deskripsi}
          </p>
        )}
        

        <hr className="my-4 border-slate-500" />
        
        {/* Meeting details */}
        <div className="space-y-3 mb-5 px-6">
          <div className="flex items-center text-gray-800 transition-colors duration-200 ">
            <Calendar size={16} className="mr-3 text-[#178be4]" />
            <span className="text-sm">{meeting.tanggal}</span>
          </div>
          <div className="flex items-center text-gray-800 transition-colors duration-200 ">
            <Clock size={16} className="mr-3 text-[#0bde7b]" />
            <span className="text-sm">
              {meeting.waktu_mulai} - {meeting.waktu_selesai || 'Selesai'}
            </span>
          </div>
          <div className="flex items-center text-gray-800 transition-colors duration-200 ">
            <MapPin size={16} className="mr-3 text-[#FE0081]" />
            <span className="text-sm">{meeting.lokasi}</span>
          </div>
        </div>
        
        <hr className="my-4 border-slate-500" />

        {/* Action buttons */}
        <div className="space-y-3 px-6 pb-6">
          <div className="flex gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick?.(meeting.id);
            }}
              className="flex justify-center items-center border border-[#FE0031] hover:bg-[#CE0031] text-[#FE0031] font-medium py-2 px-3 rounded-lg transition-colors duration-200"
              disabled={!onDeleteClick}
            >
              <Trash2 size={20} />
            </button>
            <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(meeting.id);
            }}
              className="flex justify-center items-center border border-slate-500 hover:bg-[#2A3044] text-gray-900 hover:text-white font-medium py-2 px-3 rounded-lg transition-colors duration-200"
            >
              <Bolt size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(meeting.id);
              }}
            className="border border-slate-500 flex-1 hover:bg-[#2A3044] text-gray-900 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 "
            disabled={!onViewDetails}
          >
            View Details
          </button>
          </div>
        </div>
    </div>
  );
};