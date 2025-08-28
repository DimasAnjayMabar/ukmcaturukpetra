import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className = '' }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isScrolled ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between">
          
          <Link to="/" className="flex items-center space-x-2 group z-10">
            <img
              src="/svg/chess logo.svg"
              alt="UKM Chess Logo"
              className="h-8 md:h-10 w-auto transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              UKM CHESS
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-4 z-10">
            <Link
              to="/peserta/login"
              className="px-6 py-2.5 bg-[#EAC11F] text-black rounded-full font-medium hover:bg-[#d4a91a] transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Login
            </Link>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-black hover:bg-gray-100/80 transition-colors duration-200 z-10"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <div className="px-4 py-4 space-y-2">
              <button
                onClick={() => scrollToSection('hero')}
                className="block w-full text-left px-4 py-3 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors duration-200 font-medium"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('visi')}
                className="block w-full text-left px-4 py-3 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors duration-200 font-medium"
              >
                Visi
              </button>
              <button
                onClick={() => scrollToSection('misi')}
                className="block w-full text-left px-4 py-3 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors duration-200 font-medium"
              >
                Misi
              </button>
              
              <div className="pt-3 border-t border-white/20 mt-3">
                <Link
                  to="/peserta/login"
                  className="block w-full px-4 py-3 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login Peserta
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}