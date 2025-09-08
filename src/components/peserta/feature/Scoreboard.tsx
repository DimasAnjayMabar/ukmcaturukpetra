/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../db_client/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to transform and rank participants
  const transformParticipants = (data: any[]): Participant[] => {
    return data
      .filter(user => user.role === 'peserta')
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .map((user, index) => ({
        id: user.id,
        name: user.name || `User ${user.id}`, // Changed from full_name to name
        score: user.total_score || 0,
        position: index + 1,
      }));
  };

  // Initial data fetch
  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .eq('role', 'peserta')
        .order('total_score', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const rankedParticipants = transformParticipants(data);
        setParticipants(rankedParticipants);
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError('Failed to load scoreboard data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchParticipants();
  };

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      // Initial fetch
      await fetchParticipants();

      // Set up real-time subscription
      channel = supabase
        .channel('user_profile_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'user_profile',
            filter: 'role=eq.peserta'
          },
          async (payload) => {
            console.log('Real-time update received:', payload);
            
            // Re-fetch all participants to ensure proper ranking
            // This is safer than trying to update individual records
            try {
              const { data, error } = await supabase
                .from('user_profile')
                .select('*')
                .eq('role', 'peserta')
                .order('total_score', { ascending: false });

              if (error) {
                console.error('Error refetching data:', error);
                return;
              }

              if (data) {
                const rankedParticipants = transformParticipants(data);
                setParticipants(rankedParticipants);
              }
            } catch (err) {
              console.error('Error updating participants:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
        });
    };

    setupRealtimeSubscription();

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span>Loading scoreboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-md text-red-500">
        {error}
        <button 
          onClick={handleRefresh}
          className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 sm:p-6 shadow-md">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-semibold">Scoreboard Peserta</h2>
        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Refresh scoreboard"
          >
            <RefreshCw 
              size={18} 
              className={isRefreshing ? 'animate-spin' : ''} 
            />
          </button>
          
          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Wifi size={16} />
                <span className="hidden sm:inline">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <WifiOff size={16} />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Scrollable table container */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap sm:px-6">
                Peringkat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap sm:px-6">
                Nama Peserta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap sm:px-6">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 sm:px-6">
                  Belum ada data peserta
                </td>
              </tr>
            ) : (
              participants.map((participant) => (
                <tr 
                  key={participant.id} 
                  className={`transition-colors duration-200 ${
                    participant.position <= 3 ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-200 ${
                        participant.position === 1
                          ? 'bg-yellow-400 text-yellow-900'
                          : participant.position === 2
                          ? 'bg-gray-300 text-gray-900'
                          : participant.position === 3
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {participant.position}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-900 sm:px-6">
                    {participant.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-900 sm:px-6">
                    {participant.score.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Scroll indicator for mobile */}
      {participants.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center sm:hidden">
          Geser ke samping untuk melihat lebih banyak
        </div>
      )}
    </div>
  );
};

export default Scoreboard;