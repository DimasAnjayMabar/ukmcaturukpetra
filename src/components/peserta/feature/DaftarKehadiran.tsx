import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../db_client/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Wifi, WifiOff } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  location: string;
  status: 'Hadir' | 'Tidak Hadir';
  meetingTitle: string;
}

const AttendanceList: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const formatSupabaseTime = (timeString: string) => {
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    return timeString;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformAttendanceRecord = (record: any) => {
    const pertemuan = record.pertemuan;

    // Format tanggal
    const dateObj = new Date(pertemuan.tanggal);
    const formattedDate = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Format waktu
    const startTime = pertemuan.waktu_mulai 
      ? formatSupabaseTime(pertemuan.waktu_mulai)
      : '-';
    
    const endTime = pertemuan.waktu_selesai 
      ? formatSupabaseTime(pertemuan.waktu_selesai)
      : '-';

    // Format time range
    const timeRange = startTime !== '-' && endTime !== '-' 
      ? `${startTime} - ${endTime}`
      : '-';

    // Determine status
    let status: 'Hadir' | 'Tidak Hadir' = 'Tidak Hadir';
    if (record.isAttending) {
      status = 'Hadir';
    }

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
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('kehadiran')
        .select('isAttending, waktu_kehadiran, pertemuan(id, tanggal, waktu_mulai, waktu_selesai, lokasi, judul_pertemuan)')
        .eq('user_id', userId);

      if (attendanceError) {
        throw attendanceError;
      }

      const formattedRecords = attendanceData.map(transformAttendanceRecord);
      setAttendanceRecords(formattedRecords);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const setupRealtimeSubscription = (userId: string) => {
    // Cleanup existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Create new channel for realtime updates
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kehadiran',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('Realtime update received:', payload);
          
          // Refresh data when changes occur
          await fetchAttendanceData(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pertemuan'
        },
        async (payload) => {
          console.log('Meeting update received:', payload);
          
          // Refresh data when meeting details change
          await fetchAttendanceData(userId);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        setIsOnline(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || 'No active session found');
        }

        const userId = sessionData.session.user.id;

        // Fetch initial data
        await fetchAttendanceData(userId);

        // Setup realtime subscription
        setupRealtimeSubscription(userId);

      } catch (err) {
        console.error('Error initializing attendance data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hadir':
        return 'bg-green-100 text-green-800';
      case 'Tidak Hadir':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        setLoading(true);
        await fetchAttendanceData(sessionData.session.user.id);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          Loading attendance data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">Error: {error}</div>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      {/* Header with realtime indicator */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Daftar Kehadiran</h2>
        <div className="flex items-center gap-3">
          {/* Realtime status indicator */}
          <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Wifi size={16} />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <WifiOff size={16} />
                  <span>Offline</span>
                </div>
              )}
            </div>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Pertemuan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tanggal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Waktu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Lokasi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {attendanceRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Belum ada data kehadiran
                </td>
              </tr>
            ) : (
              attendanceRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {record.meetingTitle}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {record.date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {record.time}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {record.location}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceList;