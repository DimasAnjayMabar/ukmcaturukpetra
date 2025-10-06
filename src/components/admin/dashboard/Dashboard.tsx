import { Calendar, DoorOpen, Plus, Trophy, Swords, Menu, X } from 'lucide-react';
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
import { FiLogOut, FiUser } from 'react-icons/fi';

// Add interface for user profile
interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nrp: string;
}

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Add state for user profile

  // SEMUA FUNGSI AKSES DATABASE

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (!session || authError) {
        setIsUnauthorized(true);
        return;
      }

      // Fetch user profile data first
      await fetchUserProfile(session.user.id);
      
      // Then fetch meetings and setup real-time
      await fetchMeetings();
      
      // Setup real-time subscription after initial data load
      const channel = setupRealTimeSubscription();

      // Blok navigasi back
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function() {
        window.history.pushState(null, '', window.location.href);
      };

      return channel; // Return channel for cleanup
    };

    const subscriptionPromise = checkAuthAndFetchData();

    return () => {
      // Bersihkan event listener saat komponen unmount
      window.onpopstate = null;
      
      // Cleanup real-time subscription properly
      subscriptionPromise.then(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    };
  }, []);

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', userId)
        .eq('role', 'admin')
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
    }
  };

  // Setup Real-time Subscription
  const setupRealTimeSubscription = () => {
    try {
      const channel = supabase
        .channel('pertemuan_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pertemuan'
          },
          (payload) => {
            console.log('Real-time change detected:', payload);
            
            switch (payload.eventType) {
              case 'INSERT':
                setMeetings((prev) => {
                  const newMeeting = payload.new as Pertemuan;
                  // Avoid duplicates
                  if (prev.some(meeting => meeting.id === newMeeting.id)) {
                    return prev;
                  }
                  return [newMeeting, ...prev];
                });
                break;
                
              case 'UPDATE':
                setMeetings((prev) =>
                  prev.map((meeting) =>
                    meeting.id === (payload.new as Pertemuan).id
                      ? { ...meeting, ...payload.new }
                      : meeting
                  )
                );
                break;
                
              case 'DELETE':
                setMeetings((prev) =>
                  prev.filter((meeting) => meeting.id !== (payload.old as { id: string }).id)
                );
                break;
                
              default:
                console.log('Unhandled event type:', payload.eventType);
                break;
            }
          }
        )
        .subscribe((status, error) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time changes');
          }
          if (error) {
            console.error('Subscription error:', error);
            // Optionally retry subscription after delay
            setTimeout(() => {
              setupRealTimeSubscription();
            }, 3000);
          }
        });

      return channel;
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return null;
    }
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
  // Fix this function in Dashboard.tsx
  const handleDeleteSuccess = () => {
    // Force a refresh of meetings data
    fetchMeetings();
    
    // Or manually remove from state as backup
    if (meetingToDelete) {
      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingToDelete));
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

  // Navigasi item
  const navItems = [
    { id: 'meetings', label: 'Daftar Pertemuan', icon: Calendar },
    { id: 'matchmaking', label: 'Matchmaking', icon: Swords },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Side Navbar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Trophy className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Catur</h1>
                <p className="text-gray-600 text-sm">Kelola pertemuan catur</p>
              </div>
            </div>
          </div>

           {/* User Profile Section */}
           <div className="flex items-center border-b p-4">
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <FiUser size={20} />
                          </div>
                          <div>
                            <p className="font-medium">{userProfile?.name || 'Nama Peserta'}</p>
                            <p className="text-sm text-gray-500">NRP: {userProfile?.nrp || '00000000'}</p>
                          </div>
                        </div>
                        
          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveView(item.id as 'meetings' | 'matchmaking');
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        activeView === item.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="border-t p-4">
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex w-full items-center rounded-lg p-3 text-red-600 transition-colors hover:bg-red-50"
            >
              <FiLogOut className="mr-3" size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu size={24} />
              </button>
              
              <div className="lg:hidden text-center">
                <h1 className="text-xl font-bold text-gray-800">Admin Kegiatan Catur</h1>
              </div>
              
              <div className="w-10 lg:hidden"></div> {/* Spacer for mobile */}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {activeView === 'meetings' ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg md:text-xl font-bold text-gray-800">Daftar Pertemuan</h2>
              </div>
              
              {meetings.length > 0 ? (
                <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
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
                  <Calendar size={48} className="mx-auto mb-3 md:mb-4 text-gray-300" />
                  <h3 className="text-base md:text-lg font-medium text-gray-600 mb-2">Belum ada pertemuan</h3>
                  <p className="text-gray-500 text-sm md:text-base mb-4 md:mb-6">Mulai dengan menambahkan pertemuan pertama Anda</p>
                </div>
              )}
            </div>
          ) : (
            <Matchmaking />
          )}
        </div>
      </div>

      {/* FAB - Floating Action Button (only shown in meetings view) */}
      {activeView === 'meetings' && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10 flex items-center justify-center"
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