import {
  Calendar,
  Plus,
  Menu,
  Users
} from "lucide-react";
import {MeetingCard} from "./MeetingCard";
import {AddMeetingModal} from "./AddMeetingModal";
import {useEffect, useState} from "react";
import {supabase} from "../../../db_client/client";
import {ErrorModal} from "../../error_modal/ErrorModal";
import {useNavigate} from "react-router-dom";
import {Pertemuan} from "../../../types";
import {EditMeetingModal} from "./EditMeetingModal";
import {DeleteMeetingModal} from "./DeleteMeetingModal";
import Matchmaking from "./Matchmaking";
import { useAdminLayout } from "../layout/AdminLayoutContext";

function Dashboard() {
  const [meetings, setMeetings] = useState<Pertemuan[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  // const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"meetings" | "matchmaking">(
    "meetings"
  );
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Add state for user profile
  const { toggleSidebar } = useAdminLayout();

useEffect(() => {
    const fetchData = async () => {
      // Auth check is ALREADY DONE by AdminLayout
      // User profile is ALREADY FETCHED by AdminLayout

      // Just fetch meetings and setup real-time
      await fetchMeetings();

      // Setup real-time subscription
      const channel = setupRealTimeSubscription();

      return channel; // Return channel for cleanup
    };

    const subscriptionPromise = fetchData();

    return () => {
      // Cleanup real-time subscription
      subscriptionPromise.then((channel) => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, []); // Rerunning fetchMeetings is not needed here

  // Setup Real-time Subscription
  const setupRealTimeSubscription = () => {
    try {
      const channel = supabase
        .channel("pertemuan_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pertemuan",
          },
          (payload) => {
            console.log("Real-time change detected:", payload);

            switch (payload.eventType) {
              case "INSERT":
                setMeetings((prev) => {
                  const newMeeting = payload.new as Pertemuan;
                  // Avoid duplicates
                  if (prev.some((meeting) => meeting.id === newMeeting.id)) {
                    return prev;
                  }
                  return [newMeeting, ...prev];
                });
                break;

              case "UPDATE":
                setMeetings((prev) =>
                  prev.map((meeting) =>
                    meeting.id === (payload.new as Pertemuan).id
                      ? {...meeting, ...payload.new}
                      : meeting
                  )
                );
                break;

              case "DELETE":
                setMeetings((prev) =>
                  prev.filter(
                    (meeting) => meeting.id !== (payload.old as {id: string}).id
                  )
                );
                break;

              default:
                console.log("Unhandled event type:", payload.eventType);
                break;
            }
          }
        )
        .subscribe((status, error) => {
          console.log("Subscription status:", status);
          if (status === "SUBSCRIBED") {
            console.log("Successfully subscribed to real-time changes");
          }
          if (error) {
            console.error("Subscription error:", error);
            // Optionally retry subscription after delay
            setTimeout(() => {
              setupRealTimeSubscription();
            }, 3000);
          }
        });

      return channel;
    } catch (error) {
      console.error("Error setting up real-time subscription:", error);
      return null;
    }
  };

  if (error) {
    return (
      <ErrorModal
        isOpen={true}
        onClose={() => setError(null)}
        customMessage={error}
        errorType="other"
      />
    );
  }

  // Mengambil semua meeting dari database
  const fetchMeetings = async () => {
    try {
      setIsLoading(true);

      const {data: pertemuanData, error: pertemuanError} = await supabase
        .from("pertemuan")
        .select("*")
        .order("id", {ascending: false}); // Urutkan berdasarkan waktu dibuat

      if (pertemuanError) throw pertemuanError;

      setMeetings(pertemuanData || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pertemuan"
      );
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };


  // Edit pertemuan
  const handleEditClick = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setIsEditModalOpen(true);
  };

  // Delete pertemuan
  const handleDeleteClick = (meetingId: string) => {
    setMeetingToDelete(meetingId);
    setIsDeleteModalOpen(true);
  };

  // Tidak perlu lagi fetchMeetings() setelah delete/edit berhasil
  // karena real-time subscription akan handle update otomatis
  // Fix this function in Dashboard.tsx
  const handleDeleteSuccess = () => {
    // Force a refresh of meetings data
    fetchMeetings();

    // Or manually remove from state as backup
    if (meetingToDelete) {
      setMeetings((prev) =>
        prev.filter((meeting) => meeting.id !== meetingToDelete)
      );
    }

    // Reset the meetingToDelete state
    setMeetingToDelete(null);
  };

  const handleDeleteError = (errorMessage: string) => {
    setDeleteError(errorMessage);
  };

  const handleEditError = (errorMessage: string) => {
    setEditError(errorMessage);
  };

  // Lihat detail pertemuan
  const handleViewDetails = (meetingId: string) => {
    navigate(`/admin/pertemuan/${meetingId}`);
  };

  return (
    <div className="flex-1 lg:ml-0 bg-[#f5fafd]">
        {/* Top Header (Mobile) */}
        <div className="block md:hidden sticky top-0 z-30 bg-gradient-to-r from-[#0c1015] to-[#1f2038] shadow-lg border-b border-slate-600">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-yellow-400 hover:border hover:border-slate-500 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>

              <div className="lg:hidden text-center p-2">
                <h1 className="text-xl font-bold">
                  <span className="text-white">Admin</span>{' '}
                  <span className="text-yellow-500 mx-2">|</span>
                  <span className="text-yellow-400">UKM Catur</span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {activeView === "meetings" ? (
            <div className="space-y-6">
              <div className="text-start border-b border-slate-500">
                <h2 className="text-lg md:text-xl font-bold text-black p-2 mb-4">
                  Meetings
                </h2>
              </div>

              {isLoading ? (
                <div className="text-center py-8 md:py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  {/* <p className="text-gray-600">Loading data...</p> */}
                </div>
              ) : meetings.length > 0 ? (
                <div className="p-4 md:p-6 rounded-xl shadow-lg border border-slate-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {meetings.map((meeting) => (
                      <MeetingCard
                        key={meeting.id}
                        meeting={meeting}
                        onEditClick={handleEditClick}
                        onDeleteClick={handleDeleteClick}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 md:py-12 bg-white rounded-xl shadow-lg">
                  <Calendar
                    size={48}
                    className="mx-auto mb-3 md:mb-4 text-gray-300"
                  />
                  <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">
                    Belum ada pertemuan
                  </h3>
                  <p className="text-gray-500 text-sm md:text-base mb-4 md:mb-6">
                    Mulai dengan menambahkan pertemuan pertama Anda
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Matchmaking />
          )}
        </div>

      {activeView === "meetings" && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-6 right-6 bg-yellow-400 hover:bg-yellow-500 text-black p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10 flex items-center justify-center"
          aria-label="Tambah Pertemuan"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Add Meeting Modal */}
      <AddMeetingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onError={setError}
      />

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedMeetingId(null);
        }}
        setMeetings={setMeetings}
        meetingId={selectedMeetingId}
        onError={handleEditError}
      />

      <DeleteMeetingModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        meetingId={meetingToDelete}
        onDeleteSuccess={handleDeleteSuccess}
        onError={handleDeleteError}
      />

      {/* Error Modals */}
      {editError && (
        <ErrorModal
          isOpen={true}
          onClose={() => setEditError(null)}
          customMessage={editError}
          errorType="other"
        />
      )}

      {deleteError && (
        <ErrorModal
          isOpen={true}
          onClose={() => setDeleteError(null)}
          customMessage={deleteError}
          errorType="other"
        />
      )}
    </div>
  );
}

export default Dashboard;
