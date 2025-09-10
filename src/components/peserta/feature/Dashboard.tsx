import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiCode, FiAward, FiList, FiLogOut, FiUser, FiClock } from 'react-icons/fi';
import { supabase } from '../../../db_client/client';
import { ErrorModal } from '../../error_modal/ErrorModal';
import Scoreboard from './Scoreboard';
import AttendanceList from './DaftarKehadiran';
import QrCodePeserta from './QrCodePeserta';
import { LogoutModal } from '../logout_modal/LogoutModal';
import { UserProfile } from '../../../types';
import ChessClock from './ChessClock';

interface DashboardLayoutProps {
  user: {
    name: string;
    email: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DashboardPeserta: React.FC<DashboardLayoutProps> = ({ user }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeContent, setActiveContent] = useState('Absensi'); // Changed from 'QR Code' to 'Absensi'
  const [showAuthError, setShowAuthError] = useState(false);
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (!session || authError) {
        setShowAuthError(true); // Tampilkan modal error
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profile')
        .select('name, nrp, email, role, total_score')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setShowAuthError(true);
        return;
      }

      if (profileData) {
        // Periksa apakah role adalah 'peserta'
        if (profileData.role !== 'peserta') {
          console.error('Access denied: User role is not peserta');
          setShowAuthError(true);
          return;
        }
        
        setUserProfile(profileData as UserProfile);
      } else {
        setShowAuthError(true);
        return;
      }

      // Blok navigasi back
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function() {
        window.history.pushState(null, '', window.location.href);
      };
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    checkAuthAndFetchData();
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.onpopstate = null;
    };
  }, []); // Hapus navigate dari dependency array

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    setIsLogoutModalOpen(true)
  };

  const handleAuthErrorClose = () => {
    setShowAuthError(false);
    navigate('/peserta/login'); // Redirect setelah modal ditutup
  };

  const menuItems = [
    {
      name: 'Absensi',
      icon: <FiCode className="mr-3" size={20} />,
      component: <QrCodePeserta />,
    },
    {
      name: 'Scoreboard',
      icon: <FiAward className="mr-3" size={20} />,
      component: <Scoreboard />,
    },
    {
      name: 'Daftar Kehadiran',
      icon: <FiList className="mr-3" size={20} />,
      component: <AttendanceList />,
    },

    {
      name: 'Chess Clock',
      icon: <FiClock className="mr-3" size={20} />,
      component: <ChessClock />,
    },

  ];

  const activeComponent = menuItems.find(item => item.name === activeContent)?.component;

  return (
    <>
      {/* Error Modal */}
      <ErrorModal
        isOpen={showAuthError}
        onClose={handleAuthErrorClose}
        customMessage="Akses ditolak. Anda tidak memiliki izin untuk mengakses dashboard peserta."
        errorType="other"
      />

      {/* Main Content */}
      {!showAuthError && (
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar Backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
              onClick={toggleSidebar}
            ></div>
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4">
                <h1 className="text-xl font-bold text-blue-600">Dashboard Peserta</h1>
                <button
                  onClick={toggleSidebar}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center border-b p-4">
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <FiUser size={20} />
                </div>
                <div>
                  <p className="font-medium">{userProfile?.name || 'Nama Peserta'}</p>
                  <p className="text-sm text-gray-500">NRP: {userProfile?.nrp || '00000000'}</p>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => {
                          setActiveContent(item.name);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg p-3 text-left transition-colors ${
                          activeContent === item.name
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Logout Button */}
              <div className="border-t p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-lg p-3 text-red-600 transition-colors hover:bg-red-50"
                >
                  <FiLogOut className="mr-3" size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Navigation */}
            <header className="flex items-center justify-between border-b bg-white p-4">
              <button
                onClick={toggleSidebar}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <FiMenu size={20} />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">{activeContent}</h1>
              <div className="w-6"></div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeComponent}
            </main>
          </div>
        </div>
      )}

       <LogoutModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
        />
    </>
  );
};

export default DashboardPeserta;