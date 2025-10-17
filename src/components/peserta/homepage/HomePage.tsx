import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { Home, Calendar, Eye, Compass, Book, Volume2, VolumeX } from 'lucide-react';
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

// const LazyKingScene = lazy(() => import('../models/KingScene'));

export default function HomePage() {
  // const [isHovered, setIsHovered] = useState(false);
  // const [crownPosition, setCrownPosition] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('hero');
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMuted, setIsMuted] = useState(true);
  const [hasAudioPlayed, setHasAudioPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const sections = [
    { id: 'hero', label: 'Home', icon: Home },
    { id: 'visi', label: 'Visi', icon: Eye },
    { id: 'misi', label: 'Misi', icon: Compass },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'rulebook', label: 'Rulebook', icon: Book}
  ];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (scrollProgress > 0.9 && !video.paused) {
      video.pause();
    } 
    else if (scrollProgress <= 0.9 && video.paused) {
      video.play();
    }
  }, [scrollProgress]);


  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const progress = Math.min(scrollTop / windowHeight, 1);
      setScrollProgress(progress);
      
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
      const navbarHeight = -10;
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

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!hasAudioPlayed) {
      audio.play().catch(e => console.error("Audio play failed:", e));
      setHasAudioPlayed(true);
    }
    
    const newMutedState = !isMuted;
    audio.muted = newMutedState;
    setIsMuted(newMutedState);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0d0d0e] via-[#0d0d0e] to-[#1d1d24]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <main className="relative bg-[#1d1d24]">
      <audio ref={audioRef} src="/audio/homepage-bg-music.wav" loop muted />

      <Navbar 
        isLoggedIn={isLoggedIn} 
        userProfile={userProfile} 
        onNavigateToSection={handleNavigateToSection}
      />
    
      {isLoggedIn && userProfile ? (
        <section
          id="features-hero"
          className="fixed top-0 left-0 h-screen w-screen bg-gradient-to-b from-[#0d0d0e] via-[#0d0d0e] to-[#1d1d24] z-0 flex items-center justify-center ipad:items-start ipad:pt-16"
        >
          <PesertaFeatures userProfile={userProfile} />
        </section>
      ) : (
        <>
          <section
            id="hero"
            className="fixed top-0 left-0 h-screen w-screen grid place-items-center overflow-hidden z-0 transition-opacity duration-500"
            style={{ opacity: 1 - Math.min(scrollProgress * 2, 1) }}
          >
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-0 left-0 w-full h-full object-cover -z-10"
            >
              <source src="/webm/hero-video.webm" type="video/webm" />
            </video>

            <div className="absolute top-0 left-0 w-full h-full bg-blue-900/20 -z-10" />
            
            <div
              className="flex flex-col items-center z-10 [grid-area:1/1]"
              style={{
                transform: `translateY(${scrollProgress * 20}px)`,
                opacity: 1 - scrollProgress * 0.3
              }}
            >
              <div className="flex items-center tracking-tighter text-[clamp(2.5rem,12vw,10rem)] text-white">
                <span>UKM</span>
                <span className="mx-4 text-yellow-500">|</span>
                <span>CATUR</span>
              </div>
            </div>
          </section>

          <div className="fixed bottom-5 right-5 z-40">
            <button
              onClick={toggleMute}
              className="p-3 bg-[#141413] rounded-full text-yellow-500 hover:bg-yellow-500 hover:text-[#141413] transition-colors backdrop-blur-sm"
              aria-label={isMuted ? 'Unmute music' : 'Mute music'}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          <div className="h-screen"></div>
          <div className="relative z-10 bg-gradient-to-b from-[#0d0d0e] via-[#0d0d0e] to-[#1d1d24] text-white">
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

          <div className='relative z-30'>
            <Footer/>
          </div>
        </>
      )}
    </main>
  );
}