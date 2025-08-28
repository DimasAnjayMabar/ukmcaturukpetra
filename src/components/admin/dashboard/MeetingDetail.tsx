/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, UserCheck, Trophy, QrCode, Wifi, WifiOff } from 'lucide-react';
import { Pertemuan, Kehadiran, TournamentMatch } from '../../../types';
import { AttendanceData } from './AttendanceData';
import { MatchRecap } from './MatchRecap';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';
import { QRCodeModal } from './QrCodeModal';

export const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'matches'>('attendance');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [meeting, setMeeting] = useState<(Pertemuan & {
    attendees: Kehadiran[];
    matches: TournamentMatch[];
    is_tournament: boolean;
  }) | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [users, setUsers] = useState<{[key: string]: {name: string}}>({});
  const [showQRModal, setShowQRModal] = useState(false);

  // Function untuk fetch attendance data
  const fetchAttendanceData = useCallback(async (meetingId: string) => {
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('kehadiran')
        .select('*')
        .eq('pertemuan_id', meetingId);

      if (attendanceError) throw attendanceError;

      // Get unique user IDs from attendees
      const userIds = attendanceData?.map(a => a.user_id) || [];
      
      // Fetch user data for attendees that we don't have yet
      const missingUserIds = userIds.filter(userId => !users[userId]);
      let newUsersMap: {[key: string]: {name: string}} = {};

      if (missingUserIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('user_profile')
          .select('id, name')
          .in('id', missingUserIds);

        if (userError) throw userError;

        newUsersMap = userData?.reduce((acc, user) => {
          acc[user.id] = { name: user.name };
          return acc;
        }, {} as {[key: string]: {name: string}}) || {};

        // Update users state dengan user baru
        setUsers(prevUsers => ({ ...prevUsers, ...newUsersMap }));
      }

      return attendanceData || [];
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      return [];
    }
  }, [users]);

  // Function untuk refresh attendance data
  const refreshAttendance = useCallback(async () => {
    if (!id) return;
    
    try {
      setRefreshing(true);
      const updatedAttendance = await fetchAttendanceData(id);
      
      setMeeting(prev => prev ? {
        ...prev,
        attendees: updatedAttendance
      } : null);
    } catch (error) {
      console.error('Error refreshing attendance:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchAttendanceData]);

  // Function untuk fetch data tournament matches
  const fetchTournamentMatches = useCallback(async (meetingId: string) => {
    try {
      // Get tournament matches
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('turnamen')
        .select('*')
        .eq('pertemuan_id', meetingId)
        .order('match_ke', { ascending: true });

      if (tournamentError) throw tournamentError;

      // Get all unique player IDs from matches
      const allPlayerIds = [
        ...new Set([
          ...(tournamentData?.map(match => match.pemain_1_id) || []),
          ...(tournamentData?.map(match => match.pemain_2_id) || [])
        ])
      ];

      // Fetch additional player data if not already in users state
      const missingPlayerIds = allPlayerIds.filter(id => !users[id]);
      let additionalUsersMap: {[key: string]: {name: string}} = {};

      if (missingPlayerIds.length > 0) {
        const { data: additionalUserData, error: additionalUserError } = await supabase
          .from('user_profile')
          .select('id, name')
          .in('id', missingPlayerIds);

        if (additionalUserError) throw additionalUserError;

        additionalUsersMap = additionalUserData?.reduce((acc, user) => {
          acc[user.id] = { name: user.name };
          return acc;
        }, {} as {[key: string]: {name: string}}) || {};

        // Update users state dengan user baru
        setUsers(prevUsers => ({ ...prevUsers, ...additionalUsersMap }));
      }

      // Combine all user data
      const allUsersMap = { ...users, ...additionalUsersMap };

      // Enrich matches with player names
      const matchesData = tournamentData?.map(match => ({
        ...match,
        pemain_1_name: allUsersMap[match.pemain_1_id]?.name || 'Unknown',
        pemain_2_name: allUsersMap[match.pemain_2_id]?.name || 'Unknown'
      })) || [];

      return matchesData;
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
      return [];
    }
  }, [users]);

  // Function untuk refresh matches data
  const refreshMatches = useCallback(async () => {
    if (!id || !meeting?.is_tournament) return;
    
    try {
      setRefreshing(true);
      const updatedMatches = await fetchTournamentMatches(id);
      
      setMeeting(prev => prev ? {
        ...prev,
        matches: updatedMatches
      } : null);
    } catch (error) {
      console.error('Error refreshing matches:', error);
    } finally {
      setRefreshing(false);
    }
  }, [id, meeting?.is_tournament, fetchTournamentMatches]);

  // Setup real-time subscription untuk attendance
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`meeting_${id}_attendance`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'kehadiran',
          filter: `pertemuan_id=eq.${id}`
        }, 
        (payload) => {
          console.log('Real-time attendance update:', payload);
          
          // Auto refresh attendance data ketika ada perubahan
          refreshAttendance();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          console.log('✅ Real-time attendance subscription active');
        } else if (status === 'CLOSED') {
          setRealtimeConnected(false);
          console.log('❌ Real-time attendance subscription closed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [id, refreshAttendance]);

  // Setup real-time subscription untuk tournament matches
  useEffect(() => {
    if (!id || !meeting?.is_tournament) return;

    const channel = supabase
      .channel(`meeting_${id}_tournament`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'turnamen',
          filter: `pertemuan_id=eq.${id}`
        }, 
        (payload) => {
          console.log('Real-time tournament update:', payload);
          
          // Auto refresh matches data ketika ada perubahan
          refreshMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, meeting?.is_tournament, refreshMatches]);

  useEffect(() => {
    const fetchMeetingDetail = async () => {
      try {
        setLoading(true);
      
        // Check session first
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (!session || authError) {
          setIsUnauthorized(true);
          return;
        }

        // Define UserMap type
        type UserMap = {
          [key: string]: {
            name: string;
          };
        };

        // First fetch the meeting data
        const { data: meetingData, error: meetingError } = await supabase
          .from('pertemuan')
          .select('*')
          .eq('id', id)
          .single();

        if (meetingError || !meetingData) {
          throw meetingError || new Error('Meeting not found');
        }

        // Then fetch attendance separately
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('kehadiran')
          .select('*')
          .eq('pertemuan_id', id);

        if (attendanceError) throw attendanceError;

        // Get unique user IDs from attendees
        const userIds = attendanceData?.map(a => a.user_id) || [];
        
        // Fetch user data for all attendees
        let usersMap: UserMap = {};
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('user_profile')
            .select('id, name')
            .in('id', userIds);

          if (userError) throw userError;

          usersMap = userData?.reduce((acc: UserMap, user) => {
            acc[user.id] = { name: user.name };
            return acc;
          }, {} as UserMap) || {};
        }

        setUsers(usersMap);

        // Then fetch matches with player names
        let matchesData: TournamentMatch[] = [];
        if (meetingData.is_tournament) {
          // Get tournament matches
          const { data: tournamentData, error: tournamentError } = await supabase
            .from('turnamen')
            .select('*')
            .eq('pertemuan_id', id)
            .order('match_ke', { ascending: true });

          if (tournamentError) throw tournamentError;

          // Get all unique player IDs from matches
          const allPlayerIds = [
            ...new Set([
              ...(tournamentData?.map(match => match.pemain_1_id) || []),
              ...(tournamentData?.map(match => match.pemain_2_id) || [])
            ])
          ];

          // Fetch additional player data if not already in usersMap
          const missingPlayerIds = allPlayerIds.filter(id => !usersMap[id]);
          let additionalUsersMap: {[key: string]: {name: string}} = {};

          if (missingPlayerIds.length > 0) {
            const { data: additionalUserData, error: additionalUserError } = await supabase
              .from('user_profile')
              .select('id, name')
              .in('id', missingPlayerIds);

            if (additionalUserError) throw additionalUserError;

            additionalUsersMap = additionalUserData?.reduce((acc, user) => {
              acc[user.id] = { name: user.name };
              return acc;
            }, {} as UserMap) || {};
          }

          // Combine all user data
          const allUsersMap = { ...usersMap, ...additionalUsersMap };
          setUsers(allUsersMap); // Update users state dengan semua data

          // Enrich matches with player names
          matchesData = tournamentData?.map(match => ({
            ...match,
            pemain_1_name: allUsersMap[match.pemain_1_id]?.name || 'Unknown',
            pemain_2_name: allUsersMap[match.pemain_2_id]?.name || 'Unknown'
          })) || [];
        }

        setMeeting({
          ...meetingData,
          attendees: attendanceData || [],
          matches: matchesData,
          is_tournament: meetingData.is_tournament,
        });
      } catch (error) {
        console.error('Error fetching meeting:', error);
        navigate('/admin/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingDetail();
  }, [id, navigate]);

  if (isUnauthorized) {
    return (
      <ErrorModal
        isOpen={true}
        onClose={() => navigate('/admin/login')}
        customMessage="Akses ditolak. Silakan login terlebih dahulu."
        errorType="other"
      />
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!meeting) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Meeting not found</div>;
  }

  const waktuPertemuan = `${meeting.waktu_mulai} - ${meeting.waktu_selesai}`;
  const attendingCount = meeting.attendees.filter(a => a.isAttending).length;

  const handleBack = () => navigate(-1);
  const handleScanQR = () => {
    console.log('Scan QR clicked');
  };

  const handleUpdateAttendance = (userId: string, isPresent: boolean) => {
    console.log(`Update attendance for ${userId} to ${isPresent}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Kembali</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{meeting.judul_pertemuan}</h1>
            </div>
            
            {/* Real-time Status Indicator */}
            <div className="flex items-center gap-2">
              {realtimeConnected ? (
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
              
              {refreshing && (
                <div className="text-sm text-blue-600 animate-pulse">
                  Memperbarui...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meeting Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Informasi Pertemuan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center text-gray-600">
              <Calendar size={20} className="mr-3 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Tanggal</p>
                <p className="font-medium">{new Date(meeting.tanggal).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock size={20} className="mr-3 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Waktu</p>
                <p className="font-medium">{waktuPertemuan}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin size={20} className="mr-3 text-red-500" />
              <div>
                <p className="text-sm text-gray-500">Lokasi</p>
                <p className="font-medium">{meeting.lokasi}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-600">
              <Users size={20} className="mr-3 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Kehadiran</p>
                <p className="font-medium">
                  <span className="text-green-600">{attendingCount}</span>
                  <span className="text-gray-400">/{meeting.attendees.length}</span> hadir
                </p>
              </div>
            </div>
          </div>
          {meeting.deskripsi && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-gray-600">{meeting.deskripsi}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowQRModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-5 mb-5"
        >
          <QrCode size={20} />
          Tampilkan QR Code
        </button>

        {/* Navigation Tabs (only show if meeting has matches) */}
        {meeting.is_tournament ? (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'attendance'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <UserCheck size={18} />
                  Data Kehadiran ({attendingCount})
                </button>
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'matches'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Trophy size={18} />
                  Hasil Pertandingan ({meeting.matches.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'attendance' ? (
                <AttendanceData
                  attendees={meeting.attendees}
                  onScanQR={handleScanQR}
                  onUpdateAttendance={handleUpdateAttendance}
                  users={users}
                />
              ) : (
                <MatchRecap
                  matches={meeting.matches}
                  users={users}
                  attendees={meeting.attendees}
                  id={Number(id)}
                  onMatchAdded={refreshMatches}
                />
              )}
            </div>
          </div>
        ) : (
          /* Single Section for non-tournament meetings */
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="p-6">
              <AttendanceData
                attendees={meeting.attendees}
                onScanQR={handleScanQR}
                onUpdateAttendance={handleUpdateAttendance}
                users={users}
              />
            </div>
          </div>
        )}
      </div>
      
      <QRCodeModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
        pertemuanId={id || ''} 
      />
    </div>
  );
};