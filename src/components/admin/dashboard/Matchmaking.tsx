/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../db_client/client';
import { Pertemuan, UserProfile, TournamentMatch, TournamentState } from '../../../types';
import Bracket from './Bracket';
import { pairPlayers } from '../../../utils/swiss';
import { TournamentStateService } from '../../../services/TournamentStateService';

interface Player extends UserProfile {
  score: number;
  playedOpponents: string[];
  tiebreak1: number; // Buchholz
  tiebreak2: number; // Sonneborn–Berger
}

// Initial state
const getInitialState = (): TournamentState => ({
  players: [],
  matches: [],
  currentRound: 1,
  totalRounds: 1,
  isRoundsSet: false,
  winner: null,
  maxCompletedRound: 0,
  allRoundsMatches: {},
  roundScores: [],
  metadata: {
    version: '1.0',
    lastUpdated: new Date().toISOString()
  }
});

const Matchmaking: React.FC = () => {
  const [state, setState] = useState<TournamentState>(getInitialState());
  const [tournaments, setTournaments] = useState<Pertemuan[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Destructure state untuk mudah digunakan
  const { 
    players, 
    matches, 
    currentRound, 
    totalRounds, 
    isRoundsSet, 
    winner, 
    maxCompletedRound, 
    allRoundsMatches, 
    roundScores 
  } = state;

  // Helper function untuk update state dan auto-save
  const updateState = async (updates: Partial<TournamentState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    
    // Auto-save ke database jika tournament dipilih
    if (selectedTournament) {
      try {
        await TournamentStateService.saveState(selectedTournament, newState);
      } catch (error) {
        console.error('Failed to auto-save state:', error);
      }
    }
  };

  // Fetch list tournament
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from('pertemuan')
        .select('*')
        .eq('is_tournament', true);
      if (error) setError(error.message);
      else setTournaments(data || []);
    };
    fetchTournaments();
  }, []);

  // Load state dari database saat tournament dipilih
  useEffect(() => {
    if (selectedTournament) {
      loadTournamentState(selectedTournament);
    } else {
      // Reset ke initial state jika tidak ada tournament dipilih
      setState(getInitialState());
    }
  }, [selectedTournament]);

  const loadTournamentState = async (tournamentId: string) => {
    setIsLoading(true);
    try {
      const savedState = await TournamentStateService.loadState(tournamentId);
      
      if (savedState) {
        // Restore state dari database
        setState(savedState);
        console.log('✅ Tournament state loaded from database');
      } else {
        // Jika tidak ada state tersimpan, fetch data fresh
        await fetchTournamentData(tournamentId);
      }
    } catch (error: any) {
      console.error('Error loading state:', error);
      setError(`Error loading tournament: ${error.message}`);
      // Fallback: fetch data fresh
      await fetchTournamentData(tournamentId);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription untuk sync antar admin
  useEffect(() => {
    if (!selectedTournament) return;

    const channel = supabase
      .channel(`tournament:${selectedTournament}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_state',
          filter: `pertemuan_id=eq.${selectedTournament}`
        },
        (payload) => {
          console.log('🔄 State updated by other admin, refreshing...');
          loadTournamentState(selectedTournament);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTournament]);

  const updateTiebreakersToDatabase = async (players: Player[]) => {
    if (!selectedTournament) return;

    try {
      const updatePromises = players.map(async (player) => {
        const { error } = await supabase
          .from('user_profile')
          .update({
            total_score: player.score,
            tb1_direct_encounter: player.tiebreak1,
            tb2_buchholz: player.tiebreak2
          })
          .eq('id', player.id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);
      console.log('Scores and tiebreakers updated successfully');
    } catch (error: any) {
      console.error('Error updating stats:', error);
      setError(`Error updating stats: ${error.message}`);
    }
  };

  const fetchTournamentData = async (tournamentId: string, preserveRound?: number) => {
    // Fetch peserta
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('kehadiran')
      .select('user_profile:user_id(*)')
      .eq('pertemuan_id', tournamentId)
      .eq('isAttending', true);

    if (attendanceError) {
      setError(attendanceError.message);
      return;
    }

    // Fetch semua match
    const { data: matchData, error: matchError } = await supabase
      .from('turnamen')
      .select('*')
      .eq('pertemuan_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_ke', { ascending: true });

    if (matchError) {
      setError(matchError.message);
      return;
    }

    // Process data sama seperti sebelumnya
    const matchesByRound: Record<number, TournamentMatch[]> = {};
    let maxRound = 0;
    matchData.forEach((match: any) => {
      const round = match.round;
      if (!matchesByRound[round]) matchesByRound[round] = [];
      matchesByRound[round].push(match);
      maxRound = Math.max(maxRound, round);
    });

    let maxCompletedRoundLocal = 0;
    Object.entries(matchesByRound).forEach(([roundKey, roundMatches]) => {
      const roundNum = Number(roundKey);
      const isCompleted = roundMatches.every(m => m.hasil_pemain_1 !== null);
      if (isCompleted) maxCompletedRoundLocal = Math.max(maxCompletedRoundLocal, roundNum);
    });

    const initialPlayersMap: Record<string, Player> = {};
    attendanceData.forEach((item: any) => {
      const user = item.user_profile;
      initialPlayersMap[user.id] = {
        ...user,
        score: 0,
        playedOpponents: [],
        tiebreak1: 0,
        tiebreak2: 0
      };
    });

    const cumulativePlayersMap = JSON.parse(JSON.stringify(initialPlayersMap));

    // Calculate scores and tiebreakers
    for (let r = 1; r <= maxRound; r++) {
      if (matchesByRound[r]?.every(m => m.hasil_pemain_1 !== null)) {
        matchesByRound[r].forEach((match: any) => {
          const p1 = cumulativePlayersMap[match.pemain_1_id];
          const p2 = cumulativePlayersMap[match.pemain_2_id];
          if (p1) p1.score += match.hasil_pemain_1;
          if (p2) p2.score += match.hasil_pemain_2;
          if (p1 && p2) {
            p1.playedOpponents.push(p2.id);
            p2.playedOpponents.push(p1.id);
          }
        });
      }
    }

    // Calculate tiebreakers
    Object.values(cumulativePlayersMap).forEach(p => {
      let directEncounterTotal = 0;
      for (const round of Object.values(matchesByRound)) {
        round.forEach((match: any) => {
          if (match.hasil_pemain_1 == null) return;
          if (match.pemain_1_id === p.id) {
            directEncounterTotal += match.hasil_pemain_1;
          } else if (match.pemain_2_id === p.id) {
            directEncounterTotal += match.hasil_pemain_2;
          }
        });
      }
      p.tiebreak1 = directEncounterTotal;

      p.tiebreak2 = p.playedOpponents.reduce(
        (sum, oppId) => sum + (cumulativePlayersMap[oppId]?.score || 0),
        0
      );
    });

    // Update scores dan tiebreakers ke database
    const playersArray = Object.values(cumulativePlayersMap) as Player[];
    await updateTiebreakersToDatabase(playersArray);

    // Determine winner
    const effectiveTotalRounds = isRoundsSet ? totalRounds : maxRound;
    let tournamentWinner = null;
    if (maxCompletedRoundLocal >= effectiveTotalRounds && effectiveTotalRounds > 0) {
      const sortedPlayers = playersArray.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.tiebreak1 !== a.tiebreak1) return b.tiebreak1 - a.tiebreak1;
        return b.tiebreak2 - a.tiebreak2;
      });
      if (sortedPlayers.length > 0) tournamentWinner = sortedPlayers[0].name;
    }

    // Determine current round to show
    const nextRound = maxCompletedRoundLocal + 1;
    const roundToShow = typeof preserveRound === 'number'
      ? Math.max(1, preserveRound)
      : Math.max(1, nextRound > maxRound ? maxRound : nextRound);

    // Prepare scores for current round
    const scoresForRoundMap = new Map<string, number>();
    const playersMapForRound = JSON.parse(JSON.stringify(initialPlayersMap));
    for (let r = 1; r < Math.max(1, roundToShow); r++) {
      matchesByRound[r]?.forEach((match: any) => {
        if (playersMapForRound[match.pemain_1_id]) playersMapForRound[match.pemain_1_id].score += match.hasil_pemain_1;
        if (playersMapForRound[match.pemain_2_id]) playersMapForRound[match.pemain_2_id].score += match.hasil_pemain_2;
      });
    }
    Object.values(playersMapForRound).forEach((p: any) => scoresForRoundMap.set(p.id, p.score));

    // Update state dengan data yang di-fetch
    await updateState({
      players: playersArray,
      matches: matchesByRound[roundToShow] || [],
      currentRound: roundToShow,
      maxCompletedRound: maxCompletedRoundLocal,
      allRoundsMatches: matchesByRound,
      roundScores: Array.from(scoresForRoundMap.entries()),
      winner: tournamentWinner
    });
  };

  const handleGenerateMatches = async () => {
    if (allRoundsMatches[currentRound]?.length > 0) {
      setError(`Matches for round ${currentRound} already exist!`);
      return;
    }

    const pairedMatches = pairPlayers(players);
    
    const newMatches: TournamentMatch[] = pairedMatches.map((match, i) => {
      const isBye = !match.player2;
      return {
        pertemuan_id: Number(selectedTournament),
        round: currentRound,
        match_ke: i + 1,
        pairingId: i + 1,
        pemain_1_id: match.player1.id,
        pemain_1_name: match.player1.name,
        pemain_2_id: match.player2?.id || 'BYE',
        pemain_2_name: match.player2?.name || 'BYE',
        pemenang: isBye ? match.player1.id : undefined,
        hasil_pemain_1: isBye ? 1 : undefined,
        hasil_pemain_2: isBye ? 0 : undefined,
      } as TournamentMatch;
    });

    // Auto-set results untuk BYE matches
    const matchesWithByeResults = newMatches.map(match => {
      const isByeMatch = match.pemain_2_id === 'BYE';
      if (isByeMatch) {
        return {
          ...match,
          pemenang: match.pemain_1_id,
          hasil_pemain_1: 1,
          hasil_pemain_2: 0
        };
      }
      return match;
    });

    await updateState({
      matches: matchesWithByeResults,
      allRoundsMatches: {
        ...allRoundsMatches,
        [currentRound]: matchesWithByeResults
      }
    });

    setError(null);
  };

  const handleSetWinner = (pairingId: number, matchId: number | undefined, winnerId: string) => {
    const updatedMatches = matches.map(m => {
      if (m.pairingId === pairingId && (matchId === undefined || m.id === matchId)) {
        return { ...m, pemenang: winnerId };
      }
      return m;
    });
    updateState({ matches: updatedMatches });
  };

  const handleSetTie = (pairingId: number, matchId: number | undefined) => {
    const updatedMatches = matches.map(m => {
      if (m.pairingId === pairingId && (matchId === undefined || m.id === matchId)) {
        return { ...m, pemenang: 'TIE' };
      }
      return m;
    });
    updateState({ matches: updatedMatches });
  };

  const handleSaveResults = async () => {
    if (!matches.every(m => m.pemenang !== undefined)) {
      setError('Please set results for all matches before saving');
      return;
    }

    try {
      const matchesToSave = matches.map(match => ({
        pertemuan_id: match.pertemuan_id,
        round: match.round, 
        match_ke: match.match_ke,
        pairingId: match.pairingId,
        pemain_1_id: match.pemain_1_id,
        pemain_1_name: match.pemain_1_name,
        pemain_2_id: match.pemain_2_id,
        pemain_2_name: match.pemain_2_name,
        pemenang: match.pemenang!,
        hasil_pemain_1: match.pemenang === 'TIE' ? 0.5 : (match.pemenang === match.pemain_1_id ? 1 : 0),
        hasil_pemain_2: match.pemenang === 'TIE' ? 0.5 : (match.pemenang === match.pemain_2_id ? 1 : 0),
        ...(match.id && { id: match.id }),
      }));

      const { error } = await supabase.from('turnamen').upsert(matchesToSave);
      if (error) throw error;

      // Refresh data tournament untuk kalkulasi tiebreaker terbaru
      if (selectedTournament) {
        await fetchTournamentData(selectedTournament, currentRound);
      }

      setError(null);
    } catch (error: any) {
      setError(`Error saving results: ${error.message}`);
    }
  };

  const handleRoundChange = async (newRound: number) => {
    if (selectedTournament) {
      await fetchTournamentData(selectedTournament, newRound);
    }
  };

  const handleSetRounds = () => {
    if (totalRounds >= 1 && totalRounds <= 20) {
      updateState({ 
        isRoundsSet: true,
        currentRound: 1 // Reset ke round 1 saat mulai tournament
      });
    } else {
      setError("Total rounds must be between 1-20.");
    }
  };

  const canGenerateRound = (round: number) => {
    return round >= 1 &&
          round <= totalRounds && 
          !allRoundsMatches[round]?.length && 
          (round === 1 || isRoundCompleted(round - 1));
  };

  const isRoundCompleted = (round: number) => {
    const roundMatches = allRoundsMatches[round];
    if (!roundMatches?.length) return false;
    return roundMatches.every(match => match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null);
  };

  const getRoundStatus = (round: number) => {
    if (!allRoundsMatches[round]?.length) return 'not-generated';
    if (isRoundCompleted(round)) return 'completed';
    return 'in-progress';
  };

  // Tambahkan loading indicator
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading tournament data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Tournament System</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {winner && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p className="font-bold">🏆 Tournament Complete!</p>
          <p className="text-lg">Champion: <span className="font-bold">{winner}</span></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="tournament-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Tournament
          </label>
          <select
            id="tournament-select"
            value={selectedTournament || ''}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={isRoundsSet}
          >
            <option value="" disabled>Select a tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.judul_pertemuan}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="total-rounds" className="block text-sm font-medium text-gray-700 mb-1">
            Total Rounds
          </label>
          <input
            type="text"
            id="total-rounds"
            value={totalRounds === 0 ? '' : totalRounds}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '') {
                updateState({ totalRounds: 0 });
                return;
              }
              if (/^\d+$/.test(value)) {
                const numValue = Number(value);
                if (numValue >= 1 && numValue <= 20) {
                  updateState({ totalRounds: numValue });
                }
              }
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (value === '' || Number(value) < 1) {
                updateState({ totalRounds: 1 });
              } else if (Number(value) > 20) {
                updateState({ totalRounds: 20 });
              }
            }}
            placeholder="Enter number of rounds (1-20)"
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={isRoundsSet}
          />
          {totalRounds === 0 && (
            <p className="text-xs text-red-500 mt-1">Please enter a number between 1-20</p>
          )}
        </div>
      </div>

      {!isRoundsSet && selectedTournament && (
        <div className="mb-6">
          <button
            onClick={handleSetRounds}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            Set Rounds and Start
          </button>
        </div>
      )}

      {isRoundsSet && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Tournament Progress</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
                const status = getRoundStatus(round);
                const isActive = round === currentRound;
                
                let bgColor = 'bg-gray-200 text-gray-600';
                let statusIcon = '⏸️';
                
                if (status === 'completed') {
                  bgColor = 'bg-green-500 text-white';
                  statusIcon = '✅';
                } else if (status === 'in-progress') {
                  bgColor = 'bg-yellow-500 text-white';
                  statusIcon = '⏳';
                }
                
                if (isActive) {
                  bgColor += ' ring-2 ring-blue-500';
                }

                return (
                  <button
                    key={round}
                    onClick={() => handleRoundChange(round)}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${bgColor} hover:opacity-80`}
                    disabled={!isRoundCompleted(round - 1) && round > 1 && round > maxCompletedRound + 1}
                  >
                    {statusIcon} Round {round}
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              <p>✅ Completed | ⏳ In Progress | ⏸️ Not Started | Current Round: <span className="font-bold">Round {currentRound}</span></p>
            </div>
          </div>

          {players.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Current Standings</h2>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TB1 / TB2</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matches</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {[...players]
                      .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        if (b.tiebreak1 !== a.tiebreak1) return b.tiebreak1 - a.tiebreak1;
                        return b.tiebreak2 - a.tiebreak2;
                      })
                      .map((player, index) => (
                        <tr key={player.id} className={index === 0 && winner ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index === 0 && winner ? '🏆' : `#${index + 1}`}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{player.score}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{player.tiebreak1.toFixed(1)} / {player.tiebreak2.toFixed(1)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{player.playedOpponents.length}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleGenerateMatches}
                disabled={!canGenerateRound(currentRound) || !!winner}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <span>🎯</span>
                Generate Round {currentRound} Matches
              </button>
              
              <button
                onClick={handleSaveResults}
                disabled={matches.length === 0 || matches.some(m => m.pemenang === undefined) || !!winner}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <span>💾</span>
                Save Round Results
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              {!canGenerateRound(currentRound) && !allRoundsMatches[currentRound]?.length && (
                <p>⚠️ Complete previous round before generating Round {currentRound}</p>
              )}
              {allRoundsMatches[currentRound]?.length > 0 && (
                <p>✅ Round {currentRound} matches generated ({matches.length} matches)</p>
              )}
            </div>
          </div>

          <Bracket
            matches={matches}
            roundScores={new Map(roundScores)}
            onSetWinner={handleSetWinner}
            onSetTie={handleSetTie}
            roundNumber={currentRound}
          />
        </>
      )}
    </div>
  );
};

export default Matchmaking;