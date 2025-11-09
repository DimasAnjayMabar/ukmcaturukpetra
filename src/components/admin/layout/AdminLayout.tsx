import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminLayoutContext } from './AdminLayoutContext';
import { AdminSidebar } from './AdminSidebar';
import { LogoutModal } from '../logout_modal/LogoutModal';
import { ErrorModal } from '../../error_modal/ErrorModal';
import { supabase } from '../../../db_client/client';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nrp: string;
}

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const navigate = useNavigate();

  // handles auth-checking for ALL admin pages
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (!session || authError) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      await fetchUserProfile(session.user.id);
      setIsLoading(false);

      // block back navigation
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, '', window.location.href);
      };
    };

    checkAuthAndFetchData();

    return () => {
      // cleanup
      window.onpopstate = null;
    };
  }, []);

  // fetch user prof data
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', userId)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        setIsUnauthorized(true);
        return;
      }
      setUserProfile(data);
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      setIsUnauthorized(true);
    }
  };

  // renders
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // value to pass down to all child pages
    const contextValue = {
        toggleSidebar: () => setIsSidebarOpen(prev => !prev),
        userProfile: userProfile,
    };

  return (
    <AdminLayoutContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar
          userProfile={userProfile}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogoutClick={() => setIsLogoutModalOpen(true)}
        />

        <Outlet />
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </AdminLayoutContext.Provider>
  );
};