import { UserProfile } from '../types';

interface Player extends UserProfile {
  score: number;
  playedOpponents: string[];
}

interface Match {
  player1: Player;
  player2: Player | null;
}

export const pairPlayers = (players: Player[]): Match[] => {
  // Sort players by score, then randomly to break ties
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // A more stable tie-breaking mechanism might be needed in a real scenario
    return Math.random() - 0.5;
  });

  const matches: Match[] = [];
  const unpairedPlayers = [...sortedPlayers];
  let byePlayer: Player | null = null;

  // If there's an odd number of players, the lowest-ranked player gets a bye.
  if (unpairedPlayers.length % 2 !== 0) {
    // In a real Swiss system, you'd also check if they've had a bye before.
    // For simplicity, we'll just give it to the last player.
    byePlayer = unpairedPlayers.pop()!;
  }

  // Pair the remaining players
  while (unpairedPlayers.length > 0) {
    const player1 = unpairedPlayers.shift(); // Take the top player
    if (!player1) break;

    let opponentIndex = -1;

    // Find the best opponent they haven't played yet, starting from the top.
    for (let i = 0; i < unpairedPlayers.length; i++) {
      if (!player1.playedOpponents.includes(unpairedPlayers[i].id)) {
        opponentIndex = i;
        break;
      }
    }

    // If all remaining players have been played, force a rematch with the highest-ranked one.
    if (opponentIndex === -1) {
      opponentIndex = 0;
    }

    const player2 = unpairedPlayers.splice(opponentIndex, 1)[0];
    matches.push({ player1, player2 });
  }

  // Add the bye match if there was one
  if (byePlayer) {
    matches.push({ player1: byePlayer, player2: null });
  }

  return matches;
};
