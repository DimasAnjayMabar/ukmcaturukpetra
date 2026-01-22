/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useState, useEffect, useCallback} from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
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
  LogIn,
  LogOut,
  Download,
  Menu,
  Trash2,
  X
} from "lucide-react";
import {Pertemuan, Kehadiran, TournamentMatch, RegistOut} from "../../../types";
import {CheckInData} from "./CheckInData";
import {CheckOutData} from "./CheckOutData";
// import { MatchRecap } from "./MatchRecap";
import {supabase} from "../../../db_client/client";
import {OpenRegistInScannerCamera} from "./OpenRegistInScannerCamera";
import {OpenRegistOutScannerCamera} from "./OpenRegistOutScannerCamera";
import * as XLSX from "xlsx";
import RoundsCard from "./RoundsCard";
import {useAdminLayout} from "../layout/AdminLayoutContext";

interface LocationState {
  activeTab?: "attendance" | "matches";
}

export const MeetingDetail: React.FC = () => {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"attendance" | "matches">(
    "attendance"
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [meeting, setMeeting] = useState<
    | (Pertemuan & {
        attendees: Kehadiran[];
        registOutData: RegistOut[];
        matches: TournamentMatch[];
        is_tournament: boolean;
      })
    | null
  >(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [users, setUsers] = useState<{
    [key: string]: {name: string; nrp?: string};
  }>({});
  const [showRegistInScannerModal, setShowRegistInScannerModal] =
    useState(false);
  const [showRegistOutScannerModal, setShowRegistOutScannerModal] =
    useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [bulkActionType, setBulkActionType] = useState<
    "insert" | "delete" | null
  >(null);
  const [processingBulkAction, setProcessingBulkAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {toggleSidebar} = useAdminLayout();

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const tabFromState = (location.state as LocationState)?.activeTab;

    // Priority: URL params > Location state > Default
    if (tabFromUrl === "matches" && meeting?.is_tournament) {
      setActiveTab("matches");
    } else if (tabFromState === "matches" && meeting?.is_tournament) {
      setActiveTab("matches");
      // Update URL untuk persist pada refresh
      setSearchParams({tab: "matches"});
    } else if (tabFromUrl === "attendance") {
      setActiveTab("attendance");
    }
  }, [searchParams, location.state, meeting?.is_tournament, setSearchParams]);

  const handleTabChange = (tab: "attendance" | "matches") => {
    setActiveTab(tab);
    if (tab === "matches") {
      setSearchParams({tab: "matches"});
    } else {
      setSearchParams({tab: "attendance"});
    }
  };

  const handleBulkInsertAll = async () => {
    setProcessingBulkAction(true);
    setErrorMsg("");

    try {
      const {
        data: {session},
      } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setErrorMsg("Anda belum login.");
        return;
      }

      // Re-authenticate password
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: adminPassword,
      });

      if (signInError) {
        setErrorMsg("Password salah.");
        return;
      }

      // Ambil semua user role 'peserta'
      const {data: pesertaList, error: userError} = await supabase
        .from("user_profile")
        .select("id")
        .eq("role", "peserta");

      if (userError) throw userError;
      if (!pesertaList || pesertaList.length === 0) {
        setErrorMsg("Tidak ada peserta ditemukan.");
        return;
      }

      // Buat list data untuk insert
      const insertData = pesertaList.map((u) => ({
        user_id: u.id,
        pertemuan_id: id,
        isAttending: true,
        waktu_kehadiran: new Date().toISOString(),
      }));

      // Insert batch (gunakan upsert untuk cegah duplikasi)
      await supabase
        .from("kehadiran")
        .insert(insertData, {ignoreDuplicates: true});

      await refreshRegistInAttendance();
      setShowPasswordModal(false);
      setAdminPassword("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat mendaftarkan semua peserta.");
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const handleBulkDeleteAll = async () => {
    setProcessingBulkAction(true);
    setErrorMsg("");

    try {
      const {
        data: {session},
      } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setErrorMsg("Anda belum login.");
        return;
      }

      // Re-authenticate password
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: adminPassword,
      });

      if (signInError) {
        setErrorMsg("Password salah.");
        return;
      }

      // Ambil semua user role 'peserta'
      const {data: pesertaList, error: userError} = await supabase
        .from("user_profile")
        .select("id")
        .eq("role", "peserta");

      if (userError) throw userError;

      const pesertaIds = pesertaList?.map((u) => u.id) || [];
      if (pesertaIds.length === 0) {
        setErrorMsg("Tidak ada peserta ditemukan.");
        return;
      }

      // Hapus semua kehadiran peserta untuk pertemuan ini
      const {error: deleteError} = await supabase
        .from("kehadiran")
        .delete()
        .eq("pertemuan_id", id)
        .in("user_id", pesertaIds);

      if (deleteError) throw deleteError;

      await refreshRegistInAttendance();
      setShowPasswordModal(false);
      setAdminPassword("");
      alert("🗑️ Semua peserta berhasil dihapus dari daftar kehadiran.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat menghapus peserta.");
    } finally {
      setProcessingBulkAction(false);
    }
  };

  const fetchRegistInData = useCallback(
    async (meetingId: string) => {
      try {
        const {data: attendanceData, error: attendanceError} = await supabase
          .from("kehadiran")
          .select("*")
          .eq("pertemuan_id", meetingId);

        if (attendanceError) throw attendanceError;

        const userIds = attendanceData?.map((a) => a.user_id) || [];
        const missingUserIds = userIds.filter((userId) => !users[userId]);
        let newUsersMap: {[key: string]: {name: string}} = {};

        if (missingUserIds.length > 0) {
          const {data: userData, error: userError} = await supabase
            .from("user_profile")
            .select("id, name, nrp")
            .in("id", missingUserIds);

          if (userError) throw userError;

          newUsersMap =
            userData?.reduce((acc, user) => {
              acc[user.id] = {name: user.name, nrp: user.nrp};
              return acc;
            }, {} as {[key: string]: {name: string; nrp?: string}}) || {};

          setUsers((prevUsers) => ({...prevUsers, ...newUsersMap}));
        }

        return attendanceData || [];
      } catch (error) {
        console.error("Error fetching regist in data:", error);
        return [];
      }
    },
    [users]
  );

  const fetchRegistOutData = useCallback(
    async (meetingId: string) => {
      try {
        const {data: registOutData, error: registOutError} = await supabase
          .from("regist_out")
          .select("*")
          .eq("pertemuan_id", meetingId);

        if (registOutError) throw registOutError;

        const userIds = registOutData?.map((a) => a.user_id) || [];
        const missingUserIds = userIds.filter((userId) => !users[userId]);
        let newUsersMap: {[key: string]: {name: string}} = {};

        if (missingUserIds.length > 0) {
          const {data: userData, error: userError} = await supabase
            .from("user_profile")
            .select("id, name, nrp")
            .in("id", missingUserIds);

          if (userError) throw userError;

          newUsersMap =
            userData?.reduce((acc, user) => {
              acc[user.id] = {name: user.name, nrp: user.nrp};
              return acc;
            }, {} as {[key: string]: {name: string; nrp?: string}}) || {};

          setUsers((prevUsers) => ({...prevUsers, ...newUsersMap}));
        }

        return registOutData || [];
      } catch (error) {
        console.error("Error fetching regist out data:", error);
        return [];
      }
    },
    [users]
  );

  const refreshRegistInAttendance = useCallback(async () => {
    if (!id) return;

    try {
      setRefreshing(true);
      const updatedAttendance = await fetchRegistInData(id);

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
  }, [id, fetchRegistInData]);

  const refreshRegistOutAttendance = useCallback(async () => {
    if (!id) return;

    try {
      setRefreshing(true);
      const updatedRegistOut = await fetchRegistOutData(id);

      setMeeting((prev) =>
        prev
          ? {
              ...prev,
              registOutData: updatedRegistOut,
            }
          : null
      );
    } catch (error) {
      console.error("Error refreshing regist out:", error);
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchRegistOutData]);

  const fetchTournamentMatches = useCallback(
    async (meetingId: string) => {
      try {
        const {data: tournamentData, error: tournamentError} = await supabase
          .from("turnamen")
          .select("*")
          .eq("pertemuan_id", meetingId)
          .order("match_ke", {ascending: true});

        if (tournamentError) throw tournamentError;

        const allPlayerIds = [
          ...new Set([
            ...(tournamentData?.map((m) => m.pemain_1_id) || []),
            ...(tournamentData?.map((m) => m.pemain_2_id) || []),
          ]),
        ];

        const missingPlayerIds = allPlayerIds.filter((uid) => !users[uid]);
        let additionalUsersMap: {[key: string]: {name: string}} = {};

        if (missingPlayerIds.length > 0) {
          const {data: additionalUserData, error: additionalUserError} =
            await supabase
              .from("user_profile")
              .select("id, name, nrp")
              .in("id", missingPlayerIds);

          if (additionalUserError) throw additionalUserError;

          additionalUsersMap =
            additionalUserData?.reduce((acc, user) => {
              acc[user.id] = {name: user.name, nrp: user.nrp};
              return acc;
            }, {} as {[key: string]: {name: string; nrp?: string}}) || {};

          setUsers((prev) => ({...prev, ...additionalUsersMap}));
        }

        const allUsersMap = {...users, ...additionalUsersMap};

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

  // Export to Excel functions
  const exportRegistInToExcel = useCallback(() => {
    if (!meeting) return;

    const data = meeting.attendees
      .filter((a) => a.isAttending)
      .map((attendee, index) => ({
        No: index + 1,
        Nama: users[attendee.user_id]?.name || "Unknown",
        NRP: users[attendee.user_id]?.nrp || "Unknown",
        "Waktu Check In": attendee.waktu_kehadiran
          ? new Date(attendee.waktu_kehadiran).toLocaleString("id-ID")
          : "-",
        Status: attendee.isAttending ? "Hadir" : "Tidak Hadir",
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regist In");

    // Set column widths
    const colWidths = [
      {wch: 5}, // No
      {wch: 30}, // Nama
      {wch: 40}, // User ID
      {wch: 20}, // Waktu Check In
      {wch: 15}, // Status
    ];
    ws["!cols"] = colWidths;

    const fileName = `Regist_In_${meeting.judul_pertemuan}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [meeting, users]);

  const exportRegistOutToExcel = useCallback(() => {
    if (!meeting) return;

    const data = meeting.registOutData
      .filter((a) => a.isRegistedOut)
      .map((registOut, index) => ({
        No: index + 1,
        Nama: users[registOut.user_id]?.name || "Unknown",
        NRP: users[registOut.user_id]?.nrp || "Unknown",
        "Waktu Check Out": registOut.waktu_regist_out
          ? new Date(registOut.waktu_regist_out).toLocaleString("id-ID")
          : "-",
        Status: registOut.isRegistedOut ? "Sudah Checkout" : "Belum Checkout",
      }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regist Out");

    // Set column widths
    const colWidths = [
      {wch: 5}, // No
      {wch: 30}, // Nama
      {wch: 40}, // User ID
      {wch: 20}, // Waktu Check Out
      {wch: 15}, // Status
    ];
    ws["!cols"] = colWidths;

    const fileName = `Regist_Out_${meeting.judul_pertemuan}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [meeting, users]);

  // Realtime subscription untuk regist in
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`meeting_${id}_regist_in`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kehadiran",
          filter: `pertemuan_id=eq.${id}`,
        },
        () => {
          refreshRegistInAttendance();
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
    };
  }, [id, refreshRegistInAttendance]);

  // Realtime subscription untuk regist out
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`meeting_${id}_regist_out`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "regist_out",
          filter: `pertemuan_id=eq.${id}`,
        },
        () => {
          refreshRegistOutAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refreshRegistOutAttendance]);

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
          data: {session},
          error: authError,
        } = await supabase.auth.getSession();

        if (!session || authError) {
          setIsUnauthorized(true);
          return;
        }

        const {data: meetingData, error: meetingError} = await supabase
          .from("pertemuan")
          .select("*")
          .eq("id", id)
          .single();

        if (meetingError || !meetingData) {
          throw meetingError || new Error("Meeting not found");
        }

        // Fetch regist in data
        const {data: attendanceData, error: attendanceError} = await supabase
          .from("kehadiran")
          .select("*")
          .eq("pertemuan_id", id);

        if (attendanceError) throw attendanceError;

        // Fetch regist out data
        const {data: registOutData, error: registOutError} = await supabase
          .from("regist_out")
          .select("*")
          .eq("pertemuan_id", id);

        if (registOutError) throw registOutError;

        // Combine all user IDs
        const allUserIds = [
          ...(attendanceData?.map((a) => a.user_id) || []),
          ...(registOutData?.map((a) => a.user_id) || []),
        ];
        const uniqueUserIds = [...new Set(allUserIds)];

        let usersMap: {[key: string]: {name: string; nrp?: string}} = {};
        if (uniqueUserIds.length > 0) {
          const {data: userData, error: userError} = await supabase
            .from("user_profile")
            .select("id, name, nrp")
            .in("id", uniqueUserIds);

          if (userError) throw userError;

          usersMap =
            userData?.reduce((acc, user) => {
              acc[user.id] = {name: user.name, nrp: user.nrp};
              return acc;
            }, {} as {[key: string]: {name: string; nrp?: string}}) || {};
        }

        setUsers(usersMap);

        let matchesData: TournamentMatch[] = [];
        if (meetingData.is_tournament) {
          matchesData = await fetchTournamentMatches(id);
        }

        setMeeting({
          ...meetingData,
          attendees: attendanceData || [],
          registOutData: registOutData || [],
          matches: matchesData,
          is_tournament: meetingData.is_tournament,
        });
      } catch (error) {
        console.error("Error fetching meeting:", error);
        navigate("/admin/dashboard", {replace: true});
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingDetail();
  }, [id, navigate]);

  const handleBack = () => {
    navigate("/admin/dashboard");
  };

  const handleRegistIn = () => setShowRegistInScannerModal(true);
  const handleRegistOut = () => setShowRegistOutScannerModal(true);
  const handleUpdateAttendance = (userId: string, isPresent: boolean) => {
    console.log(`Update attendance for ${userId} to ${isPresent}`);
  };

  return (
    <div className="flex-1 lg:ml-0 bg-[#f5fafd] overflow-x-auto">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-r from-[#0c1015] to-[#0f1028] shadow-lg border-b border-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-[1.125rem]">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-yellow-400 hover:border-slate-500 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-yellow-400 hover:text-yellow-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-sky-50 truncate">
                {meeting ? meeting.judul_pertemuan : "..."}
              </h1>
            </div>

            <div className="flex items-center gap-2 p-2">
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
                <div className="text-sm text-yellow-400 animate-pulse">
                  Updating...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area with Loading Logic */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        {isUnauthorized ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 font-semibold text-lg">Access Denied</p>
            <p className="text-gray-500 mt-2">
              Try logging in first to access this page.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading meeting details...</p>
          </div>
        ) : !meeting ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 font-semibold text-lg">
              Meeting Not Found
            </p>
            <p className="text-gray-500 mt-2">
              The meeting you are looking for does not exist or could not be
              loaded.
            </p>
          </div>
        ) : (
          /* This <></> fragment contains all your existing page content */
          <>
            {/* MOVED Constants: Define them only AFTER we know meeting is not null */}
            {(() => {
              const waktuPertemuan = `${meeting.waktu_mulai} - ${meeting.waktu_selesai}`;
              const registInCount = meeting.attendees.filter(
                (a) => a.isAttending
              ).length;
              const registOutCount = meeting.registOutData.filter(
                (a) => a.isRegistedOut
              ).length;

              return (
                <>
                  {/* Meeting Info */}
                  <div className="bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-xl shadow-lg p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center text-sky-50">
                        <Calendar size={20} className="mr-3 text-[#178be4]" />
                        <div>
                          <p className="text-sm text-slate-400">Date</p>
                          <p className="font-medium">
                            {new Date(meeting.tanggal).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-sky-50">
                        <Clock size={20} className="mr-3 text-[#0bde7b]" />
                        <div>
                          <p className="text-sm text-slate-400">Time</p>
                          <p className="font-medium">{waktuPertemuan}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sky-50">
                        <MapPin size={20} className="mr-3 text-[#FE0081]" />
                        <div>
                          <p className="text-sm text-slate-400">Location</p>
                          <p className="font-medium">{meeting.lokasi}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sky-50">
                        <Users size={20} className="mr-3 text-[#c55efd]" />
                        <div>
                          <p className="text-sm text-slate-400">Participants</p>
                          <p className="font-medium">
                            <span className="text-transparent bg-clip-text bg-gradient-to-tl from-[#44ff6f] to-[#b3ffe5]">
                              {registInCount}
                            </span>{" "}
                            entries /
                            <span className="text-transparent bg-clip-text bg-gradient-to-tl from-[#f93434] to-[#ff76a4]">
                              {" "}
                              {registOutCount}
                            </span>{" "}
                            exits
                          </p>
                        </div>
                      </div>
                    </div>
                    {meeting.deskripsi && (
                      <div className="mt-4 pt-4 border-t border-slate-600">
                        <p className="text-gray-200">{meeting.deskripsi}</p>
                      </div>
                    )}
                  </div>

                  {/* Tabs untuk Tournament */}
                  {meeting.is_tournament && (
                  <div className="bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-full shadow-lg mb-8 max-w-xl mx-auto p-1">
                    <nav className="flex w-full">
                      <button
                        onClick={() => handleTabChange("attendance")}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-l-full transition-all
                          ${
                            activeTab === "attendance"
                              ? "bg-gradient-to-tl from-[#ffda21] to-[#f6fb67] text-[#0b2241] shadow-md"
                              : "text-gray-400 hover:text-white hover:bg-blue-950/30"
                          }`}
                      >
                        <UserCheck size={18} />
                        Attendance
                      </button>

                      <button
                        onClick={() => handleTabChange("matches")}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-r-full transition-all
                          ${
                            activeTab === "matches"
                              ? "bg-gradient-to-tl from-[#ffda21] to-[#f6fb67] text-[#0b2241] shadow-md"
                              : "text-gray-400 hover:text-white hover:bg-blue-950/30"
                          }`}
                      >
                        <Trophy size={18} />
                        Matches
                      </button>
                    </nav>
                  </div>

                  )}

                  {/* Dual Pane Layout untuk Attendance */}
                  {(!meeting.is_tournament || activeTab === "attendance") && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Regist In Pane */}
                      <div className="bg-[#f5fafd] rounded-xl shadow-lg flex flex-col h-full transition-all border border-slate-400">
                        <div className="bg-gradient-to-b from-[#0c1015] to-[#2f3048] p-4 rounded-t-xl flex-shrink-0">
                          <div className="flex items-center justify-between gap-2 overflow-x-auto">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <LogIn size={20} className="text-[#0bde7b]" />
                              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-tl from-[#44ff6f] to-[#b3ffe5]">
                                Regist In
                              </h3>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={exportRegistInToExcel}
                                className="flex items-center gap-2 p-2 border border-[#01b82c] bg-gradient-to-tl from-[#01b856] to-transparent text-[#fefff9] rounded-lg hover:bg-[#29ffb8] transition-colors text-sm"
                                disabled={registInCount === 0}
                              >
                                <Download size={16} />
                                <span className="hidden sm:inline">Export</span>
                              </button>
                              <button
                                onClick={handleRegistIn}
                                className="flex items-center p-2 border border-[#150de7] text-[#fefff9] bg-gradient-to-tl from-[#0032a8] to-transparent rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <QrCode size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setBulkActionType("insert");
                                  setShowPasswordModal(true);
                                }}
                                className="flex items-center p-2 border border-[#b625ff] text-[#fefff9] bg-opacity bg-gradient-to-tl from-[#2700a8] to-transparent rounded-lg hover:bg-purple-700 transition-colors text-sm"
                              >
                                <UserCheck size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setBulkActionType("delete");
                                  setShowPasswordModal(true);
                                }}
                                className="flex items-center p-2 border border-[#da0000] text-[#fefff9] bg-gradient-to-tl from-[#850000] to-transparent rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                          <CheckInData
                            attendees={meeting.attendees}
                            onScanQR={handleRegistIn}
                            onUpdateAttendance={handleUpdateAttendance}
                            users={users}
                          />
                        </div>
                      </div>

                      {/* Regist Out Pane */}
                      <div className="bg-[#f5fafd] rounded-xl shadow-lg flex flex-col h-fit transition-all duration-30 border border-slate-400">
                        <div className="bg-gradient-to-b from-[#0c1015] to-[#2f3048] p-4 rounded-t-xl flex-shrink-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <LogOut size={20} className="text-[#ff7777]" />
                              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-tl from-[#ff3d3d] to-[#ffa5c3]">
                                Regist Out
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={exportRegistOutToExcel}
                                className="flex items-center gap-2 p-2 border border-[#01b82c] bg-gradient-to-tl from-[#01b856] to-transparent text-[#fefff9] rounded-lg hover:bg-[#29ffb8] transition-colors text-sm"
                                disabled={registOutCount === 0}
                              >
                                <Download size={16} />
                                <span className="hidden sm:inline">Export</span>
                              </button>
                              <button
                                onClick={handleRegistOut}
                                className="flex items-center p-2 border border-[#150de7] text-[#fefff9] bg-gradient-to-tl from-[#0032a8] to-transparent rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                <QrCode size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                          <CheckOutData
                            attendees={meeting.registOutData}
                            onScanQR={handleRegistOut}
                            onUpdateAttendance={handleUpdateAttendance}
                            users={users}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match Recap untuk Tournament */}
                  {meeting.is_tournament && activeTab === "matches" && (
                    <div className="w-full">
                      <RoundsCard pertemuanId={id || ""} />
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Scanner Modals */}
      <OpenRegistInScannerCamera
        isOpen={showRegistInScannerModal}
        onClose={() => {
          setShowRegistInScannerModal(false);
          refreshRegistInAttendance();
        }}
        pertemuanId={id || ""}
      />

      <OpenRegistOutScannerCamera
        isOpen={showRegistOutScannerModal}
        onClose={() => {
          setShowRegistOutScannerModal(false);
          refreshRegistOutAttendance();
        }}
        pertemuanId={id || ""}
      />

{showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            {/* --- New Header --- */}
            <div className="bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-t-2xl flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                {/* Dynamic Icon */}
                <div className={bulkActionType === 'insert' ? "text-purple-400" : "text-red-500"}>
                  {bulkActionType === 'insert' ? (
                    <UserCheck size={24} />
                  ) : (
                    <Trash2 size={24} />
                  )}
                </div>
                {/* Dynamic Title */}
                <h2 className={`ml-3 text-xl font-bold text-transparent bg-clip-text ${
                  bulkActionType === 'insert'
                    ? 'bg-gradient-to-tl from-[#8b5cf6] to-[#d685ff]'
                    : 'bg-gradient-to-tl from-[#ff3f3f] to-[#ff4b87]'
                }`}>
                  {bulkActionType === "insert"
                    ? "Check In All Participants"
                    : "Delete All Participants"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setAdminPassword("");
                  setErrorMsg("");
                }}
                className="text-sky-50 hover:text-sky-100 p-1"
                disabled={processingBulkAction}
              >
                <X size={20} />
              </button>
            </div>

            {/* --- New Content Area --- */}
            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}
              
              <p className="text-gray-700">
                Enter admin password to confirm. This action cannot be undone.
              </p>

              {/* Password Input */}
              <input
                type="password"
                placeholder="Enter Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* --- New Buttons --- */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setAdminPassword("");
                    setErrorMsg("");
                  }}
                  disabled={processingBulkAction}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    bulkActionType === "insert"
                      ? handleBulkInsertAll()
                      : handleBulkDeleteAll()
                  }
                  disabled={processingBulkAction}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center ${
                    bulkActionType === 'insert'
                      ? 'bg-gradient-to-tl from-[#2700a8] to-[#d685ff] hover:opacity-90'
                      : 'bg-gradient-to-tl from-[#da0000] to-[#ff4b87] hover:opacity-90'
                  } disabled:opacity-50`}
                >
                  {processingBulkAction ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
