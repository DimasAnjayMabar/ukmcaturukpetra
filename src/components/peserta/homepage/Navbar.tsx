import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, AlertCircle, Menu, X } from 'lucide-react';
import { supabase } from '../../../db_client/client';
import { UserProfile } from '../../../types';

interface NavbarProps {
  className?: string;
  isLoggedIn?: boolean;
  userProfile?: UserProfile | null;
  onNavigateToSection?: (sectionId: string) => void;
  isPesertaFeaturesPage?: boolean; // 👈 new prop to detect Peserta Features page
}

export default function Navbar({
  className = '',
  isLoggedIn = false,
  userProfile,
  onNavigateToSection,
  isPesertaFeaturesPage = false,
}: NavbarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      setIsHidden(currentScrollY > lastScrollY && currentScrollY > 100);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  const scrollToSection = (sectionId: string) => {
    if (onNavigateToSection) onNavigateToSection(sectionId);
    else {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 group z-10">
              <img
                src="/png/chess-logo.png"
                alt="UKM Chess Logo"
                className="transition-all duration-200 group-hover:scale-105 h-8 md:h-10"
              />
              <div className="font-spekk tracking-tight flex items-center text-xl md:text-2xl">
                <span className="font-bold text-white">UKM</span>
                <span className="text-yellow-500 mx-2">|</span>
                <span className="text-white">CATUR</span>
              </div>
            </Link>

            {/* desktop navlinks */}
            {!isPesertaFeaturesPage && (
              <div className="relative hidden md:flex items-center justify-center flex-1 mx-32 py-4">
                <div className="flex items-center justify-center w-full">
                  <button
                    onClick={() => scrollToSection('visi')}
                    className="px-4 text-white font-semibold uppercase tracking-wider text-xs hover:text-yellow-400 transition-colors"
                  >
                    Vision
                  </button>

                  <div className="flex-1 h-[2px] bg-yellow-400" />

                  <button
                    onClick={() => scrollToSection('misi')}
                    className="px-4 text-white font-semibold uppercase tracking-wider text-xs hover:text-yellow-400 transition-colors"
                  >
                    Mission
                  </button>

                  <div className="flex-1 h-[2px] bg-yellow-400" />

                  <img
                    src="/webp/bella-mascot.webp"
                    alt="Bella Mascot"
                    className="h-12 w-auto mx-4"
                  />

                  <div className="flex-1 h-[2px] bg-yellow-400" />

                  <button
                    onClick={() => scrollToSection('timeline')}
                    className="px-4 text-white font-semibold uppercase tracking-wider text-xs hover:text-yellow-400 transition-colors"
                  >
                    Timeline
                  </button>

                  <div className="flex-1 h-[2px] bg-yellow-400" />

                  <button
                    onClick={() => scrollToSection('gallery')}
                    className="px-4 text-white font-semibold uppercase tracking-wider text-xs hover:text-yellow-400 transition-colors"
                  >
                    Activities
                  </button>
                </div>
              </div>
            )}

            {/* desktop profile */}
            <div className="flex items-center space-x-4 z-10">
              {!isLoggedIn && (
                <Link
                  to="/peserta/login"
                  className="hidden md:inline-flex px-6 py-2.5 bg-[#EAC11F] text-black rounded-full font-medium hover:bg-[#d4a91a] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Login
                </Link>
              )}

              {isLoggedIn && userProfile && (
                <div className="relative hidden md:block">
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
                        <p className="text-sm text-gray-500">NRP : {userProfile.nrp}</p>
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
              )}

              <button
                className="md:hidden p-2 rounded-md text-yellow-400 hover:text-white transition"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-64 bg-black bg-opacity-95 border-l border-yellow-500 flex flex-col items-center z-[60] transform transition-transform duration-400 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ pointerEvents: mobileMenuOpen ? 'auto' : 'none' }}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 text-yellow-400 hover:text-white transition z-30"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mt-12 mb-4 z-10">
          <img src="/webp/bella-mascot.webp" alt="Bella Mascot" className="h-20 w-auto" />
        </div>

        {isLoggedIn && userProfile ? (
          <div className="flex flex-col items-center text-yellow-400 font-semibold space-y-2 text-sm mt-4 z-10">
            <div className="text-white text-center">
              <p className="font-medium text-lg">{userProfile.name}</p>
              <p className="text-xs text-gray-300">NRP: {userProfile.nrp}</p>
              <p className="text-xs text-gray-400">Score: {userProfile.total_score || 0}</p>
            </div>
            <button
              onClick={openLogoutConfirm}
              className="mt-4 flex items-center text-red-500 hover:text-red-400 transition space-x-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase">Logout</span>
            </button>
          </div>
        ) : (
          <>
            {!isPesertaFeaturesPage && (
              <div className="flex flex-col items-center text-white uppercase font-semibold space-y-2 text-sm tracking-wider mt-2 z-10">
                <button onClick={() => scrollToSection('visi')} className="hover:text-yellow-400 transition">
                  Vision
                </button>
                <div className="w-[2px] h-6 bg-yellow-400" />
                <button onClick={() => scrollToSection('misi')} className="hover:text-yellow-400 transition">
                  Mission
                </button>
                <div className="w-[2px] h-6 bg-yellow-400" />
                <button onClick={() => scrollToSection('timeline')} className="hover:text-yellow-400 transition">
                  Timeline
                </button>
                <div className="w-[2px] h-6 bg-yellow-400" />
                <button onClick={() => scrollToSection('gallery')} className="hover:text-yellow-400 transition">
                  Activities
                </button>
              </div>
            )}

            {!isLoggedIn && (
              <div className="z-10 mt-6">
                <Link
                  to="/peserta/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-6 py-2.5 bg-[#EAC11F] text-black rounded-full font-medium hover:bg-[#d4a91a] transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Login
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold">Logout</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
