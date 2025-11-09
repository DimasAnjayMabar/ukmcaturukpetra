import React, { createContext, useContext } from 'react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nrp: string;
}

interface AdminLayoutContextType {
  toggleSidebar: () => void;
  userProfile: UserProfile | null;
}

export const AdminLayoutContext = createContext<AdminLayoutContextType>({
  toggleSidebar: () => {},
  userProfile: null,
});

export const useAdminLayout = () => useContext(AdminLayoutContext);