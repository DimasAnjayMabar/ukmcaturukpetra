import { Calendar, DoorOpen, Plus, Trophy, Swords } from 'lucide-react';
import { MeetingCard } from './MeetingCard';
import { AddMeetingModal } from './AddMeetingModal';
import { useEffect, useState } from 'react';
import { LogoutModal } from '../logout_modal/LogoutModal';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';
import { useNavigate } from 'react-router-dom';
import { Pertemuan } from '../../../types';
import { EditMeetingModal } from './EditMeetingModal';
import { DeleteMeetingModal } from './DeleteMeetingModal';
import Matchmaking from './Matchmaking';

function Dashboard() {
  const [meetings, setMeetings] = useState<Pertemuan[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'meetings' | 'matchmaking'>('meetings');

  // SEMUA FUNGSI AKSES DATABASE

  // Cek autentikasi dan load pengambilan data
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (!session || authError) {
        setIsUnauthorized(true);
        return;
      }

      await fetchMeetings();
      setupRealTimeSubscription(); // Setup real-time subscription

      // Blok navigasi back
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function() {
        window.history.pushState(null, '', window.location.href);
      };
    };

    checkAuthAndFetchData();

    return () => {
      // Bersihkan event listener saat komponen unmount
      window.onpopstate = null;
      // Cleanup real-time subscription
      supabase.removeAllChannels();
    };
  }, []);

  // Setup Real-time Subscription
  const setupRealTimeSubscription = () => {
    const channel = supabase
      .channel('pertemuan_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'pertemuan'
        },
        (payload) => {
          console.log('Real-time change detected:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              // Tambah pertemuan baru ke state
              setMeetings((prev) => [...prev, payload.new as Pertemuan]);
              break;
              
            case 'UPDATE':
              // Update pertemuan yang sudah ada
              setMeetings((prev) =>
                prev.map((meeting) =>
                  meeting.id === payload.new.id
                    ? { ...meeting, ...payload.new }
                    : meeting
                )
              );
              break;
              
            case 'DELETE':
              // Hapus pertemuan dari state
              setMeetings((prev) =>
                prev.filter((meeting) => meeting.id !== payload.old.id)
              );
              break;
              
            default:
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time changes');
        }
      });

    return channel;
  };

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
      
      const { data: pertemuanData, error: pertemuanError } = await supabase
        .from("pertemuan")
        .select("*")
        .order('id', { ascending: false }); // Urutkan berdasarkan waktu dibuat

      if (pertemuanError) throw pertemuanError;

      setMeetings(pertemuanData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pertemuan');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

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
  const handleDeleteSuccess = () => {
    // Real-time subscription akan handle update UI
    console.log('Delete successful - UI will update via real-time subscription');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Trophy className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Kegiatan Catur</h1>
                <p className="text-gray-600">Kelola pertemuan dan turnamen catur</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={20} />
                Tambah Pertemuan
              </button>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <DoorOpen size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('meetings')}
            className={`py-2 px-4 rounded-lg font-medium flex items-center gap-2 ${activeView === 'meetings' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <Calendar size={20} />
            Daftar Pertemuan
          </button>
          <button
            onClick={() => setActiveView('matchmaking')}
            className={`py-2 px-4 rounded-lg font-medium flex items-center gap-2 ${activeView === 'matchmaking' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <Swords size={20} />
            Matchmaking
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'meetings' ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800">Daftar Pertemuan</h2>
            </div>
            
            {meetings.length > 0 ? (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <Calendar size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Belum ada pertemuan</h3>
                <p className="text-gray-500 mb-6">Mulai dengan menambahkan pertemuan pertama Anda</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  Tambah Pertemuan
                </button>
              </div>
            )}
          </div>
        ) : (
          <Matchmaking />
        )}
      </div>
        
      {/* Add Meeting Modal */}
      <AddMeetingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onError={setError}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
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
