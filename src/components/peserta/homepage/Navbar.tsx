import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, LogOut, AlertCircle } from 'lucide-react';
import { supabase } from '../../../db_client/client';
import { UserProfile } from '../../../types';

interface NavbarProps {
  className?: string;
  isLoggedIn?: boolean;
  userProfile?: UserProfile | null;
  onNavigateToSection?: (sectionId: string) => void;
}

export default function Navbar({ className = '', isLoggedIn = false, userProfile, onNavigateToSection }: NavbarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);


  const scrollToSection = (sectionId: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    } else {
      if (sectionId === 'hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMobileMenuOpen(false);
        return;
      }

      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
    setShowLogoutConfirm(false);
    window.location.reload();
  };

  const openLogoutConfirm = () => {
    setShowLogoutConfirm(true);
    setShowUserMenu(false);
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        } ${className}`}
      >
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 group z-10">
              <img
                src="/png/chess-logo.png"
                alt="UKM Chess Logo"
                className={`transition-all duration-200 group-hover:scale-105 h-8 md:h-10`}
              />
              <div className={`font-spekk tracking-tight flex items-center transition-all duration-200 text-xl md:text-2xl`}>
                <span className="font-bold bg-gradient-to-t from-[#ffffff] to-[#ffffff] bg-clip-text text-transparent">
                  UKM
                </span>
                <span className="bg-gradient-to-t from-yellow-500 via-yellow-500 to-yellow-500 bg-clip-text text-transparent mx-2">
                  |
                </span>
                <span className="bg-gradient-to-t from-[#ffffff] to-[#ffffff] bg-clip-text text-transparent">
                  CATUR
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-4 z-10">
              {isLoggedIn && userProfile ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 text-sm">{userProfile.name}</p>
                      <p className="text-xs text-gray-500">NRP: {userProfile.nrp}</p>
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-900">{userProfile.name}</p>
                        <p className="text-sm text-gray-500"> NRP : {userProfile.nrp}</p>
                        <p className="text-xs text-gray-400">Score: {userProfile.total_score || 0}</p>
                      </div>
                      <button
                        onClick={openLogoutConfirm}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/peserta/login"
                  className="px-6 py-2.5 bg-[#EAC11F] text-black rounded-full font-medium hover:bg-[#d4a91a] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Login
                </Link>
              )}
            </div>

            <div className="md:hidden flex items-center">
              {isLoggedIn && userProfile ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-medium text-gray-900 text-sm">{userProfile.name}</p>
                        <p className="text-xs text-gray-500">NRP: {userProfile.nrp}</p>
                      </div>
                      <button
                        onClick={openLogoutConfirm}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/peserta/login"
                  className="px-4 py-2 bg-[#EAC11F] text-black rounded-full font-medium hover:bg-[#d4a91a] transition-all duration-200 shadow-md text-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold">Konfirmasi Logout</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin keluar dari akun Anda?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}