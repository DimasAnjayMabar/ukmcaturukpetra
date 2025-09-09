import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { supabase } from '../../../db_client/client';
import { UserProfile } from '../../../types';

interface NavbarProps {
  className?: string;
  isLoggedIn?: boolean;
  userProfile?: UserProfile | null;
  onNavigateToSection?: (sectionId: string) => void;
}

export default function Navbar({ className = '', isLoggedIn = false, userProfile, onNavigateToSection }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    window.location.reload();
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isScrolled ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 group z-10">
            <img
              src="/svg/chess logo.svg"
              alt="UKM Chess Logo"
              className={`transition-all duration-200 group-hover:scale-105 ${
                isScrolled ? 'h-8 md:h-9' : 'h-8 md:h-10'
              }`}
            />
            <span className={`font-bold text-gray-900 tracking-tight transition-all duration-200 ${
              isScrolled ? 'text-xl md:text-xl' : 'text-xl md:text-2xl'
            }`}>
              UKM CHESS
            </span>
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
                      onClick={handleLogout}
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

          {/* Mobile View - Hanya tombol login/user profile */}
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
                      onClick={handleLogout}
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

        {/* Hapus mobile menu untuk navigasi section karena sudah ada FAB */}
      </div>
    </nav>
  );
}