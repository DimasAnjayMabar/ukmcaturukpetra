import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../db_client/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Wifi, WifiOff, ArrowLeft, Trophy } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  score: number;
  position: number;
}

const Scoreboard: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .animate-slide-down { animation: slideDown 1s ease-out; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
 
  const transformParticipants = (data: any[]): Participant[] => {
    return data
      .filter(user => user.role === 'peserta')
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((user, index) => ({
        id: user.id,
        name: user.name || `User ${user.id}`,
        score: user.total_score || 0,
        position: index + 1,
      }));
  };

  useEffect(() => {
    let channel: RealtimeChannel;
    const setupRealtimeSubscription = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('user_profile').select('*').eq('role', 'peserta').order('total_score', { ascending: false });
        if (error) throw error;
        if (data) setParticipants(transformParticipants(data));
      } catch (err) {
        setError('Failed to load scoreboard data');
      } finally {
        setLoading(false);
      }

      channel = supabase
        .channel('user_profile_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profile', filter: 'role=eq.peserta' }, async () => {
            const { data, error } = await supabase.from('user_profile').select('*').eq('role', 'peserta').order('total_score', { ascending: false });
            if (error) return;
            if (data) setParticipants(transformParticipants(data));
          }
        )
        .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-600">{error}</div>;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-t from-[#47618a] to-[#E3E1DA] bg-fixed">
      
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full z-10 pointer-events-none flex items-start justify-center">
        <img 
          src="/svg/blocks/trophy.svg" 
          alt="Scoreboard Trophy" 
          className="w-[40%] h-auto max-w-xs lg:w-[15vw] lg:max-w-sm lg:animate-slide-down" 
        />
      </div>

      <main className="relative z-10 p-4 sm:p-6 lg:p-8 pt-32 lg:pt-60 min-h-screen">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/20 hover:bg-black/30 text-gray-100 hover:text-white transition-all duration-300 group"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="rounded-3xl bg-[#0c1015]/90 backdrop-blur-xl border border-[#363E53]/50 p-6 sm:p-8 shadow-2xl">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-[#DADBD3] flex items-center gap-3">
                SCOREBOARD
              </h2>
              <div className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full backdrop-blur-md ${
                isConnected 
                  ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                  : 'bg-gray-800/50 text-gray-400 border border-gray-600/30'
              }`}>
                {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span>{isConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] lg:max-h-none lg:overflow-visible rounded-2xl bg-[#0a0b0f]/50 border border-[#363E53]/30">
              <table className="min-w-full">
                <thead className="bg-[#363E53]/20 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Rank</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Name</th>
                    <th className="px-3 sm:px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#DADBD3]/80">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#363E53]/20">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-[#DADBD3]/60">
                        <Trophy className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        No participants.
                      </td>
                    </tr>
                  ) : (
                    participants.map((p) => (
                      <tr key={p.id} className={`transition-colors duration-200 ${
                        p.position <= 3 ? 'bg-[#FFD700]/10 hover:bg-[#FFD700]/20' : 'hover:bg-[#363E53]/20'
                      }`}>
                        <td className="whitespace-nowrap px-3 sm:px-6 py-4">
                          <span className={`inline-flex items-center justify-center rounded-full w-8 h-8 text-xs sm:text-sm font-bold ${
                              p.position === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : p.position === 2 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            : p.position === 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
                            : 'bg-[#363E53]/30 text-[#DADBD3]/80 border border-[#363E53]/50'
                          }`}>
                            {p.position}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-sm sm:text-base font-medium text-[#DADBD3]">{p.name}</td>
                        <td className="whitespace-nowrap px-3 sm:px-6 py-4 text-sm sm:text-base font-bold text-[#FFD700]">{p.score.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Scoreboard;