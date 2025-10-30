import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../db_client/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Wifi, WifiOff, ArrowLeft, BookOpen } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  location: string;
  status: 'Hadir' | 'Tidak Hadir';
  meetingTitle: string;
}

interface RegistOutRecord {
  id: string;
  date: string;
  time: string;
  location: string;
  status: 'Sudah Keluar' | 'Belum Keluar';
  meetingTitle: string;
}

const AttendanceList: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [registOutRecords, setRegistOutRecords] = useState<RegistOutRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'regist-in' | 'regist-out'>('regist-in');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(50%);
          opacity: 1;
        }
      }
      .animate-slide-up {
        animation: slideUp 1s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const formatSupabaseTime = (timeString: string) => {
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    return timeString;
  };

  const transformAttendanceRecord = (record: any): AttendanceRecord => {
    const pertemuan = record.pertemuan;
    const dateObj = new Date(pertemuan.tanggal);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const startTime = pertemuan.waktu_mulai ? formatSupabaseTime(pertemuan.waktu_mulai) : '-';
    const endTime = pertemuan.waktu_selesai ? formatSupabaseTime(pertemuan.waktu_selesai) : '-';
    const timeRange = startTime !== '-' && endTime !== '-' ? `${startTime} - ${endTime}` : '-';
    const status: 'Hadir' | 'Tidak Hadir' = record.isAttending ? 'Hadir' : 'Tidak Hadir';
    return {
      id: pertemuan.id.toString(),
      date: formattedDate,
      time: timeRange,
      location: pertemuan.lokasi,
      status,
      meetingTitle: pertemuan.judul_pertemuan || 'Pertemuan'
    };
  };
  
  const transformRegistOutRecord = (record: any): RegistOutRecord => {
    const pertemuan = record.pertemuan;
    const dateObj = new Date(pertemuan.tanggal);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const startTime = pertemuan.waktu_mulai ? formatSupabaseTime(pertemuan.waktu_mulai) : '-';
    const endTime = pertemuan.waktu_selesai ? formatSupabaseTime(pertemuan.waktu_selesai) : '-';
    const timeRange = startTime !== '-' && endTime !== '-' ? `${startTime} - ${endTime}` : '-';
    const status: 'Sudah Keluar' | 'Belum Keluar' = record.isRegistedOut ? 'Sudah Keluar' : 'Belum Keluar';
    return {
      id: pertemuan.id.toString(),
      date: formattedDate,
      time: timeRange,
      location: pertemuan.lokasi,
      status,
      meetingTitle: pertemuan.judul_pertemuan || 'Pertemuan'
    };
  };

  const fetchAttendanceData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('kehadiran')
        .select('isAttending, pertemuan(id, tanggal, waktu_mulai, waktu_selesai, lokasi, judul_pertemuan)')
        .eq('user_id', userId);
      if (error) throw error;
      setAttendanceRecords(data.map(transformAttendanceRecord));
    } catch (err) {
      throw err;
    }
  };

  const fetchRegistOutData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('regist_out')
        .select('isRegistedOut, pertemuan(id, tanggal, waktu_mulai, waktu_selesai, lokasi, judul_pertemuan)')
        .eq('user_id', userId);
      if (error) throw error;
      setRegistOutRecords(data.map(transformRegistOutRecord));
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session found');
        
        // fetch both sets of data in parallel
        await Promise.all([
          fetchAttendanceData(session.user.id),
          fetchRegistOutData(session.user.id)
        ]);

        const channel = supabase
          .channel('user-attendance-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'kehadiran', filter: `user_id=eq.${session.user.id}` }, 
            () => fetchAttendanceData(session.user.id)
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'regist_out', filter: `user_id=eq.${session.user.id}` }, // Added listener for regist_out
            () => fetchRegistOutData(session.user.id)
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pertemuan' }, 
            () => {
              fetchAttendanceData(session.user.id);
              fetchRegistOutData(session.user.id);
            }
          )
          .subscribe((status) => setIsOnline(status === 'SUBSCRIBED'));
          
        channelRef.current = channel;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    initializeData();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);
  
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Hadir':
      case 'Sudah Keluar':
        return 'bg-green-900/30 text-green-300 border-green-500/30';
      case 'Tidak Hadir':
      case 'Belum Keluar':
      default:
        return 'bg-red-900/30 text-red-300 border-red-500/30';
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-600">{error}</div>;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-t from-[#47618a] to-[#E3E1DA]">
      <div className="absolute -bottom-20 md:-bottom-80 lg:-bottom-0 left-1/2 -translate-x-1/2 w-1/2 lg:w-1/2 h-1/2 z-20 pointer-events-none lg:left-0 lg:h-full lg:-translate-x-0 lg:z-0 flex items-end justify-center">
        <img 
          src="/svg/blocks/book.svg" 
          alt="Kehadiran Pillar" 
          className="w-[80%] h-auto lg:w-[40vw] lg:max-w-2xl lg:translate-y-1/2 lg:animate-slide-up" 
        />
      </div>

      <main className="absolute inset-0 z-10 p-4 sm:p-6 lg:p-0 lg:right-0 lg:left-1/2 lg:w-1/2">
        <div className="flex flex-col h-full lg:p-8">
            <div className="mb-6 flex-shrink-0">
              <Link
                to="/"
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/30 text-gray-100 hover:text-white transition-all duration-300 group"
              >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="rounded-3xl bg-[#0c1015]/90 backdrop-blur-xl border border-[#363E53]/50 p-6 sm:p-8 shadow-2xl flex-grow flex flex-col overflow-hidden max-h-[65vh] lg:max-h-full">
              
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h2 className="text-2xl lg:text-3xl font-bold text-[#DADBD3] flex items-center gap-3">
                  ATTENDANCE LIST
                </h2>
                <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full backdrop-blur-md ${
                  isOnline 
                    ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                    : 'bg-gray-800/50 text-gray-400 border border-gray-600/30'
                }`}>
                  {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                  <span>{isOnline ? 'Live' : 'Offline'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 border-b border-[#363E53]/30 flex-shrink-0 w-full">
                <button
                  onClick={() => setActiveTab('regist-in')}
                  className={`py-3 font-medium text-sm transition-all duration-300 ease-out text-center w-full border-b-2 ${

                    activeTab === 'regist-in'
                      ? 'text-[#FFD700] border-[#FFD700] bg-[#363E53]/20'
                      : 'text-[#DADBD3]/60 border-transparent hover:text-[#DADBD3]'
                  }`}
                >
                  Regist In
                </button>
                <button
                  onClick={() => setActiveTab('regist-out')}
                  className={`py-3 font-medium text-sm transition-all text-center w-full border-b-2 ${
                    activeTab === 'regist-out'
                      ? 'text-[#FFD700] border-[#FFD700] bg-[#363E53]/20'
                      : 'text-[#DADBD3]/60 border-transparent hover:text-[#DADBD3]'
                  }`}
                >
                  Regist Out
                </button>
              </div>

              <div className="overflow-y-auto min-h-0 rounded-2xl bg-[#0a0b0f]/50 border border-[#363E53]/30">
                <table className="min-w-full">
                  <thead className="bg-[#363E53]/20 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Pertemuan</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Tanggal</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Waktu</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Lokasi</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#363E53]/20">
                    
                    {activeTab === 'regist-in' && (
                      <>
                        {attendanceRecords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-[#DADBD3]/60">
                              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                              No attendance data.
                            </td>
                          </tr>
                        ) : (
                          attendanceRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#363E53]/20 transition-colors duration-200">
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#DADBD3]">{record.meetingTitle}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.date}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.time}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.location}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold leading-5 border ${getStatusStyle(record.status)}`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    )}
                    
                    {activeTab === 'regist-out' && (
                      <>
                        {registOutRecords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-[#DADBD3]/60">
                              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
                              No regist-out data.
                            </td>
                          </tr>
                        ) : (
                          registOutRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-[#363E53]/20 transition-colors duration-200">
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#DADBD3]">{record.meetingTitle}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.date}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.time}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-[#DADBD3]/80">{record.location}</td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold leading-5 border ${getStatusStyle(record.status)}`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    )}
                    
                  </tbody>
                </table>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default AttendanceList;