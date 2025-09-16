import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { Home, Target, Flag, Calendar, Eye, Compass, Book } from 'lucide-react';
import Navbar from './Navbar';
import ChessPiecesGuide from './ChessPieceGuide';
import Timeline from './Timeline';
import Mission from './Mission';
import Vision from './Vision';
import PesertaFeatures from './PesertaFeatures';
import { supabase } from '../../../db_client/client';
import { UserProfile } from '../../../types/index';
import Footer from './Footer';
import Rulebook from './Rulebook';

const LazyKingScene = lazy(() => import('../models/KingScene'));

export default function HomePage() {
  const [isHovered, setIsHovered] = useState(false);
  const [crownPosition, setCrownPosition] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('hero');
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Daftar section dalam urutan
  const sections = [
    { id: 'hero', label: 'Home', icon: Home },
    { id: 'visi', label: 'Visi', icon: Eye },
    { id: 'misi', label: 'Misi', icon: Compass },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'rulebook', label: 'Rulebook', icon: Book}
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const progress = Math.min(scrollTop / windowHeight, 1);
      setScrollProgress(progress);
      
      // Deteksi section yang sedang aktif
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY + window.innerHeight / 3;
        
        let activeSection = 'hero';
        let minDistance = Infinity;
        
        for (const section of sections) {
          const element = document.getElementById(section.id);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            const elementBottom = elementTop + rect.height;
            
            // Hitung jarak dari tengah viewport ke element
            const distance = Math.abs(scrollPosition - (elementTop + elementBottom) / 2);
            
            if (distance < minDistance) {
              minDistance = distance;
              activeSection = section.id;
            }
          }
        }
        
        setCurrentSection(activeSection);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (!session || authError) {
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profile')
          .select('name, nrp, email, role, total_score')
          .eq('id', session.user.id)
          .single();

        // PERBAIKAN: Izinkan admin dan peserta
        if (profileError || !profileData || (profileData.role !== 'peserta' && profileData.role !== 'admin')) {
          setIsLoggedIn(false);
          setIsLoading(false);
          return;
        }

        setUserProfile(profileData as UserProfile);
        setIsLoggedIn(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          checkAuthStatus();
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUserProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      // Hitung tinggi navbar secara dinamis atau gunakan estimasi
      const navbarHeight = -10; // Estimasi tinggi navbar termasuk padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleNavigateToSection = useCallback((sectionId: string) => {
    scrollToSection(sectionId);
  }, [scrollToSection]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <main className="relative">
      <Navbar 
        isLoggedIn={isLoggedIn} 
        userProfile={userProfile} 
        onNavigateToSection={handleNavigateToSection}
      />
    
      {isLoggedIn && userProfile ? (
        // PERBAIKAN: Tampilkan PesertaFeatures untuk admin dan peserta
        <section
          id="features-hero"
          className="fixed top-0 left-0 h-screen w-screen bg-white z-0 flex items-center justify-center ipad:items-start ipad:pt-16"
        >
          <PesertaFeatures userProfile={userProfile} />
        </section>
      ) : (
        <section
          id="hero"
          className="fixed top-0 left-0 h-screen w-screen grid place-items-center bg-white overflow-hidden z-0"
        >
          <div
            className="absolute inset-0 z-5 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.1) 70%, rgba(0, 0, 0, 0.2) 100%)'
            }}
          />
          {isHovered && (
            <img
              src="/gif/crown.gif"
              alt="Crown"
              className="absolute z-30 w-24 h-24 pointer-events-none"
              style={{
                left: crownPosition.x,
                top: crownPosition.y,
                transform: `translate(155%, -655%) rotate(${8 + scrollProgress * 15}deg)`,
              }}
            />
          )}
          <div
            className="flex flex-col items-center z-10 [grid-area:1/1]"
            style={{
              transform: `translateY(${scrollProgress * 20}px)`,
              opacity: 1 - scrollProgress * 0.3
            }}
          >
            <span className="tracking-tighter text-[clamp(2.5rem,12vw,10rem)] text-black">
              UKM CATUR
            </span>
          </div>
          <div className="w-full h-full z-20 [grid-area:1/1]">
            <Suspense fallback={<div className="text-black w-full h-full flex justify-center items-center">Loading King...</div>}>
              <LazyKingScene
                setIsHovered={setIsHovered}
                setCrownPosition={setCrownPosition}
              />
            </Suspense>
          </div>
        </section>
      )}

      <div className="h-screen"></div>
      <div className="relative z-10">
        <div className="relative">
          <ChessPiecesGuide />
        </div>
        <section id='visi' className='scroll-mt-40'>
          <Vision />
        </section>
        <section id='misi'>
          <Mission />
        </section>
        <section id="timeline" className="">
            <Timeline />
        </section>
        <section id="rulebook">
            <Rulebook/>
        </section>
      </div>

      {/* Floating Navigation Buttons */}
      <div className="fixed right-6 bottom-6 z-40 flex flex-col space-y-3">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${
                  currentSection === section.id 
                    ? 'bg-[#576281] text-white' 
                    : 'bg-[#576281] hover:bg-[#8392ac] text-white'
                }`}
                aria-label={`Go to ${section.label}`}
                title={section.label}
              >
                <IconComponent className="h-5 w-5" />
              </button>
            );
          })}
        </div>

        <div className='relative z-30'>
          <Footer/>
        </div>
    </main>
    
  );
}