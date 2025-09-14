import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

// nav arrow helpers
const ArrowButton: React.FC<{ direction: 'left' | 'right'; onClick: () => void; disabled: boolean; }> = ({ direction, onClick, disabled }) => (
    <motion.button
        onClick={onClick}
        disabled={disabled}
        className="w-10 xl:w-12 h-10 xl:h-12 rounded-full backdrop-blur-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-300"
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        whileTap={{ scale: 0.95 }}
        aria-label={direction === 'left' ? 'Previous week' : 'Next week'}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 xl:h-6 w-4 xl:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
        </svg>
    </motion.button>
);

const Timeline: React.FC = () => {
    const totalSteps = timelineData.length;
    const [currentStep, setCurrentStep] = useState(1);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    const handlePrevious = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const handleStepClick = (index: number) => setCurrentStep(index + 1);

    return (
        <div className="relative w-full bg-[#0c1015] min-h-screen flex flex-col justify-center py-12 sm:py-16">
                
                {/* desktop navigation */}
                <div className="absolute hidden lg:flex right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-4">
                    {timelineData.map((item, index) => (
                        <div key={`nav-desktop-${index}`} className="relative group flex items-center">
                            <div className="absolute right-full mr-1 px-3 py-1 text-[#FFF8DE] text-xs font-bold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap transform translate-x-2 group-hover:translate-x-0">
                                {item.date}
                            </div>
                            <button
                                onClick={() => handleStepClick(index)}
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

                {/* header */}
                <div className="absolute top-0 left-0 right-0 pt-8 sm:pt-12 md:pt-20 text-center z-10 pointer-events-none">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#DADBD3]">
                        TIMELINE
                    </h2>
                </div>
                
                {/* desktop layout */}
                <div className="relative mx-auto hidden lg:flex h-full w-full max-w-5xl flex-row items-center justify-center pt-12">
                    
                    {/* desktop prev arrow */}
                    <div className="absolute left-0 z-20">
                        <ArrowButton direction="left" onClick={handlePrevious} disabled={currentStep === 1} />
                    </div>

                    {/* desktop chessboard */}
                    <div className="flex flex-1 items-center justify-center p-4 w-1/2">
                        <motion.div className="transform" style={{ transform: 'rotate(-2deg)', filter: 'drop-shadow(8px 12px 24px rgba(0, 0, 0, 0.4))' }}>
                            <AnimatedChessboard currentMoveIndex={currentStep} />
                        </motion.div>
                    </div>

                    {/* desktop content */}
                    <div className="flex flex-1 flex-col justify-center w-1/2">
                        <div className="relative flex items-center justify-center text-left">
                            {timelineData.map((item, index) => (
                                <motion.div key={item.week} className="absolute w-full max-w-lg px-12" initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: currentStep === index + 1 ? 1 : 0, y: currentStep === index + 1 ? 0 : (currentStep > index + 1 ? -40 : 40), scale: currentStep === index + 1 ? 1 : 0.9, pointerEvents: currentStep === index + 1 ? 'auto' : 'none' }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], type: 'spring', stiffness: 200, damping: 25 }}>
                                    <h3 className="text-xl md:text-2xl font-medium text-[#DADBD3] mb-2">{item.week}</h3>
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#DADBD3] mb-6 leading-tight">
                                        {item.title}
                                    </h2>
                                    <p className="text-base md:text-lg font-medium" style={{ color: '#FFD700' }}>
                                        {item.date}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* desktop next arrow */}
                    <div className="absolute right-0 z-20">
                        <ArrowButton direction="right" onClick={handleNext} disabled={currentStep === totalSteps} />
                    </div>
                </div>

                {/* mobile layout */}
                <div className="lg:hidden flex flex-col h-full justify-center">
                    {/* mobile chessboard section */}
                    <div className="flex-shrink pt-10 sm:pt-20 pb-4 sm:pb-6 px-4 flex items-center justify-center">
                        <motion.div className="transform" style={{ transform: '', filter: 'drop-shadow(8px 12px 24px rgba(0, 0, 0, 0.4))' }}>
                            <div className="w-full sm:w-64 md:w-full">
                                <AnimatedChessboard currentMoveIndex={currentStep} />
                            </div>
                        </motion.div>
                    </div>

                    {/* mobile navigation circles */}
                    <div className="flex-shrink px-4 pb-4 md:pb-8 xl:pb-0">
                        <div className="max-w-xs mx-auto">
                            <div className="space-y-4">
                                <div className="grid grid-cols-7 gap-3 sm:gap-4 px-2 sm:px-4">
                                    {timelineData.slice(0, 7).map((item, index) => (
                                        <button key={`nav-mobile-top-${index}`} onClick={() => handleStepClick(index)} className="flex items-center justify-center z-10" aria-label={`Go to ${item.week}`}>
                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${currentStep === index + 1 ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-500/50' : 'bg-gray-600'}`}>
                                                <span className={`font-bold text-xs transition-all duration-300 ${currentStep === index + 1 ? 'text-black' : 'text-white'}`}>{index + 1}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-3 sm:gap-4 px-2 sm:px-4">
                                    {timelineData.slice(7, 14).map((item, index) => (
                                        <button key={`nav-mobile-bottom-${index}`} onClick={() => handleStepClick(index + 7)} className="flex items-center justify-center z-20" aria-label={`Go to ${item.week}`}>
                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center ${currentStep === index + 8 ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-500/50' : 'bg-gray-600'}`}>
                                                <span className={`font-bold text-xs transition-all duration-300 ${currentStep === index + 8 ? 'text-black' : 'text-white'}`}>{index + 8}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* mobile content section */}
                    <div className="flex-shrink px-4 py-6 sm:py-0">
                        <div className="relative flex items-center justify-center text-center min-h-[120px] sm:min-h-[140px]">
                            {/* mobile nav arrows */}
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-between px-4 sm:px-20 z-20">
                                <ArrowButton direction="left" onClick={handlePrevious} disabled={currentStep === 1} />
                                <ArrowButton direction="right" onClick={handleNext} disabled={currentStep === totalSteps} />
                            </div>

                            {/* mobile content */}
                            {timelineData.map((item, index) => (
                                <motion.div 
                                    key={item.week} 
                                    className="absolute w-full max-w-lg px-16 sm:px-8" 
                                    initial={{ opacity: 0, y: 40, scale: 0.9 }} 
                                    animate={{ 
                                        opacity: currentStep === index + 1 ? 1 : 0, 
                                        y: currentStep === index + 1 ? 0 : (currentStep > index + 1 ? -40 : 40), 
                                        scale: currentStep === index + 1 ? 1 : 0.9, 
                                        pointerEvents: currentStep === index + 1 ? 'auto' : 'none' 
                                    }} 
                                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], type: 'spring', stiffness: 200, damping: 25 }}
                                >
                                    <h3 className="text-lg sm:text-xl font-medium text-[#DADBD3] mb-2">{item.week}</h3>
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#DADBD3] mb-3 sm:mb-4 leading-tight">
                                        {item.title}
                                    </h2>
                                    <p className="text-sm sm:text-base font-medium" style={{ color: '#FFD700' }}>
                                        {item.date}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

        </div>
    );
};

export default Timeline;