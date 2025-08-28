import React from 'react';
import { UserCheck, Clock } from 'lucide-react';
import { Kehadiran } from '../../../types';

interface AttendanceDataProps {
  attendees: Kehadiran[];
  onScanQR: () => void;
  onUpdateAttendance: (userId: string, isPresent: boolean) => void;
  users: {
    [key: string]: { 
      name: string;
      // tambahkan field lain jika diperlukan
    } 
  }
}

export const AttendanceData: React.FC<AttendanceDataProps> = ({ 
  attendees, 
  onUpdateAttendance,
  users
}) => {
  const presentCount = attendees.filter(a => a.isAttending).length;
  const totalCount = attendees.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Data Kehadiran</h3>
          <p className="text-gray-600">
            {presentCount} dari {totalCount} peserta hadir
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {attendees.map((attendee) => (
          <div
            key={attendee.id}
            className="flex items-center justify-between p-4 bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 hover:border-gray-200 transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${attendee.isAttending ? 'bg-green-500 shadow-green-200 shadow-inner' : 'bg-red-500 shadow-red-200 shadow-inner'}`} />
              <div>
                <span className="font-medium text-gray-800">
                  {users[attendee.user_id]?.name || attendee.user_id}
                </span>
                {attendee.waktu_kehadiran && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <Clock size={14} />
                    <span>Check-in: {new Date(attendee.waktu_kehadiran).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateAttendance(attendee.user_id, true)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  attendee.isAttending
                    ? 'bg-green-100 text-green-600 shadow-inner'
                    : 'bg-gray-200 text-gray-400 hover:bg-green-100 hover:text-green-600 shadow-sm hover:shadow-md'
                }`}
              >
                <UserCheck size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {attendees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Belum ada peserta terdaftar</p>
        </div>
      )}
    </div>
  );
};