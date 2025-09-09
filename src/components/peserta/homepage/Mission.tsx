import React, { useRef, useState, useEffect, useCallback } from 'react';

const missions = [
  { id: 1, text: 'To deliver systematic and sequential chess material that is easily understandable.' },
  { id: 2, text: 'To provide participants with practical application through sparring and tournaments, not just theoretical knowledge.' },
  { id: 3, text: 'To package chess into a fun and engaging learning process.' },
];

const decorativePieces = [
  { piece: 'knight white.svg', x: -16, y: 3, size: 'w-16 h-16 md:w-32 md:h-32', opacity: 1.0, zIndex: 16, mobileY: -10 },
  { piece: 'bishop white.svg', x: -35, y: 0, size: 'w-20 h-20 md:w-44 md:h-44', opacity: 1.0, zIndex: 1, mobileY: -14 },
  { piece: 'queen black d.svg', x: 15, y: -2, size: 'w-24 h-24 md:w-52 md:h-52', opacity: 1.0, zIndex: 3, mobileY: -16 },
  { piece: 'pawn black b.svg', x: 35, y: 0, size: 'w-12 h-12 md:w-32 md:h-32', opacity: 1.0, zIndex: 1, mobileY: -16 },
  { piece: 'rook white.svg', x: -40, y: 4, size: 'w-20 h-20 md:w-44 md:h-44', opacity: 1.0, zIndex: 2, mobileY: -12},
  { piece: 'bishop black b.svg', x: 40, y: -1, size: 'w-20 h-20 md:w-44 md:h-44', opacity: 1.05, zIndex: 0, mobileY: -14 }
];

const alignmentOffsets = {
    sm: { x: -6.25, y: -5.75 },
    md: { x: -4, y: -6.25 },
    lg: { x: -2.5, y: -11 },
};

export default function OurMission() {
  const [activeMissionIndex, setActiveMissionIndex] = useState(0);
  const [pawnHeightVh, setPawnHeightVh] = useState(0);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg'>('lg');
  const missionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pawnRef = useRef<HTMLImageElement | null>(null);
  const handRef = useRef<HTMLImageElement | null>(null);

  // Fungsi untuk navigasi dengan tombol
  const handleNextMission = () => {
    setActiveMissionIndex(prev => (prev + 1) % missions.length);
  };

  const handlePrevMission = () => {
    setActiveMissionIndex(prev => (prev - 1 + missions.length) % missions.length);
  };

  // Fungsi untuk mendeteksi ukuran layar
  const checkScreenSize = useCallback(() => {
    const width = window.innerWidth;
    if (width < 768) {
      return 'sm';
    } else if (width < 1280) {
      return 'md';
    } else {
      return 'lg';
    }
  }, []);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setScreenSize(checkScreenSize());
    };

    // Set initial size
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScreenSize]);

  useEffect(() => {
    const measurePawn = () => {
      if (pawnRef.current) {
        const pawnPixelHeight = pawnRef.current.offsetHeight;
        const vh = window.innerHeight / 100;
        setPawnHeightVh(pawnPixelHeight / vh);
      }
    };
    
    measurePawn();
  }, [windowSize]);

  const getPositions = useCallback(() => {
    const initialPawnX = -25;
    const grabbedPawnY = screenSize === 'sm' ? -14 : 2;
    const currentOffset = alignmentOffsets[screenSize];

    const getAlignedHandY = (pawnY: number) => {
        const baseAlignment = pawnY - (pawnHeightVh / 2);
        return baseAlignment + currentOffset.y;
    };

    const getAlignedHandX = (pawnX: number) => {
        return pawnX + currentOffset.x;
    }
    
    switch (activeMissionIndex) {
      case 0:
        return {
          pawnX: initialPawnX,
          pawnY: screenSize === 'sm' ? -16 : 0,
          handX: getAlignedHandX(initialPawnX),
          handY: -70,
        };
      case 1:
        return {
          pawnX: initialPawnX,
          pawnY: grabbedPawnY,
          handX: getAlignedHandX(initialPawnX),
          handY: getAlignedHandY(grabbedPawnY),
        };
      case 2:
        const movedPawnX = 0;
        return {
          pawnX: movedPawnX,
          pawnY: grabbedPawnY,
          handX: getAlignedHandX(movedPawnX),
          handY: getAlignedHandY(grabbedPawnY),
        };
      default:
        return {
          pawnX: initialPawnX,
          pawnY: screenSize === 'sm' ? -5 : 0,
          handX: getAlignedHandX(initialPawnX),
          handY: -70,
        };
    }
  }, [activeMissionIndex, pawnHeightVh, screenSize]);

  const positions = getPositions();

  return (
    <section 
      id="our-mission" 
      className="relative h-screen bg-[#1D252D] text-white flex flex-col"
    >
      <div className="flex-1 relative w-full overflow-hidden">
        <div className="absolute top-0 right-5 md:right-40 pt-12 md:pt-20 text-center z-10 pointer-events-none">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[0.2em] text-white drop-shadow-md">
            OUR MISSION
          </h2>
        </div>
        
        {/* Background untuk desktop */}
        <div className="hidden md:block absolute inset-0 grid grid-rows-2">
            <div className="bg-gradient-to-r from-[#8392ac] to-[#EDE8D9] row-span-1"></div>
            <div className="bg-gradient-to-t from-[#0c1015] to-[#576281] row-span-1"></div>
        </div>
        
        {/* Background untuk mobile */}
        <div className="md:hidden absolute inset-0">
          <div className="h-[35%] bg-gradient-to-r from-[#8392ac] to-[#EDE8D9]"></div>
          <div className="h-[65%] bg-gradient-to-t from-[#0c1015] to-[#576281]"></div>
        </div>
        
        {decorativePieces.map((dp, index) => (
          <div key={index} className="absolute inset-0 flex justify-center items-center" style={{ zIndex: dp.zIndex }}>
            <img
              src={`/svg/pieces/${dp.piece}`}
              alt={`Chess ${dp.piece.split(' ')[0]}`}
              className={`relative ${dp.size}`}
              style={{
                transform: `translateX(${dp.x}vw) translateY(${screenSize === 'sm' ? dp.mobileY : dp.y}vh)`,
                opacity: dp.opacity,
              }}
            />
          </div>
        ))}
        
        <div className="absolute inset-0 flex justify-center items-center" style={{ zIndex: 10 }}>
          <img
            ref={pawnRef}
            src="/svg/pieces/pawn white.svg"
            alt="Chess Pawn"
            className="relative w-14 h-14 md:w-28 md:h-28 transition-transform duration-700 ease-in-out"
            style={{ 
              transform: `translateX(${positions.pawnX}vw) translateY(${positions.pawnY}vh)`
            }}
          />
        </div>
        
        <div className="absolute inset-0 flex justify-center items-center" style={{ zIndex: 11 }}>
          <img
            ref={handRef}
            src="/svg/hand round.svg"
            alt="Hand moving piece"
            className="w-24 h-24 md:w-48 md:h-48 transition-all duration-700 ease-in-out"
            style={{
              transform: `translateX(${positions.handX}vw) translateY(${positions.handY}vh) rotate(15deg)`,
              transformOrigin: 'bottom center',
              pointerEvents: 'none'
            }}
          />
        </div>

        <div className="absolute bottom-8 md:bottom-6 left-0 w-full p-4 md:p-16">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 text-left">
            {missions.map((mission, index) => (
              <div
                key={mission.id}
                ref={(el) => (missionRefs.current[index] = el)}
                data-index={index}
                className="flex items-start gap-3 md:gap-4 transition-all duration-700 ease-in-out"
                style={{ 
                  opacity: activeMissionIndex === index ? 1 : 0.2,
                  transform: activeMissionIndex === index ? 'translateY(0)' : 'translateY(10px)'
                }}
              >
                <span className="font-roxhead text-6xl md:text-8xl font-light text-[#DADBD3] opacity-80">{mission.id}</span>
                <p className="mt-2 text-sm md:text-base text-gray-300">{mission.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-center items-center py-6 space-x-8 bg-[#1D252D]">
        <button 
          onClick={handlePrevMission}
          className="px-6 py-3 bg-[#576281] text-white rounded-lg hover:bg-[#8392ac] transition-colors duration-300 font-medium"
        >
          Previous
        </button>
        <div className="flex space-x-2">
          {missions.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveMissionIndex(index)}
              className={`w-3 h-3 rounded-full ${
                activeMissionIndex === index ? 'bg-white' : 'bg-gray-500'
              }`}
              aria-label={`Go to mission ${index + 1}`}
            />
          ))}
        </div>
        <button 
          onClick={handleNextMission}
          className="px-6 py-3 bg-[#576281] text-white rounded-lg hover:bg-[#8392ac] transition-colors duration-300 font-medium"
        >
          Next
        </button>
      </div>
    </section>
  );
}