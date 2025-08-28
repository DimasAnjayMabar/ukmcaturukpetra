import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
    { week: 'Week 14', title: 'Chess Festival' },
];

const timelineData = timelineContent.map((item, index) => ({
    ...item,
    date: specificDates[index]
}));

const Timeline: React.FC = () => {
    const totalSteps = timelineData.length;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: scrollContainerRef,
        offset: ['start start', 'end end'],
    });

    const scrollPoints = Array.from({ length: totalSteps + 1 }, (_, i) => i / totalSteps);
    const stepIndexes = Array.from({ length: totalSteps + 1 }, (_, i) => i);
    const currentStepMotionValue = useTransform(scrollYProgress, scrollPoints, stepIndexes, { clamp: true });
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        return currentStepMotionValue.onChange((latest) => {
            setCurrentStep(Math.floor(latest));
        });
    }, [currentStepMotionValue]);

    const handleNavClick = (index: number) => {
        if (!scrollContainerRef.current) return;

        const rect = scrollContainerRef.current.getBoundingClientRect();
        const containerTop = rect.top + window.scrollY;
        const containerHeight = scrollContainerRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollableDistance = containerHeight - viewportHeight;
        const targetProgress = (index + 1.5) / totalSteps;
        const targetScrollY = containerTop + targetProgress * scrollableDistance;

        window.scrollTo({
            top: targetScrollY,
            behavior: 'smooth',
        });
    };

    return (
        <div ref={scrollContainerRef} className="relative h-[1500vh] w-full bg-[#0c1015]">
            <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0c1015]">
                {/* <div className="sticky top-0 h-screen w-full overflow-hidden bg-gradient-to-tr from-[#0C0D0E] via-[#47618A] to-[#E3E1DA]"></div> */}

                {/* nav */}
                <div className="absolute hidden lg:flex right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-4">
                    {timelineData.map((item, index) => (
                        <div key={`nav-desktop-${index}`} className="relative group flex items-center">
                            <div className="absolute right-full mr-1 px-3 py-1 text-[#FFF8DE] text-xs font-bold rounded-md shadow-lg
                                            opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap
                                            transform translate-x-2 group-hover:translate-x-0">
                                {item.date}
                            </div>
                            
                            <button
                                onClick={() => handleNavClick(index)}
                                className="flex items-center gap-4 text-right"
                                aria-label={`Go to ${item.week}`}
                            >
                                <div className={`w-3 h-3 rounded-full transition-all duration-300 ease-in-out ${
                                    currentStep === index + 1
                                        ? 'bg-yellow-400 scale-150 shadow-lg shadow-yellow-500/50'
                                        : 'bg-[#363E53] group-hover:bg-[#DADBD3]'
                                }`} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="absolute top-0 left-0 right-0 pt-12 md:pt-20 text-center z-10 pointer-events-none">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#DADBD3]">
                        TIMELINE
                    </h2>
                </div>
                <div className="mx-auto flex h-full w-full max-w-7xl flex-col items-stretch justify-center pt-24 lg:max-w-4xl lg:flex-row lg:items-center lg:pt-12">
                    
                    {/* chessboard L */}
                    <div className="flex flex-1 items-center justify-center p-4 lg:w-1/2">
                        <motion.div className="transform" style={{ transform: 'rotate(-2deg)', filter: 'drop-shadow(8px 12px 24px rgba(0, 0, 0, 0.4))' }}>
                            <AnimatedChessboard currentMoveIndex={currentStep} />
                        </motion.div>
                    </div>

                    {/* text & nav R */}
                    <div className="flex flex-1 flex-col justify-between lg:w-1/2 lg:justify-center">
                        <div className="relative flex flex-grow items-center justify-center text-center lg:text-left order-2 lg:order-none -translate-y-4">

                            {timelineData.map((item, index) => (
                                <motion.div key={item.week} className="absolute w-full max-w-lg px-8" initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: currentStep === index + 1 ? 1 : 0, y: currentStep === index + 1 ? 0 : (currentStep > index + 1 ? -40 : 40), scale: currentStep === index + 1 ? 1 : 0.9 }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], type: 'spring', stiffness: 200, damping: 25 }}>
                                    <h3 className="text-xl md:text-2xl font-medium text-[#DADBD3] mb-2">{item.week}</h3>
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#DADBD3] mb-4 lg:mb-6 leading-tight">
                                        {item.title}
                                    </h2>
                                    <p className="text-base md:text-lg font-medium" style={{ color: '#FFD700' }}>
                                        {item.date}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="lg:hidden px-4 max-w-md mx-auto">
                            <div className="space-y-4">
                                <div className="grid grid-cols-7 gap-5 px-4">
                                    {timelineData.slice(0, 7).map((item, index) => (
                                        <button key={`nav-mobile-top-${index}`} onClick={() => handleNavClick(index)} className="flex items-center justify-center" aria-label={`Go to ${item.week}`}>
                                            <div className={`w-6 h-6 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${currentStep === index + 1 ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-500/50' : 'bg-gray-600'}`}>
                                                <span className={`font-bold text-xs transition-all duration-300 ${currentStep === index + 1 ? 'text-black' : 'text-white'}`}>{index + 1}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-5 px-4">
                                    {timelineData.slice(7, 14).map((item, index) => (
                                        <button key={`nav-mobile-bottom-${index}`} onClick={() => handleNavClick(index + 7)} className="flex items-center justify-center" aria-label={`Go to ${item.week}`}>
                                            <div className={`w-6 h-6 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${currentStep === index + 8 ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-500/50' : 'bg-gray-600'}`}>
                                                <span className={`font-bold text-xs transition-all duration-300 ${currentStep === index + 8 ? 'text-black' : 'text-white'}`}>{index + 8}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Timeline;