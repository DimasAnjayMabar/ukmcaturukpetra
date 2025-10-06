/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  UserCheck,
  Trophy,
  QrCode,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Pertemuan, Kehadiran, TournamentMatch } from "../../../types";
import { AttendanceData } from "./AttendanceData";
import { MatchRecap } from "./MatchRecap";
import { supabase } from "../../../db_client/client";
import { ErrorModal } from "../../error_modal/ErrorModal";
// import { QRCodeModal } from "./QrCodeModal"; // old flow (disabled)
import { QRCodeModal } from "./QrCodeModal"; // admin scanner modal

export const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] =
    useState<"attendance" | "matches">("attendance");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [meeting, setMeeting] = useState<
    | (Pertemuan & {
        attendees: Kehadiran[];
        matches: TournamentMatch[];
        is_tournament: boolean;
      })
    | null
  >(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [users, setUsers] = useState<{ [key: string]: { name: string } }>({});
  // const [showQRModal, setShowQRModal] = useState(false); // old flow
  const [showScannerModal, setShowScannerModal] = useState(false); // new flow

  // Fetch attendance data
  const fetchAttendanceData = useCallback(
    async (meetingId: string) => {
      try {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("kehadiran")
          .select("*")
          .eq("pertemuan_id", meetingId);

        if (attendanceError) throw attendanceError;

        const userIds = attendanceData?.map((a) => a.user_id) || [];

        const missingUserIds = userIds.filter((userId) => !users[userId]);
        let newUsersMap: { [key: string]: { name: string } } = {};

        if (missingUserIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from("user_profile")
            .select("id, name")
            .in("id", missingUserIds);

          if (userError) throw userError;

          newUsersMap =
            userData?.reduce((acc, user) => {
              acc[user.id] = { name: user.name };
              return acc;
            }, {} as { [key: string]: { name: string } }) || {};

          setUsers((prevUsers) => ({ ...prevUsers, ...newUsersMap }));
        }

        return attendanceData || [];
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        return [];
      }
    },
    [users]
  );

  const refreshAttendance = useCallback(async () => {
    if (!id) return;

    try {
      setRefreshing(true);
      const updatedAttendance = await fetchAttendanceData(id);

      setMeeting((prev) =>
        prev
          ? {
              ...prev,
              attendees: updatedAttendance,
            }
          : null
      );
    } catch (error) {
      console.error("Error refreshing attendance:", error);
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchAttendanceData]);

  // Fetch matches
  const fetchTournamentMatches = useCallback(
    async (meetingId: string) => {
      try {
        const { data: tournamentData, error: tournamentError } = await supabase
          .from("turnamen")
          .select("*")
          .eq("pertemuan_id", meetingId)
          .order("match_ke", { ascending: true });

        if (tournamentError) throw tournamentError;

        const allPlayerIds = [
          ...new Set([
            ...(tournamentData?.map((m) => m.pemain_1_id) || []),
            ...(tournamentData?.map((m) => m.pemain_2_id) || []),
          ]),
        ];

        const missingPlayerIds = allPlayerIds.filter((uid) => !users[uid]);
        let additionalUsersMap: { [key: string]: { name: string } } = {};

        if (missingPlayerIds.length > 0) {
          const {
            data: additionalUserData,
            error: additionalUserError,
          } = await supabase
            .from("user_profile")
            .select("id, name")
            .in("id", missingPlayerIds);

          if (additionalUserError) throw additionalUserError;

          additionalUsersMap =
            additionalUserData?.reduce((acc, user) => {
              acc[user.id] = { name: user.name };
              return acc;
            }, {} as { [key: string]: { name: string } }) || {};

          setUsers((prev) => ({ ...prev, ...additionalUsersMap }));
        }

        const allUsersMap = { ...users, ...additionalUsersMap };

        const matchesData =
          tournamentData?.map((match) => ({
            ...match,
            pemain_1_name: allUsersMap[match.pemain_1_id]?.name || "Unknown",
            pemain_2_name: allUsersMap[match.pemain_2_id]?.name || "Unknown",
          })) || [];

        return matchesData;
      } catch (error) {
        console.error("Error fetching tournament matches:", error);
        return [];
      }
    },
    [users]
  );

  const refreshMatches = useCallback(async () => {
    if (!id || !meeting?.is_tournament) return;

    try {
      setRefreshing(true);
      const updatedMatches = await fetchTournamentMatches(id);

      setMeeting((prev) =>
        prev
          ? {
              ...prev,
              matches: updatedMatches,
            }
          : null
      );
    } catch (error) {
      console.error("Error refreshing matches:", error);
    } finally {
      setRefreshing(false);
    }
  }, [id, meeting?.is_tournament, fetchTournamentMatches]);

  // Realtime attendance subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`meeting_${id}_attendance`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kehadiran",
          filter: `pertemuan_id=eq.${id}`,
        },
        () => {
          refreshAttendance();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else if (status === "CLOSED") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [id, refreshAttendance]);

  // Realtime matches subscription
  useEffect(() => {
    if (!id || !meeting?.is_tournament) return;

    const channel = supabase
      .channel(`meeting_${id}_tournament`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "turnamen",
          filter: `pertemuan_id=eq.${id}`,
        },
        () => {
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

        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();

        if (!session || authError) {
          setIsUnauthorized(true);
          return;
        }

        type UserMap = {
          [key: string]: {
            name: string;
          };
        };

        const { data: meetingData, error: meetingError } = await supabase
          .from("pertemuan")
          .select("*")
          .eq("id", id)
          .single();

        if (meetingError || !meetingData) {
          throw meetingError || new Error("Meeting not found");
        }

        const { data: attendanceData, error: attendanceError } = await supabase
          .from("kehadiran")
          .select("*")
          .eq("pertemuan_id", id);

        if (attendanceError) throw attendanceError;

        const userIds = attendanceData?.map((a) => a.user_id) || [];

        let usersMap: UserMap = {};
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from("user_profile")
            .select("id, name")
            .in("id", userIds);

          if (userError) throw userError;

          usersMap =
            userData?.reduce((acc: UserMap, user) => {
              acc[user.id] = { name: user.name };
              return acc;
            }, {} as UserMap) || {};
        }

        setUsers(usersMap);

        let matchesData: TournamentMatch[] = [];
        if (meetingData.is_tournament) {
          const { data: tournamentData, error: tournamentError } = await supabase
            .from("turnamen")
            .select("*")
            .eq("pertemuan_id", id)
            .order("match_ke", { ascending: true });

          if (tournamentError) throw tournamentError;

          const allPlayerIds = [
            ...new Set([
              ...(tournamentData?.map((m) => m.pemain_1_id) || []),
              ...(tournamentData?.map((m) => m.pemain_2_id) || []),
            ]),
          ];

          const missingPlayerIds = allPlayerIds.filter((uid) => !usersMap[uid]);
          let additionalUsersMap: { [key: string]: { name: string } } = {};

          if (missingPlayerIds.length > 0) {
            const {
              data: additionalUserData,
              error: additionalUserError,
            } = await supabase
              .from("user_profile")
              .select("id, name")
              .in("id", missingPlayerIds);

            if (additionalUserError) throw additionalUserError;

            additionalUsersMap =
              additionalUserData?.reduce((acc, user) => {
                acc[user.id] = { name: user.name };
                return acc;
              }, {} as UserMap) || {};
          }

          const allUsersMap = { ...usersMap, ...additionalUsersMap };
          setUsers(allUsersMap);

          matchesData =
            tournamentData?.map((match) => ({
              ...match,
              pemain_1_name:
                allUsersMap[match.pemain_1_id]?.name || "Unknown",
              pemain_2_name:
                allUsersMap[match.pemain_2_id]?.name || "Unknown",
            })) || [];
        }

        setMeeting({
          ...meetingData,
          attendees: attendanceData || [],
          matches: matchesData,
          is_tournament: meetingData.is_tournament,
        });
      } catch (error) {
        console.error("Error fetching meeting:", error);
        navigate("/admin/dashboard", { replace: true });
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
        onClose={() => navigate("/admin/login")}
        customMessage="Akses ditolak. Silakan login terlebih dahulu."
        errorType="other"
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        Meeting not found
      </div>
    );
  }

  const waktuPertemuan = `${meeting.waktu_mulai} - ${meeting.waktu_selesai}`;
  const attendingCount = meeting.attendees.filter((a) => a.isAttending).length;

  const handleBack = () => navigate(-1);
  const handleScanQR = () => {
    setShowScannerModal(true);
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
              <h1 className="text-2xl font-bold text-gray-800">
                {meeting.judul_pertemuan}
              </h1>
            </div>

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
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Informasi Pertemuan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center text-gray-600">
              <Calendar size={20} className="mr-3 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Tanggal</p>
                <p className="font-medium">
                  {new Date(meeting.tanggal).toLocaleDateString()}
                </p>
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
                  <span className="text-gray-400">
                    /{meeting.attendees.length}
                  </span>{" "}
                  hadir
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

        {/* New: Admin opens camera to scan participant */}
        <button
          onClick={handleScanQR}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-5 mb-5"
        >
          <QrCode size={20} />
          Scan QR Peserta
        </button>

        {/* Tabs */}
        {meeting.is_tournament ? (
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab("attendance")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "attendance"
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <UserCheck size={18} />
                  Data Kehadiran ({attendingCount})
                </button>
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "matches"
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Trophy size={18} />
                  Hasil Pertandingan ({meeting.matches.length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "attendance" ? (
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

      {/* Old (removed): QRCodeModal for meeting */}
      {/* <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        pertemuanId={id || ""}
      /> */}

      {/* New: Admin scanner modal */}
      <QRCodeModal
        isOpen={showScannerModal}
        onClose={() => {
          setShowScannerModal(false);
          // after close, refresh attendance in case there were new scans
          refreshAttendance();
        }}
        pertemuanId={id || ""}
      />
    </div>
  );
};