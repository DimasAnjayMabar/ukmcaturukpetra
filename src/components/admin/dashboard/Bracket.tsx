import React from 'react';
import { TournamentMatch } from '../../../types';

interface BracketProps {
  matches: TournamentMatch[];
  roundScores: Map<string, number>;
  onSetWinner: (pairingId: number, matchId: number, winnerId: string) => void;
  onSetTie: (pairingId: number, matchId: number) => void;
  roundNumber?: number;
}

const Bracket: React.FC<BracketProps> = ({ matches, roundScores, onSetWinner, onSetTie, roundNumber = 1 }) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <p className="text-xl text-gray-500 mb-2">No matches for Round {roundNumber}</p>
        <p className="text-sm text-gray-400">Generate matches to get started!</p>
      </div>
    );
  }

  const getMatchStatus = (match: TournamentMatch) => {
    if (match.hasil_pemain_1 !== undefined && match.hasil_pemain_2 !== undefined) {
      if (match.hasil_pemain_1 === match.hasil_pemain_2) {
        return { status: 'tie', icon: '🤝', color: 'border-yellow-300 bg-yellow-50' };
      }
      return { status: 'completed', icon: '✅', color: 'border-green-300 bg-green-50' };
    }
    if (match.pemenang !== undefined) {
      return { status: 'pending-save', icon: '⏳', color: 'border-blue-300 bg-blue-50' };
    }
    return { status: 'waiting', icon: '⏸️', color: 'border-gray-200 bg-white' };
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🏆 Round {roundNumber} Matches
        </h2>
        <div className="flex justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <span>⏸️</span> Waiting for Result
          </div>
          <div className="flex items-center gap-1">
            <span>⏳</span> Result Selected
          </div>
          <div className="flex items-center gap-1">
            <span>✅</span> Completed
          </div>
          <div className="flex items-center gap-1">
            <span>🤝</span> Tie
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {matches.map((match, index) => {
          const matchStatus = getMatchStatus(match);
          const isCompleted = match.hasil_pemain_1 !== undefined && match.hasil_pemain_2 !== undefined;
          const isByeMatch = !match.pemain_2_id || match.pemain_2_id === 'BYE';
          const isPairingLocked = match.hasil_pemain_1 !== undefined && match.hasil_pemain_2 !== undefined;

          const player1Score = roundScores.get(match.pemain_1_id!) ?? 0;
          const player2Score = roundScores.get(match.pemain_2_id!) ?? 0;

          return (
            <div 
              key={match.id ?? `${match.pairingId}-${index}`} 
              className={`p-4 rounded-lg shadow-md border-2 transition-all ${matchStatus.color}`}
            >
              {/* Match Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-700">
                  Board {match.match_ke}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{matchStatus.icon}</span>
                  {isByeMatch && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      BYE
                    </span>
                  )}
                </div>
              </div>

              {/* Players */}
              <div className="space-y-3">
                {/* Player 1 */}
                <div className={`p-3 rounded-lg border ${
                  match.pemenang === match.pemain_1_id 
                    ? 'bg-green-100 border-green-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">
                        {match.pemain_1_name || 'Player 1'}
                        <span className="font-normal text-gray-600 ml-2">({player1Score})</span>
                      </p>
                      <p className="text-xs text-gray-500">White</p>
                    </div>
                    {!isCompleted && !isByeMatch && (
                      <button
                        onClick={() => onSetWinner(match.pairingId, match.id!, match.pemain_1_id!)}
                        disabled={isPairingLocked}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          match.pemenang === match.pemain_1_id
                            ? 'bg-green-500 text-white'
                            : isPairingLocked
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {match.pemenang === match.pemain_1_id ? '👑 Winner' : 'Set Winner'}
                      </button>
                    )}
                    {isByeMatch && (
                      <span className="text-green-500 text-xl">🎯</span>
                    )}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-400">VS</span>
                </div>

                {/* Player 2 */}
                <div className={`p-3 rounded-lg border ${
                  isByeMatch 
                    ? 'bg-gray-100 border-gray-200'
                    : match.pemenang === match.pemain_2_id 
                      ? 'bg-green-100 border-green-300' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  {isByeMatch ? (
                    <div className="text-center">
                      <p className="font-semibold text-lg text-gray-500">🎯 BYE</p>
                      <p className="text-sm text-gray-400">Automatic Win</p>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">
                          {match.pemain_2_name || 'Player 2'}
                          <span className="font-normal text-gray-600 ml-2">({player2Score})</span>
                        </p>
                        <p className="text-xs text-gray-500">Black</p>
                      </div>
                      {!isCompleted && (
                        <button
                          onClick={() => onSetWinner(match.pairingId, match.id!, match.pemain_2_id!)}
                          disabled={isPairingLocked}
                          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                            match.pemenang === match.pemain_2_id
                              ? 'bg-green-500 text-white'
                              : isPairingLocked
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {match.pemenang === match.pemain_2_id ? '👑 Winner' : 'Set Winner'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tie Button */}
              {!isCompleted && !isByeMatch && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => onSetTie(match.pairingId, match.id!)}
                    disabled={isPairingLocked}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      match.pemenang === 'TIE'
                        ? 'bg-yellow-500 text-white'
                        : isPairingLocked
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {match.pemenang === 'TIE' ? '🤝 Tie Selected' : '🤝 Set as Tie'}
                  </button>
                </div>
              )}

              {/* Completed Match Result */}
              {isCompleted && (
                <div className="mt-3 text-center">
                  <div className="text-sm text-gray-600 bg-gray-100 rounded-md py-2">
                    {match.hasil_pemain_1 === match.hasil_pemain_2 ? (
                      <span className="font-medium">🤝 Match ended in a tie</span>
                    ) : (
                      <span className="font-medium">
                        🏆 Winner: {
                          (match.hasil_pemain_1 ?? 0) > (match.hasil_pemain_2 ?? 0)
                            ? match.pemain_1_name 
                            : match.pemain_2_name
                        }
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{matches.length}</div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {matches.filter(m => m.hasil_pemain_1 !== undefined && m.hasil_pemain_2 !== undefined).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {matches.filter(m => m.pemenang !== undefined && m.hasil_pemain_1 === undefined).length}
              </div>
              <div className="text-sm text-gray-600">Pending Save</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {matches.filter(m => m.pemenang === undefined).length}
              </div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bracket;
