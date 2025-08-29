import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Play, Pause, RotateCcw, Timer, ArrowLeft } from 'lucide-react';
import Picker from 'react-mobile-picker';

const TimeSetupModal: React.FC<{ onStart: (time: number) => void }> = ({ onStart }) => {
  const [time, setTime] = useState({ minutes: 5, seconds: 0 });
  const navigate = useNavigate();

  const pickerOptions = {
    minutes: Array.from({ length: 91 }, (_, i) => i),
    seconds: Array.from({ length: 60 }, (_, i) => i),
  };

  const handlePreset = (mins: number) => {
    setTime({ minutes: mins, seconds: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSeconds = time.minutes * 60 + time.seconds;
    if (totalSeconds > 0) {
      onStart(totalSeconds);
    }
  };
  
  // css injection, hide scrollbar
  useEffect(() => {
    const styleId = 'picker-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .picker-column-internal {
        scrollbar-width: none;
      }
      .picker-column-internal::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }, []);


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
    >
      <div className="bg-gradient-to-br from-[#1D252D] to-[#0c1015] border border-[#363E53]/50 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-md text-white">
        <h2 className="text-3xl font-bold text-center mb-6 text-[#DADBD3] flex items-center justify-center gap-3">
          {/* <Timer className="text-[#FFD700]" /> */}
          SET TIME
        </h2>

        {/* react mobile picker wheel, scrollable on mobile */}
        <div className="relative h-48 flex items-center justify-center text-4xl font-mono my-4 text-[#DADBD3]">
            <div className="absolute top-0 left-0 w-full h-[38%] bg-gradient-to-b from-[#151c24] via-[#151c24]/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-[38%] bg-gradient-to-t from-[#151c24] via-[#151c24]/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute w-full h-[44px] bg-white/5 border-y border-white/10 z-0" />
            <span className="absolute text-4xl font-mono pointer-events-none pb-1 z-10">:</span>

            <Picker value={time} onChange={setTime} itemHeight={44}>
              <Picker.Column name="minutes">
                {pickerOptions.minutes.map(m => (
                  <Picker.Item key={m} value={m}>
                    {({ selected }) => (
                      <div className={`px-8 transition-opacity duration-200 ${selected ? 'opacity-100 text-white' : 'opacity-40'}`}>
                        {String(m).padStart(2, '0')}
                      </div>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
              <Picker.Column name="seconds">
                {pickerOptions.seconds.map(s => (
                  <Picker.Item key={s} value={s}>
                    {({ selected }) => (
                       <div className={`px-8 transition-opacity duration-200 ${selected ? 'opacity-100 text-white' : 'opacity-40'}`}>
                        {String(s).padStart(2, '0')}
                      </div>
                    )}
                  </Picker.Item>
                ))}
              </Picker.Column>
            </Picker>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => handlePreset(2)} className="py-3 bg-[#363E53]/30 hover:bg-[#363E53]/60 rounded-lg text-lg font-semibold transition-colors">2 min</button>
          <button onClick={() => handlePreset(5)} className="py-3 bg-[#363E53]/30 hover:bg-[#363E53]/60 rounded-lg text-lg font-semibold transition-colors">5 min</button>
        </div>
        <div className="space-y-3 pt-4">
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-gradient-to-br from-yellow-400 to-yellow-500 text-black text-xl font-bold rounded-lg hover:brightness-110 transition-all duration-300 shadow-lg shadow-yellow-500/20"
            >
              Continue
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 bg-black/20 text-gray-300 font-semibold rounded-lg hover:bg-black/40 transition-colors"
            >
              Return
            </button>
        </div>
      </div>
    </motion.div>
  );
};


const CountdownOverlay: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [count]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={count}
                    initial={{ opacity: 0, scale: 0.5, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -50 }}
                    transition={{ duration: 0.4, ease: "backOut" }}
                    className="text-9xl font-bold text-white"
                >
                    {count > 0 ? count : ''}
                </motion.div>
            </AnimatePresence>
            <button onClick={onCancel} className="mt-8 p-3 rounded-full bg-black/20 text-gray-400 hover:text-white hover:bg-black/40 transition-colors">
                <X size={32} />
            </button>
        </motion.div>
    );
};


const ChessClock: React.FC = () => {
    type GamePhase = 'setup' | 'countdown' | 'playing' | 'paused' | 'finished';

    const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
    const [initialTime, setInitialTime] = useState(300);
    const [player1Time, setPlayer1Time] = useState(initialTime);
    const [player2Time, setPlayer2Time] = useState(initialTime);
    const [activePlayer, setActivePlayer] = useState<'player1' | 'player2' | null>(null);

    useEffect(() => {
        if (gamePhase !== 'playing' || !activePlayer) return;

        const timer = setInterval(() => {
            if (activePlayer === 'player1') {
                setPlayer1Time(t => t - 1);
            } else {
                setPlayer2Time(t => t - 1);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [gamePhase, activePlayer]);

    useEffect(() => {
        if (player1Time <= 0 || player2Time <= 0) {
            setGamePhase('finished');
            setActivePlayer(null);
        }
    }, [player1Time, player2Time]);
    
    const handleTimeSet = (timeInSeconds: number) => {
        setInitialTime(timeInSeconds);
        setPlayer1Time(timeInSeconds);
        setPlayer2Time(timeInSeconds);
        setGamePhase('countdown');
    };

    const handleCountdownEnd = () => {
        setGamePhase('playing');
        setActivePlayer('player2');
    };
    
    const handleCancelCountdown = () => {
        setGamePhase('setup');
    };

    const handlePassTurn = (currentPlayer: 'player1' | 'player2') => {
        if (gamePhase !== 'playing' || activePlayer !== currentPlayer) return;
        setActivePlayer(currentPlayer === 'player1' ? 'player2' : 'player1');
    };

    const handlePauseToggle = () => {
        setGamePhase(gamePhase === 'playing' ? 'paused' : 'playing');
    };

    const handleReset = useCallback(() => {
        setGamePhase('setup');
        setPlayer1Time(initialTime);
        setPlayer2Time(initialTime);
        setActivePlayer(null);
    }, [initialTime]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const getPlayerClasses = (player: 'player1' | 'player2') => {
        const isActive = activePlayer === player && gamePhase === 'playing';
        const baseClasses = 'flex-1 flex items-center justify-center cursor-pointer transition-all duration-300';
        
        const activeGradient = 'bg-gradient-to-br from-yellow-400 to-yellow-500';
        const activeText = player === 'player1' ? 'text-black' : 'text-black/90';

        if (player === 'player1') { // player 1 = dark
            const inactiveGradient = 'bg-gradient-to-br from-[#1D252D] to-[#0c1015]';
            return `${baseClasses} text-[#DADBD3] ${isActive ? `${activeGradient} ${activeText}` : inactiveGradient}`;
        }
        const inactiveGradient = 'bg-gradient-to-br from-[#e3e1da] to-[#47618a]';
        return `${baseClasses} text-[#0f1028] transform rotate-180 ${isActive ? `${activeGradient} ${activeText}` : inactiveGradient}`;
    };

    return (
        <div className="h-screen w-full flex flex-col font-sans select-none overflow-hidden">
            <AnimatePresence>
                {gamePhase === 'setup' && <TimeSetupModal onStart={handleTimeSet} />}
                {gamePhase === 'countdown' && <CountdownOverlay onCancel={handleCancelCountdown} />}
            </AnimatePresence>
            
            {gamePhase === 'countdown' && <div style={{display: 'none'}}><Countdown onEnd={handleCountdownEnd} /></div>}

            <div className={getPlayerClasses('player2')} onClick={() => handlePassTurn('player2')}>
                <h1 className="text-[10rem] lg:text-[15rem] font-bold tracking-tighter">{formatTime(player2Time)}</h1>
            </div>

            <div className="bg-gradient-to-t from-[#1D252D] to-[#0c1015] text-white py-4 flex justify-center items-center gap-6">
                <Link to="/" className="absolute left-4 text-gray-400 hover:text-white transition-colors"><ArrowLeft size={28} /></Link>
                <button onClick={handleReset} className="p-3 bg-black/20 rounded-full hover:bg-black/40 transition-colors"><RotateCcw size={28} /></button>
                <button onClick={handlePauseToggle} className="p-5 bg-black/20 rounded-full hover:bg-black/40 transition-colors">
                    {gamePhase === 'playing' ? <Pause size={40} /> : <Play size={40} />}
                </button>
                <button onClick={() => setGamePhase('setup')} className="p-3 bg-black/20 rounded-full hover:bg-black/40 transition-colors"><Settings size={28} /></button>
            </div>

            <div className={getPlayerClasses('player1')} onClick={() => handlePassTurn('player1')}>
                <h1 className="text-[10rem] lg:text-[15rem] font-bold tracking-tighter">{formatTime(player1Time)}</h1>
            </div>
        </div>
    );
};

const Countdown: React.FC<{ onEnd: () => void }> = ({ onEnd }) => {
    useEffect(() => {
        const timer = setTimeout(onEnd, 3000);
        return () => clearTimeout(timer);
    }, [onEnd]);
    return null;
};

export default ChessClock;