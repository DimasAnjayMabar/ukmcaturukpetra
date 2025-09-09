import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedChessboard } from './AnimatedChessboard';

const specificDates = [
    "24 October 2025", "31 October 2025", "7 November 2025", "14 November 2025", "21 November 2025",
    "20 February 2026", "27 February 2026", "6 March 2026", "13 March 2026", "27 March 2026",
    "8 May 2026", "15 May 2026", "22 May 2026", "29 May 2026"
];

const timelineContent = [
    { week: 'Week 1', title: 'Introduction to Chess'},
    { week: 'Week 2', title: 'Chess Notation'},
    { week: 'Week 3', title: 'Opening Phase'},
    { week: 'Week 4', title: 'Single Rapid Tournament'},
    { week: 'Week 5', title: 'Opening System I'},
    { week: 'Week 6', title: 'Opening System II'},
    { week: 'Week 7', title: 'Simul Games'},
    { week: 'Week 8', title: 'Middlegame (Tactics)'},
    { week: 'Week 9', title: 'Middlegame (Types of Checkmate)'},
    { week: 'Week 10', title: '10+ Years of Playing Chess' },
    { week: 'Week 11', title: 'Single Blitz Tournament' },
    { week: 'Week 12', title: 'Basic Endgames' },
    { week: 'Week 13', title: 'Advanced Endgames' },
    { week: 'Week 14', title: 'Petra Chess Competition' },
];

const timelineData = timelineContent.map((item, index) => ({
    ...item,
    date: specificDates[index]
}));

const Timeline: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const swipeContainerRef = useRef<HTMLDivElement>(null);
    const [swipeStartX, setSwipeStartX] = useState(0);

    // Detect mobile device
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Swipe animation for mobile (simplified)
    const handleSwipeStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        setSwipeStartX(e.touches[0].clientX);
    };

    const handleSwipeEnd = (e: React.TouchEvent) => {
        if (!isMobile) return;
        
        const endX = e.changedTouches[0].clientX;
        const diff = endX - swipeStartX;
        const threshold = 50;
        
        if (diff > threshold) {
            // Swipe right - go to previous
            handlePrev();
        } else if (diff < -threshold) {
            // Swipe left - go to next
            handleNext();
        }
    };

    // Navigation functions
    const handleNext = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentStep(prev => (prev + 1) % timelineData.length);
        setTimeout(() => setIsTransitioning(false), 600);
    };

    const handlePrev = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setCurrentStep(prev => (prev - 1 + timelineData.length) % timelineData.length);
        setTimeout(() => setIsTransitioning(false), 600);
    };

    const handleDotClick = (index: number) => {
        if (isTransitioning || index === currentStep) return;
        setIsTransitioning(true);
        setCurrentStep(index);
        setTimeout(() => setIsTransitioning(false), 600);
    };

    return (
        <div 
            ref={swipeContainerRef}
            className="relative w-full bg-[#0c1015] flex flex-col py-8 md:py-12 min-h-screen"
            onTouchStart={isMobile ? handleSwipeStart : undefined}
            onTouchEnd={isMobile ? handleSwipeEnd : undefined}
        >
            <div className="relative w-full overflow-hidden flex-1">
                <div className="text-center">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#DADBD3]">
                        TIMELINE
                    </h2>
                </div>

                {/* Swipe instruction for mobile - only show if no buttons */}
                {isMobile && (
                    <div className="text-center text-xs text-gray-400 mt-4">
                        Swipe left or right to navigate between weeks
                    </div>
                )}
                
                <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row items-center justify-center">
                    {/* 1. Animated Chessboard - Left for desktop, top for mobile */}
                    <div className="flex items-center justify-center p-4 w-full lg:w-1/2 mb-6 lg:mb-0">
                        <motion.div 
                            className="transform scale-75 md:scale-90 lg:scale-100" 
                            style={{ transform: 'rotate(-2deg)', filter: 'drop-shadow(8px 12px 24px rgba(0, 0, 0, 0.4))' }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <AnimatedChessboard currentMoveIndex={currentStep} />
                        </motion.div>
                    </div>

                    {/* 2. Content Area - Right for desktop, below for mobile */}
                    <div className="flex flex-col justify-center w-full lg:w-1/2">
                        {/* Navigation Dots */}
                        <div className="flex justify-center mb-6 lg:mb-8 w-full px-4">
                            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
                                {timelineData.map((_, index) => (
                                    <button
                                        key={`dot-${index}`}
                                        onClick={() => handleDotClick(index)}
                                        className={`w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 ${
                                            currentStep === index 
                                                ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-500/50' 
                                                : 'bg-gray-600 hover:bg-gray-500'
                                        }`}
                                        aria-label={`Go to Week ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="relative flex items-center justify-center text-center lg:text-left w-full mb-4 lg:mb-6 px-4">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    className="w-full max-w-2xl"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <h3 className="text-xl md:text-2xl font-medium text-[#DADBD3] mb-3 md:mb-4">
                                        {timelineData[currentStep].week}
                                    </h3>
                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#DADBD3] mb-4 md:mb-5 lg:mb-6 leading-tight">
                                        {timelineData[currentStep].title}
                                    </h2>
                                    <p className="text-base md:text-lg font-medium text-yellow-400">
                                        {timelineData[currentStep].date}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 3. Prev/Next Buttons - Only show on desktop */}
            {!isMobile && (
                <div className="flex justify-center items-center py-6 space-x-8 bg-[#0c1015] mt-4">
                    <button 
                        onClick={handlePrev}
                        className="px-8 py-3 bg-[#363E53] text-white rounded-lg hover:bg-[#576281] transition-colors duration-300 font-medium"
                        disabled={isTransitioning}
                    >
                        Previous
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        className="px-8 py-3 bg-[#363E53] text-white rounded-lg hover:bg-[#576281] transition-colors duration-300 font-medium"
                        disabled={isTransitioning}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default Timeline;