import React, { useState, useEffect, useRef } from 'react';

const pieceIcons = [
  '/svg/icons/pawn icon w.svg',
  '/svg/icons/queen icon w.svg',
  '/svg/icons/rook icon w.svg',
  '/svg/icons/knight icon w.svg',
  '/svg/icons/king icon w.svg',
  '/svg/icons/bishop icon w.svg',
];

interface Position {
  x: number;
  y: number;
}

export default function Vision() {
  const [pupilStyle, setPupilStyle] = useState<{ transform?: string }>({});
  const [isHoveringEyeball, setIsHoveringEyeball] = useState(false);
  const [currentIconIndex, setCurrentIconIndex] = useState(0);
  const [pupilCentered, setPupilCentered] = useState(false);
  const [pawnPosition, setPawnPosition] = useState({ x: 0, y: 0 });
  const [animationKey, setAnimationKey] = useState(0);
  const [wordsRevealed, setWordsRevealed] = useState(0);
  const [isAnimationActive, setIsAnimationActive] = useState(false);

  const eyeballRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const rightTextRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationStepRef = useRef(0);

  const revealText = "connecting beyond the board.";
  const revealWords = revealText.split(' ');

  useEffect(() => {
    const mouse: Position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const animate = () => {
      const eyeball = eyeballRef.current;
      if (eyeball) {
        if (isHoveringEyeball || pupilCentered) {
          setPupilStyle({ transform: 'translate(-50%, -50%) translate(0px, 0px)' });
        } else {
          const eyeRect = eyeball.getBoundingClientRect();
          const eyeCenterX = eyeRect.left + eyeRect.width / 2;
          const eyeCenterY = eyeRect.top + eyeRect.height / 2;
          const deltaX = mouse.x - eyeCenterX;
          const deltaY = mouse.y - eyeCenterY;
          const angle = Math.atan2(deltaY, deltaX);
          const maxPupilDistance = eyeRect.width * 0.15;
          const actualDistance = Math.min(Math.hypot(deltaX, deltaY), maxPupilDistance);
          const pupilX = Math.cos(angle) * actualDistance;
          const pupilY = Math.sin(angle) * actualDistance;
          setPupilStyle({ transform: `translate(-50%, -50%) translate(${pupilX}px, ${pupilY}px)` });
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isHoveringEyeball, pupilCentered]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const sectionRect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const isSectionInView = sectionRect.top < windowHeight && sectionRect.bottom > 0;
      const hasReachedTriggerPoint = sectionRect.top <= windowHeight * 0.5;

      if (isSectionInView && hasReachedTriggerPoint && !isAnimationActive) {
        setIsAnimationActive(true);
      } else if (!isSectionInView && isAnimationActive) {
        setIsAnimationActive(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isAnimationActive]);
  
  useEffect(() => {
    if (!isAnimationActive) {
      animationStepRef.current = 0;
      setWordsRevealed(0);
      setAnimationKey(0);
    }
  }, [isAnimationActive]);
  
  useEffect(() => {
    if (!isAnimationActive) return;

    const totalSteps = revealWords.length + 1;
    const interval = setInterval(() => {
      const currentStep = animationStepRef.current + 1;

      if (currentStep > totalSteps) {
        clearInterval(interval);
        return;
      }

      const rightTextElement = rightTextRef.current;
      if (rightTextElement) {
        const wordElements = rightTextElement.querySelectorAll('.reveal-word');
        let newPosition: Position | null = null;
        
        if (currentStep > revealWords.length) {
          const lastWord = wordElements[wordElements.length - 1] as HTMLElement;
          const wordRect = lastWord.getBoundingClientRect();
          const rightTextRect = rightTextElement.getBoundingClientRect();
          newPosition = {
            x: wordRect.right - rightTextRect.left + 25,
            y: wordRect.top - rightTextRect.top - 5,
          };
        } else {
          const wordIndex = currentStep - 1;
          const currentWord = wordElements[wordIndex] as HTMLElement;
          const wordRect = currentWord.getBoundingClientRect();
          const rightTextRect = rightTextElement.getBoundingClientRect();
          newPosition = {
            x: wordRect.left - rightTextRect.left + wordRect.width / 2,
            y: wordRect.top - rightTextRect.top - 40,
          };
        }
        
        setWordsRevealed(Math.min(currentStep, revealWords.length));
        if (newPosition) setPawnPosition(newPosition);
        setAnimationKey(k => k + 1);
        animationStepRef.current = currentStep;
      }
    }, 700);

    return () => clearInterval(interval);
  }, [isAnimationActive, revealWords.length]);

  const handleMouseEnter = () => {
    setPupilCentered(true);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoveringEyeball(true);
    }, 50); 
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHoveringEyeball(false);
    setPupilCentered(false);
  };

  useEffect(() => {
    if (isHoveringEyeball) {
      const interval = setInterval(() => {
        setCurrentIconIndex(prevIndex => (prevIndex + 1) % pieceIcons.length);
      }, 350); 

      return () => clearInterval(interval);
    }
  }, [isHoveringEyeball]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .icon-shift {
          animation: iconShift 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        
        @keyframes iconShift {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6) rotate(-10deg); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(2deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.7) rotate(8deg); }
        }

        .pawn-container {
          position: absolute;
          transition: transform 0.7s cubic-bezier(0.45, 0, 0.55, 1);
        }

        .pawn-image {
          animation: pawnArc 0.6s cubic-bezier(0.5, 0, 0.5, 1);
          transform-origin: bottom center;
        //   filter: drop-shadow(0 6px 3px rgba(0,0,0,0.2));
        }
        
        @keyframes pawnArc {
          0% {
            transform: translateY(0) scale(1.2, 0.8);
          }
          50% {
            transform: translateY(-70px) scale(0.9, 1.1) rotate(-8deg);
          }
          100% {
            transform: translateY(0) scale(1, 1) rotate(0deg);
          }
        }

        .reveal-word {
          transition: opacity 0.4s ease-in-out, color 0.4s ease-in-out;
        }
      `}</style>
      
      <section ref={sectionRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[#8392ac] to-[#EDE8D9] pointer-events-none"
        />

        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="w-40 h-40 md:w-80 md:h-80 flex items-center justify-center cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.23,1,0.320,1)] drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-8"
        >
          <img 
            src="/svg/eyeball b.svg" 
            alt="Eyeball background"
            className="w-full h-full opacity-90"
          />
          <div 
            ref={eyeballRef}
            className="absolute w-3/4 h-3/4 flex items-center justify-center"
          >
            {isHoveringEyeball ? (
              <img
                key={currentIconIndex}
                src={pieceIcons[currentIconIndex]}
                alt="Chess piece icon"
                className="absolute top-1/2 left-1/2 w-[32%] h-[32%] icon-shift"
              />
            ) : (
              <img 
                src="/svg/pupil.svg" 
                alt="Pupil" 
                className={`absolute top-1/2 left-1/2 w-[26%] h-[26%] transition-all duration-400 ease-[cubic-bezier(0.23,1,0.320,1)] ${pupilCentered ? 'opacity-0 scale-80 duration-300 ease-out' : ''}`}
                style={pupilStyle}
              />
            )}
          </div>
        </div>

        <h2 className="text-5xl md:text-6xl font-extrabold tracking-[0.2em] text-slate-800/80 text-center drop-shadow-sm">
          VISION
        </h2>

        <div className="max-w-4xl px-12 text-center">
          <div ref={rightTextRef} className="relative text-xl md:text-2xl font-medium leading-relaxed text-slate-800/90 space-y-8">
            
            {isAnimationActive && (
              <div
                className="pawn-container z-10"
                style={{
                  transform: `translate(${pawnPosition.x - 20}px, ${pawnPosition.y}px)`,
                }}
              >
                <img
                  key={animationKey}
                  src="/svg/pieces/pawn white.svg"
                  alt="Pawn"
                  className="pawn-image w-10 h-10"
                />
              </div>
            )}
            
            <p>
              To establish a vibrant platform where students can sharpen their skills, nurture their passion, and foster lasting connections through the art of chess.
            </p>

            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
              <span className="inline-block">More than just a game, chess becomes our way of thinking, growing, and </span>
              {revealWords.map((word, index) => {
                const isRevealed = index < wordsRevealed;
                
                return (
                  <span
                    key={index}
                    className={`reveal-word inline-block ${isRevealed ? 'opacity-100 text-slate-800/90' : 'opacity-25 text-slate-600/50'}`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}