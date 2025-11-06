import { TournamentMatch } from '../../../types';

interface BracketProps {
  matches: TournamentMatch[];
  roundScores: Map<number, string>;
  onSetWinner: (pairingId: number, matchId: number, winnerId: string) => void;
  onSetTie: (pairingId: number, matchId: number) => void;
  roundNumber?: number;
  playerScores?: Map<string, number>;
}

const Bracket: React.FC<BracketProps> = ({ 
  matches, 
  roundScores, 
  onSetWinner, 
  onSetTie, 
  roundNumber = 1,
  playerScores = new Map()
}) => {
  // Helper to check if match is BYE - checks BOTH players
  const isByeMatch = (match: TournamentMatch) => {
    // Check Player 2 (most common case)
    const p2IsBye = !match.pemain_2_id || 
                    match.pemain_2_id === 'BYE' || 
                    match.pemain_2_id === 'null' ||
                    match.pemain_2_name === 'BYE';
    
    // Check Player 1 (edge case where BYE is assigned to Player 1)
    const p1IsBye = match.pemain_1_id === 'BYE' || 
                    match.pemain_1_name === 'BYE';
    
    return p2IsBye || p1IsBye;
  };

  // Helper to safely get match ID
  const getMatchId = (match: TournamentMatch): number | null => {
    return match.id ?? null;
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 min-h-[400px] flex items-center justify-center">
        <div className="text-6xl mb-4">🎯</div>
        <p className="text-xl text-gray-500 mb-2">No matches for Round {roundNumber}</p>
        <p className="text-sm text-gray-400">Generate matches to get started!</p>
      </div>
    );
  }

  const getMatchStatus = (match: TournamentMatch) => {
    const matchId = getMatchId(match);
    if (matchId === null) return { status: 'error', icon: '❌', color: 'border-red-300 bg-red-50' };

    const winner = roundScores.get(matchId);
    
    // BYE match
    if (isByeMatch(match)) {
      return { status: 'bye', icon: '🎯', color: 'border-purple-300 bg-purple-50' };
    }
    
    if (winner === "tie") {
      return { status: 'tie', icon: '🤝', color: 'border-yellow-300 bg-yellow-50' };
    } else if (winner) {
      return { status: 'winner-selected', icon: '✅', color: 'border-green-300 bg-green-50' };
    }
    
    // Check if match already has results in database
    if (match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null) {
      if (match.hasil_pemain_1 === match.hasil_pemain_2) {
        return { status: 'tie-saved', icon: '🤝', color: 'border-yellow-400 bg-yellow-100' };
      }
      return { status: 'completed-saved', icon: '🏆', color: 'border-green-400 bg-green-100' };
    }
    
    return { status: 'waiting', icon: '⏸️', color: 'border-gray-200 bg-white' };
  };

  const isMatchSavedToDatabase = (match: TournamentMatch) => {
    return match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null;
  };

  const getWinnerForMatch = (match: TournamentMatch) => {
    const matchId = getMatchId(match);
    if (matchId === null) return null;

    // Check if it's a BYE match
    const isBye = isByeMatch(match);
    if (isBye) {
      // Return the non-BYE player as winner
      if (match.pemain_1_id !== 'BYE' && match.pemain_1_name !== 'BYE') {
        console.log(`🔍 Bracket: Match ${matchId} BYE winner (P1):`, match.pemain_1_id);
        return match.pemain_1_id;
      }
      if (match.pemain_2_id && match.pemain_2_id !== 'BYE' && match.pemain_2_name !== 'BYE') {
        console.log(`🔍 Bracket: Match ${matchId} BYE winner (P2):`, match.pemain_2_id);
        return match.pemain_2_id;
      }
    }

    // Check roundScores for new selections
    const winner = roundScores.get(matchId);
    if (winner !== undefined) {
      console.log(`🔍 Bracket: Match ${matchId} winner from state:`, winner);
      return winner;
    }
    
    // Fallback to database value
    if (match.pemenang) {
      console.log(`🔍 Bracket: Match ${matchId} winner from DB:`, match.pemenang);
      return match.pemenang;
    }

    console.log(`🔍 Bracket: Match ${matchId} no winner yet`);
    return null;
  };

  const isTie = (match: TournamentMatch) => {
    const matchId = getMatchId(match);
    if (matchId === null) return false;

    const winner = roundScores.get(matchId);
    if (winner === "tie") return true;
    
    // Check database for saved tie
    return match.hasil_pemain_1 !== null && 
           match.hasil_pemain_2 !== null && 
           match.hasil_pemain_1 === match.hasil_pemain_2;
  };

  const getPlayerScore = (playerId: string | null) => {
    if (!playerId) return 0;
    return playerScores.get(playerId) || 0;
  };

  const formatScore = (score: number) => {
    return Number(score).toFixed(1);
  };

  console.log("\n" + "█".repeat(80));
  console.log("🎨 BRACKET RENDER:");
  console.log(`   Match count: ${matches.length}`);
  console.log(`   Scores Map size: ${roundScores.size}`);
  console.log(`   Round number: ${roundNumber}`);
  
  if (roundScores.size > 0) {
    console.log("   Scores received from parent:");
    Array.from(roundScores.entries()).forEach(([matchId, winnerId]) => {
      const match = matches.find(m => m.id === matchId);
      console.log(`      Match ${matchId} (Board ${match?.match_ke}) → "${winnerId}"`);
    });
  } else {
    console.log("   ⚠️ NO SCORES RECEIVED FROM PARENT!");
  }
  
  // Check BYE matches specifically
  const byeMatches = matches.filter(m => isByeMatch(m));
  if (byeMatches.length > 0) {
    console.log(`   BYE Matches found: ${byeMatches.length}`);
    byeMatches.forEach(match => {
      const matchId = getMatchId(match);
      const hasScore = matchId ? roundScores.has(matchId) : false;
      const scoreValue = matchId ? roundScores.get(matchId) : 'N/A';
      console.log(`      Board ${match.match_ke} (ID ${matchId}):`, {
        p1: match.pemain_1_name,
        p2: match.pemain_2_name,
        hasScoreInMap: hasScore,
        scoreValue: scoreValue
      });
    });
  }
  console.log("█".repeat(80) + "\n");

  return (
    <div className="space-y-4 min-h-[400px]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🏆 Round {roundNumber} Matches
        </h2>
        <div className="flex justify-center gap-6 text-sm text-gray-600 flex-wrap">
          <div className="flex items-center gap-1">
            <span>⏸️</span> Waiting for Result
          </div>
          <div className="flex items-center gap-1">
            <span>✅</span> Result Selected (Not Saved)
          </div>
          <div className="flex items-center gap-1">
            <span>🤝</span> Tie Selected (Not Saved)
          </div>
          <div className="flex items-center gap-1">
            <span>🏆</span> Completed (Saved)
          </div>
          <div className="flex items-center gap-1">
            <span>🤝</span> Tie (Saved)
          </div>
          <div className="flex items-center gap-1">
            <span>🎯</span> BYE Match (Auto Win)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {matches.map((match, index) => {
          const matchId = getMatchId(match);
          const matchStatus = getMatchStatus(match);
          const isBye = isByeMatch(match);
          const currentWinner = getWinnerForMatch(match);
          const tie = isTie(match);
          const isSaved = isMatchSavedToDatabase(match);

          const player1Score = getPlayerScore(match.pemain_1_id);
          const player2Score = getPlayerScore(match.pemain_2_id);

          console.log(`\n🎨 Rendering Match ${matchId} (Board ${match.match_ke}):`);
          console.log(`   isBye: ${isBye}`);
          console.log(`   p1_id: ${match.pemain_1_id}, p1_name: ${match.pemain_1_name}`);
          console.log(`   p2_id: ${match.pemain_2_id}, p2_name: ${match.pemain_2_name}`);
          console.log(`   currentWinner: ${currentWinner}`);
          console.log(`   hasScoreInMap: ${matchId ? roundScores.has(matchId) : false}`);

          // Determine if P1 or P2 is BYE for rendering
          const p1IsBye = match.pemain_1_id === 'BYE' || match.pemain_1_name === 'BYE';
          const p2IsBye = !match.pemain_2_id || match.pemain_2_id === 'BYE' || match.pemain_2_name === 'BYE';

          return (
            <div 
              key={matchId ?? `match-${index}`}
              className={`p-4 rounded-lg shadow-md border-2 transition-all ${matchStatus.color} ${
                isBye ? 'border-purple-400' : ''
              }`}
            >
              {/* Match Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-700">
                  Board {match.match_ke}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {matchStatus.icon}
                  </span>
                  {isBye && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                      BYE
                    </span>
                  )}
                  {isSaved && !isBye && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Saved
                    </span>
                  )}
                  {isSaved && isBye && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Auto Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Players */}
              <div className="space-y-3">
                {/* Player 1 */}
                <div className={`p-3 rounded-lg border-2 ${
                  p1IsBye 
                    ? 'bg-gray-100 border-gray-300'
                    : (currentWinner === match.pemain_1_id && !tie)
                      ? 'bg-green-100 border-green-400 shadow-sm' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  {p1IsBye ? (
                    <div className="text-center py-2">
                      <p className="font-bold text-xl text-gray-500">🎯 BYE</p>
                      <p className="text-sm text-gray-400 mt-1">Automatic Win for {match.pemain_2_name}</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg">
                              {match.pemain_1_name || 'Player 1'}
                            </p>
                            <p className="text-xs text-gray-500">White</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">
                              {formatScore(player1Score)}
                            </p>
                            <p className="text-xs text-gray-500">Score</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-3">
                        {!isBye && !isSaved && matchId && (
                          <button
                            onClick={() => onSetWinner(match.pairingId!, matchId, match.pemain_1_id!)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              currentWinner === match.pemain_1_id && !tie
                                ? 'bg-green-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {currentWinner === match.pemain_1_id && !tie ? '👑 Winner' : 'Set Winner'}
                          </button>
                        )}
                        {isSaved && currentWinner === match.pemain_1_id && !tie && (
                          <span className="text-green-500 text-xl">👑</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* VS Divider */}
                {!isBye && (
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-400">VS</span>
                  </div>
                )}

                {/* Player 2 */}
                <div className={`p-3 rounded-lg border-2 ${
                  p2IsBye 
                    ? 'bg-gray-100 border-gray-300'
                    : (currentWinner === match.pemain_2_id && !tie)
                      ? 'bg-green-100 border-green-400 shadow-sm' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  {p2IsBye ? (
                    <div className="text-center py-2">
                      <p className="font-bold text-xl text-gray-500">🎯 BYE</p>
                      <p className="text-sm text-gray-400 mt-1">Automatic Win for {match.pemain_1_name}</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg">
                              {match.pemain_2_name || 'Player 2'}
                            </p>
                            <p className="text-xs text-gray-500">Black</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-blue-600">
                              {formatScore(player2Score)}
                            </p>
                            <p className="text-xs text-gray-500">Score</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-3">
                        {!isSaved && matchId && (
                          <button
                            onClick={() => onSetWinner(match.pairingId!, matchId, match.pemain_2_id!)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              currentWinner === match.pemain_2_id && !tie
                                ? 'bg-green-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {currentWinner === match.pemain_2_id && !tie ? '👑 Winner' : 'Set Winner'}
                          </button>
                        )}
                        {isSaved && currentWinner === match.pemain_2_id && !tie && (
                          <span className="text-green-500 text-xl">👑</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tie Button */}
              {!isSaved && !isBye && matchId && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => onSetTie(match.pairingId!, matchId)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      tie
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {tie ? '🤝 Tie Selected' : '🤝 Set as Tie'}
                  </button>
                </div>
              )}

              {/* Match Result Display */}
              {(currentWinner || tie || isBye) && (
                <div className="mt-3 text-center">
                  <div className={`text-sm rounded-md py-2 font-medium ${
                    isBye 
                      ? 'text-purple-800 bg-purple-100 border border-purple-200' 
                      : tie
                      ? 'text-yellow-800 bg-yellow-100 border border-yellow-200'
                      : 'text-green-800 bg-green-100 border border-green-200'
                  }`}>
                    {tie ? (
                      <span>🤝 Match ended in a tie {isSaved ? '(Saved)' : '(Not Saved)'}</span>
                    ) : isBye ? (
                      <span>
                        🎯 {p1IsBye ? match.pemain_2_name : match.pemain_1_name} wins by BYE {isSaved ? '(Saved)' : ''}
                      </span>
                    ) : (
                      <span>
                        🏆 Winner: {
                          currentWinner === match.pemain_1_id
                            ? match.pemain_1_name 
                            : match.pemain_2_name
                        } {isSaved ? '(Saved)' : '(Not Saved)'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Round Summary */}
      {matches.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Round {roundNumber} Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {matches.filter(m => isByeMatch(m)).length}
              </div>
              <div className="text-sm text-gray-600">BYE Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {matches.filter(m => isMatchSavedToDatabase(m)).length}
              </div>
              <div className="text-sm text-gray-600">Saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {matches.filter(m => {
                  const mid = getMatchId(m);
                  return mid && roundScores.has(mid) && !isMatchSavedToDatabase(m);
                }).length}
              </div>
              <div className="text-sm text-gray-600">Unsaved Changes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {matches.filter(m => {
                  const mid = getMatchId(m);
                  return mid && !roundScores.has(mid) && !isMatchSavedToDatabase(m) && !isByeMatch(m);
                }).length}
              </div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {matches.filter(m => {
                  const mid = getMatchId(m);
                  return mid && !roundScores.has(mid) && !isMatchSavedToDatabase(m) && !isByeMatch(m);
                }).length}
              </div>
              <div className="text-sm text-gray-600">Action Required</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bracket;