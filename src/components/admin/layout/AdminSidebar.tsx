import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import { FiLogOut, FiUser } from 'react-icons/fi';

const navItems = [
  { id: 'dashboard', label: 'Meetings', icon: Users, path: '/admin/dashboard' },
  // { id: 'pairing', label: 'Pairing', icon: Swords, path: '/admin/pairing/123' },
];

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  nrp: string;
}

interface AdminSidebarProps {
  userProfile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLogoutClick: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  userProfile,
  isOpen,
  onClose,
  onLogoutClick,
}) => {
  const location = useLocation();

  return (
    <>
    {/* sidebar Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* side Navbar */}
      <div
        className={`
          border-r border-gray-600 fixed lg:sticky lg:top-0 inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-[#0c1015] to-[#1f2038] shadow-lg transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          lg:inset-y-auto lg:h-screen lg:flex-shrink-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* header */}
          <div className="p-4 border-b border-gray-600">
            <div className="flex items-center gap-3 mt-4 mb-3">
              <div className="bg-yellow-400 p-2 rounded-full">
                <Trophy className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  <span className="text-white">Admin</span>{' '}
                  <span className="text-yellow-500 mx-1">|</span>
                  <span className="text-yellow-400">CATUR</span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center border-b border-gray-600 p-4">
            <div className="mr-3 flex h-10 w-10 items-center border border-gray-600 justify-center rounded-full text-yellow-400">
                <FiUser size={20} />
            </div>
            <div>
              <p className="font-medium text-sky-50">
                {userProfile?.name || 'Nama Peserta'}
              </p>
              <p className="text-sm text-gray-500">
                NRP: {userProfile?.nrp || '00000000'}
              </p>
            </div>
          </div>

          <nav className="flex-1">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left align-center transition-colors ${
                        isActive
                          ? 'bg-gradient-to-r from-[#0c1015] to-[#1f2038] text-gray-200 border-b border-gray-600'
                          : 'text-white border-b border-gray-600'
                      }`}
                    >
                      <Icon size={20} className="text-[#B1C2D8]" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-gray-600 p-4">
            <button
              onClick={onLogoutClick}
              className="border border-red-600 flex w-full items-center rounded-lg p-3 text-red-600 transition-colors duration-200 hover:bg-[#FE0031] hover:text-white"
            >
              <FiLogOut className="mr-3" size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};