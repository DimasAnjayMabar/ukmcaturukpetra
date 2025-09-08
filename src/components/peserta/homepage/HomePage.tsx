import React, { Suspense, lazy, useState, useEffect } from 'react';
import Navbar from './Navbar';
import ChessPiecesGuide from './ChessPieceGuide';
import Timeline from './Timeline';
import Mission from './Mission';
import Vision from './Vision';
import PesertaFeatures from './PesertaFeatures';
import { supabase } from '../../../db_client/client';
import { UserProfile } from '../../../types/index';

const LazyKingScene = lazy(() => import('../models/KingScene'));

export default function HomePage() {
  const [isHovered, setIsHovered] = useState(false);
  const [crownPosition, setCrownPosition] = useState({ x: 0, y: 0 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const progress = Math.min(scrollTop / windowHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

        if (profileError || !profileData || profileData.role !== 'peserta') {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <main className="relative">
      <Navbar isLoggedIn={isLoggedIn} userProfile={userProfile} />
      
      {isLoggedIn && userProfile ? (
        <section
          id="features-hero"
          className=" fixed top-0 left-0 h-screen w-screen bg-white z-0 flex items-center justify-center"
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
              UKM CHESS
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
        <Vision />
        <Mission />
        
        <section id="timeline" className="w-full bg-[#0c1015] py-20 sm:py-24">
            <Timeline />
        </section>
      </div>
    </main>
  );
}