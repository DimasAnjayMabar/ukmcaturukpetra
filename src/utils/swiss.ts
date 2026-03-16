// swiss.ts
export interface SwissPlayer {
  id: string;
  name: string;
  score: number;
  playedOpponents: string[];
  nrp?: string;
  role?: string;
  total_score?: number;
  email?: string;
}

interface Match {
  player1: SwissPlayer;
  player2: SwissPlayer | null;
}

export const pairPlayers = (players: SwissPlayer[]): Match[] => {
  if (players.length === 0) return [];

  // Sort players by score descending, then randomize within same score
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return Math.random() - 0.5;
  });

  const matches: Match[] = [];
  const paired = new Set<string>();
  
  console.log("🎯 Starting pairing for players:", sortedPlayers.map(p => `${p.name} (${p.score})`));

  // Handle odd number of players - give BYE to lowest score player
  if (sortedPlayers.length % 2 !== 0) {
    const byePlayer = sortedPlayers[sortedPlayers.length - 1];
    matches.push({ player1: byePlayer, player2: null });
    paired.add(byePlayer.id);
    console.log(`🎯 BYE given to: ${byePlayer.name} (${byePlayer.score})`);
  }

  // Group players by score
  const scoreGroups = new Map<number, SwissPlayer[]>();
  sortedPlayers.forEach(player => {
    if (!paired.has(player.id)) {
      if (!scoreGroups.has(player.score)) {
        scoreGroups.set(player.score, []);
      }
      scoreGroups.get(player.score)!.push(player);
    }
  });

  // Get score levels in descending order
  const scoreLevels = Array.from(scoreGroups.keys()).sort((a, b) => b - a);
  console.log("🎯 Score groups:", scoreLevels.map(score => `${score}: ${scoreGroups.get(score)!.length} players`));

  // NEW: Improved pairing with Dutch System approach
  let allPaired = false;
  let attempt = 0;

  while (!allPaired && attempt < 10) { // Safety limit
    attempt++;
    console.log(`🎯 Pairing attempt ${attempt}`);
    
    // Reset for new attempt
    if (attempt > 1) {
      matches.length = 0;
      paired.clear();
      // Re-add BYE player if exists
      if (sortedPlayers.length % 2 !== 0) {
        const byePlayer = sortedPlayers[sortedPlayers.length - 1];
        matches.push({ player1: byePlayer, player2: null });
        paired.add(byePlayer.id);
      }
      // Reset score groups
      scoreGroups.clear();
      sortedPlayers.forEach(player => {
        if (!paired.has(player.id)) {
          if (!scoreGroups.has(player.score)) {
            scoreGroups.set(player.score, []);
          }
          scoreGroups.get(player.score)!.push(player);
        }
      });
    }

    // Try to pair from top score groups down
    try {
      for (let i = 0; i < scoreLevels.length; i++) {
        const currentScore = scoreLevels[i];
        const currentGroup = [...(scoreGroups.get(currentScore) || [])]; // Copy array
        
        if (currentGroup.length === 0) continue;

        console.log(`🎯 Processing score group ${currentScore} with ${currentGroup.length} players`);

        // Try to pair within same score group first
        while (currentGroup.length >= 2) {
          const player1 = currentGroup.shift()!;
          
          // Find unplayed opponent in same group
          let opponentIndex = -1;
          for (let j = 0; j < currentGroup.length; j++) {
            if (!player1.playedOpponents.includes(currentGroup[j].id)) {
              opponentIndex = j;
              break;
            }
          }

          // If no unplayed opponent, take any available
          if (opponentIndex === -1 && currentGroup.length > 0) {
            opponentIndex = 0;
          }

          if (opponentIndex !== -1) {
            const player2 = currentGroup.splice(opponentIndex, 1)[0];
            matches.push({ player1, player2 });
            paired.add(player1.id);
            paired.add(player2.id);
            // Remove from score groups
            scoreGroups.set(currentScore, scoreGroups.get(currentScore)!.filter(p => p.id !== player1.id && p.id !== player2.id));
            console.log(`✅ Paired: ${player1.name} (${player1.score}) vs ${player2.name} (${player2.score})`);
          } else {
            // No opponent found, put back and break
            currentGroup.unshift(player1);
            break;
          }
        }

        // Handle leftover players in current group - try to pair with next score group
        if (currentGroup.length > 0) {
          console.log(`🎯 ${currentGroup.length} leftover players in score ${currentScore}, looking for cross-group pairs`);
          
          for (const leftoverPlayer of currentGroup) {
            // Look for opponents in lower score groups
            let foundOpponent = false;
            
            for (let j = i + 1; j < scoreLevels.length; j++) {
              const lowerScore = scoreLevels[j];
              const lowerGroup = scoreGroups.get(lowerScore) || [];
              
              if (lowerGroup.length === 0) continue;

              // Try to find unplayed opponent
              let opponentIndex = -1;
              for (let k = 0; k < lowerGroup.length; k++) {
                if (!leftoverPlayer.playedOpponents.includes(lowerGroup[k].id)) {
                  opponentIndex = k;
                  break;
                }
              }

              // If no unplayed opponent, take any available
              if (opponentIndex === -1 && lowerGroup.length > 0) {
                opponentIndex = 0;
              }

              if (opponentIndex !== -1) {
                const opponent = lowerGroup[opponentIndex];
                matches.push({ player1: leftoverPlayer, player2: opponent });
                paired.add(leftoverPlayer.id);
                paired.add(opponent.id);
                // Remove both players from their groups
                scoreGroups.set(currentScore, scoreGroups.get(currentScore)!.filter(p => p.id !== leftoverPlayer.id));
                scoreGroups.set(lowerScore, lowerGroup.filter(p => p.id !== opponent.id));
                console.log(`✅ Cross-group paired: ${leftoverPlayer.name} (${leftoverPlayer.score}) vs ${opponent.name} (${opponent.score})`);
                foundOpponent = true;
                break;
              }
            }

            if (!foundOpponent) {
              console.log(`❌ No opponent found for ${leftoverPlayer.name} (${leftoverPlayer.score})`);
            }
          }
        }
      }

      // Check if all players are paired
      const unpairedCount = sortedPlayers.filter(p => !paired.has(p.id)).length;
      console.log(`🎯 Pairing attempt ${attempt} completed. Unpaired: ${unpairedCount}`);
      
      if (unpairedCount === 0) {
        allPaired = true;
        console.log("✅ All players successfully paired!");
      } else if (attempt === 1) {
        // For first failed attempt, shuffle and try again
        console.log("🔄 First attempt failed, shuffling players and retrying...");
        sortedPlayers.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return Math.random() - 0.5;
        });
      }

    } catch (error) {
      console.error("❌ Error during pairing:", error);
    }
  }

  // Final validation and logging
  console.log("\n🎯 FINAL PAIRING RESULTS:");
  matches.forEach((match, index) => {
    if (match.player2) {
      const scoreDiff = Math.abs(match.player1.score - match.player2.score);
      console.log(`   Match ${index + 1}: ${match.player1.name} (${match.player1.score}) vs ${match.player2.name} (${match.player2.score}) - Diff: ${scoreDiff}`);
    } else {
      console.log(`   Match ${index + 1}: ${match.player1.name} (${match.player1.score}) vs BYE`);
    }
  });

  // Check for unpaired players (shouldn't happen with proper logic)
  const unpairedPlayers = sortedPlayers.filter(p => !paired.has(p.id));
  if (unpairedPlayers.length > 0) {
    console.log("❌ UNPAIRED PLAYERS:", unpairedPlayers.map(p => `${p.name} (${p.score})`));
    // Add them as BYE matches
    unpairedPlayers.forEach(player => {
      matches.push({ player1: player, player2: null });
    });
  }

  return matches;
};