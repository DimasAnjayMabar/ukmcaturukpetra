// RoundsCard.tsx - UPDATED: Fixed for correct score table schema with pertemuan_id
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, } from 'recharts';
import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { SwissPlayer } from "../../../utils/swiss";
import { supabase } from "../../../db_client/client";
import { Settings, Download, Trophy, Trash2, Eye, X } from "lucide-react";
import * as XLSX from "xlsx";

export default function RoundsCard({ pertemuanId }: { pertemuanId: string }) {
  const [rounds, setRounds] = useState<{ id: number; name: string; time: string; roundNumber: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<SwissPlayer[]>([]);
  const [maxRounds, setMaxRounds] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [showMaxRoundsModal, setShowMaxRoundsModal] = useState(false);
  const [maxRoundsInput, setMaxRoundsInput] = useState<string>("");
  const [savingMaxRounds, setSavingMaxRounds] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [topWinners, setTopWinners] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (pertemuanId) {
      fetchPlayers();
      fetchExistingRounds();
      fetchMaxRounds();
    }
  }, [pertemuanId]);

  // Function to calculate and update top winners using score table
  const updateTopWinners = (playerScores: any[]) => {
    if (playerScores.length === 0) {
      setTopWinners([]);
      return;
    }

    // Sort players by: total_score DESC, buchholz DESC
    const sortedPlayers = [...playerScores].sort((a, b) => {
      // Primary: total_score from score table
      if (b.total_score !== a.total_score) {
        return (b.total_score || 0) - (a.total_score || 0);
      }
      
      // Secondary: buchholz from score table
      return (b.buchholz || 0) - (a.buchholz || 0);
    });

    // Take top 6
    const top6 = sortedPlayers.slice(0, 6).map((player, index) => ({
      rank: index + 1,
      name: player.name,
      score: player.total_score || 0,
      tb: player.buchholz || 0,
      userId: player.user_id
    }));

    setTopWinners(top6);
  };

  // Fetch players with their scores from the score table using pertemuan_id
  const fetchPlayers = async () => {
    try {
      // 1. Get attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("kehadiran")
        .select("user_id")
        .eq("pertemuan_id", pertemuanId)
        .eq("isAttending", true);

      if (attendanceError) throw attendanceError;

      const userIds = attendanceData?.map(a => a.user_id) || [];
      
      if (userIds.length > 0) {
        // 2. Get user profiles
        const { data: userData, error: userError } = await supabase
          .from("user_profile")
          .select("id, name, nrp, role, email")
          .in("id", userIds);

        if (userError) throw userError;

        // 3. Get tournament scores from score table using pertemuan_id
        const { data: scoreData, error: scoreError } = await supabase
          .from("score")
          .select("user_id, total_score, buchholz, direct_encounter")
          .eq("pertemuan_id", parseInt(pertemuanId)) // Changed to pertemuan_id
          .in("user_id", userIds);

        if (scoreError) throw scoreError;

        // Create a map of scores by user_id
        const scoreMap = new Map();
        scoreData?.forEach(score => {
          scoreMap.set(score.user_id, {
            total_score: score.total_score || 0,
            buchholz: score.buchholz || 0,
            direct_encounter: score.direct_encounter || 0
          });
        });

        // Combine user data with scores
        const playersWithScores = (userData || []).map(user => {
          const userScore = scoreMap.get(user.id) || {
            total_score: 0,
            buchholz: 0,
            direct_encounter: 0
          };

          return {
            ...user,
            ...userScore
          };
        });

        // Create SwissPlayer objects
        const playersData: SwissPlayer[] = playersWithScores.map(user => ({
          id: user.id,
          name: user.name,
          score: user.total_score, // Use tournament score
          playedOpponents: [], // This should be populated from tournament matches
          nrp: user.nrp,
          role: user.role,
          email: user.email,
          total_score: user.total_score // Store for reference
        }));

        setPlayers(playersData);
        
        // Update top winners with combined data
        updateTopWinners(playersWithScores);
      } else {
        setTopWinners([]);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      setTopWinners([]);
    }
  };

  // FIXED: Updated to use score table with pertemuan_id
  const computeAndSaveTB1 = async (pertemuanId: string) => {
    try {
      console.log("🏆 Calculating Final Direct Encounter for tournament...");
      console.log("Pertemuan ID:", pertemuanId);
      
      const pertemuanIdNum = parseInt(pertemuanId);
      if (isNaN(pertemuanIdNum)) {
        throw new Error(`Invalid pertemuanId: ${pertemuanId}`);
      }
      
      // 1. Get all players attending this tournament
      const { data: attendance, error: attErr } = await supabase
        .from("kehadiran")
        .select("user_id")
        .eq("pertemuan_id", pertemuanId)
        .eq("isAttending", true);
      
      if (attErr) {
        console.error("Error fetching attendance:", attErr);
        throw attErr;
      }

      const userIds = (attendance || []).map((r) => r.user_id);
      console.log("Total players from attendance:", userIds.length);
      
      if (userIds.length === 0) {
        console.log("⚠️ No players found");
        return;
      }

      // 2. Get tournament scores from score table using pertemuan_id
      const { data: tournamentScores, error: scoresErr } = await supabase
        .from("score")
        .select("user_id, total_score")
        .eq("pertemuan_id", pertemuanIdNum) // Changed to pertemuan_id
        .in("user_id", userIds);
      
      if (scoresErr) {
        console.error("Error fetching tournament scores:", scoresErr);
        throw scoresErr;
      }

      console.log("Total players with tournament scores:", tournamentScores?.length);

      // 3. Get user names for display
      const { data: users, error: usersErr } = await supabase
        .from("user_profile")
        .select("id, name")
        .in("id", userIds);
      
      if (usersErr) {
        console.error("Error fetching users:", usersErr);
        throw usersErr;
      }

      const userMap = new Map();
      users?.forEach(user => {
        userMap.set(user.id, user.name);
      });

      // 4. Reset all TB1 (direct_encounter) to 0 in score table
      const resetPromises = userIds.map(userId =>
        supabase
          .from("score")
          .update({ direct_encounter: 0 })
          .eq("user_id", userId)
          .eq("pertemuan_id", pertemuanIdNum) // Changed to pertemuan_id
      );
      await Promise.all(resetPromises);
      console.log(`✅ Reset TB1 to 0 for ${userIds.length} players`);

      // 5. Group players by total_score from score table
      const groups = new Map<number, any[]>();
      tournamentScores?.forEach((score) => {
        const userName = userMap.get(score.user_id) || "Unknown";
        const scoreValue = Number(score.total_score || 0);
        if (!groups.has(scoreValue)) groups.set(scoreValue, []);
        groups.get(scoreValue)!.push({
          id: score.user_id,
          name: userName,
          total_score: scoreValue
        });
      });

      console.log("\n📊 DETECTED SCORE GROUPS:");
      let twoPlayerGroups = 0;
      groups.forEach((players, score) => {
        console.log(`   Score ${score}: ${players.length} player(s)`);
        if (players.length === 2) {
          twoPlayerGroups++;
          players.forEach(p => console.log(`     - ${p.name} (ID: ${p.id})`));
        }
      });
      console.log(`Total 2-player groups found: ${twoPlayerGroups}`);

      // 6. Process only groups with 2 players
      for (const [score, players] of groups.entries()) {
        console.log(`\n=== PROCESSING SCORE ${score} ===`);
        console.log(`Players: ${players.map(p => p.name).join(', ')}`);
        
        if (players.length === 2) {
          console.log(`✅ FOUND 2-PLAYER GROUP! Calculating DE...`);
          
          const player1Id = players[0].id;
          const player2Id = players[1].id;
          const player1Name = players[0].name;
          const player2Name = players[1].name;
          
          console.log(`Player 1: ${player1Name} (${player1Id})`);
          console.log(`Player 2: ${player2Name} (${player2Id})`);

          // 7. Find matches between the two players
          const { data: matchesBetween, error: matchErr } = await supabase
            .from("turnamen")
            .select(`
              id, round, 
              pemain_1_id, pemain_1_name, 
              pemain_2_id, pemain_2_name, 
              pemenang, hasil_pemain_1, hasil_pemain_2
            `)
            .eq("pertemuan_id", pertemuanIdNum)
            .or(`and(pemain_1_id.eq.${player1Id},pemain_2_id.eq.${player2Id}),and(pemain_1_id.eq.${player2Id},pemain_2_id.eq.${player1Id})`);

          if (matchErr) {
            console.error(`❌ Query error for players ${player1Id} vs ${player2Id}:`, matchErr);
            continue;
          }

          console.log(`🔍 Matches found: ${matchesBetween?.length || 0}`);
          
          let player1Score = 0;
          let player2Score = 0;
          let matchCount = 0;

          // 8. Calculate head-to-head if matches exist
          if (matchesBetween && matchesBetween.length > 0) {
            console.log("📋 Match details:");
            for (const match of matchesBetween) {
              matchCount++;
              
              // Skip BYE matches
              const isByeMatch = !match.pemain_2_id || 
                                match.pemain_2_id === 'BYE' || 
                                match.pemain_2_name === 'BYE' ||
                                match.pemain_1_id === 'BYE' || 
                                match.pemain_1_name === 'BYE';
              
              if (isByeMatch) {
                console.log(`   Match ${match.id}: BYE match, skipping`);
                continue;
              }

              console.log(`   Match ${match.id} (Round ${match.round}):`);
              console.log(`     ${match.pemain_1_name} vs ${match.pemain_2_name}`);
              console.log(`     Winner: ${match.pemenang}, Scores: ${match.hasil_pemain_1} - ${match.hasil_pemain_2}`);
              
              const isPlayer1White = match.pemain_1_id === player1Id;
              
              if (match.pemenang === "Tie" || (match.hasil_pemain_1 === 0.5 && match.hasil_pemain_2 === 0.5)) {
                player1Score += 0.5;
                player2Score += 0.5;
                console.log(`     → Result: TIE (0.5 - 0.5)`);
              } 
              else if (match.pemenang === (isPlayer1White ? match.pemain_1_name : match.pemain_2_name) ||
                      (isPlayer1White && match.hasil_pemain_1 === 1) ||
                      (!isPlayer1White && match.hasil_pemain_2 === 1)) {
                player1Score += 1;
                player2Score += 0;
                console.log(`     → Result: ${isPlayer1White ? match.pemain_1_name : match.pemain_2_name} WINS (1 - 0)`);
              }
              else if (match.pemenang === (isPlayer1White ? match.pemain_2_name : match.pemain_1_name) ||
                      (isPlayer1White && match.hasil_pemain_2 === 1) ||
                      (!isPlayer1White && match.hasil_pemain_1 === 1)) {
                player1Score += 0;
                player2Score += 1;
                console.log(`     → Result: ${isPlayer1White ? match.pemain_2_name : match.pemain_1_name} WINS (0 - 1)`);
              }
              else if (match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null) {
                const p1MatchScore = isPlayer1White ? match.hasil_pemain_1 : match.hasil_pemain_2;
                const p2MatchScore = isPlayer1White ? match.hasil_pemain_2 : match.hasil_pemain_1;
                player1Score += p1MatchScore;
                player2Score += p2MatchScore;
                console.log(`     → Result: ${p1MatchScore} - ${p2MatchScore} via score`);
              } else {
                console.log(`     → Result: UNKNOWN, skipping`);
              }
            }
          } else {
            console.log(`   ℹ️ Players have never played each other → Both DE = 0`);
          }

          console.log(`   📊 Final DE Scores for ${player1Name}: ${player1Score}`);
          console.log(`   📊 Final DE Scores for ${player2Name}: ${player2Score}`);
          console.log(`   Total matches analyzed: ${matchCount}`);

          // 9. Update TB1 (direct_encounter) in score table using pertemuan_id
          const update1 = await supabase
            .from("score")
            .update({ direct_encounter: player1Score })
            .eq("user_id", player1Id)
            .eq("pertemuan_id", pertemuanIdNum); // Changed to pertemuan_id
          
          const update2 = await supabase
            .from("score")
            .update({ direct_encounter: player2Score })
            .eq("user_id", player2Id)
            .eq("pertemuan_id", pertemuanIdNum); // Changed to pertemuan_id
          
          if (update1.error || update2.error) {
            console.error(`❌ Error updating DE in score table:`, update1.error || update2.error);
          } else {
            console.log(`   ✅ Updated DE for 2 players with score ${score}`);
          }
        } else {
          console.log(`   ⏭️ Skipping: ${players.length} player(s) → DE = 0 for all`);
          // Already reset to 0 at the beginning
        }
      }

      console.log("\n✅ TB1 Direct Encounter berhasil dihitung dan disimpan di score table.");
      
    } catch (error) {
      console.error("❌ Error in computeAndSaveTB1:", error);
      throw error;
    }
  };

  // FIXED: Export using score table data with pertemuan_id
  const exportFinalStandings = async () => {
    if (!maxRounds) {
      alert("Max rounds not set!");
      return;
    }

    if (rounds.length < maxRounds) {
      alert(`Tournament ongoing! Currently ${rounds.length} of ${maxRounds} rounds.`);
      return;
    }

    const allCompleted = await areAllRoundsCompleted();
    if (!allCompleted) {
      alert("Tidak dapat export! Beberapa match belum memiliki hasil. Harap selesaikan semua match terlebih dahulu.");
      return;
    }

    setExporting(true);
    try {
      // Calculate TB1 before export
      await computeAndSaveTB1(pertemuanId);

      // Fetch the latest data from score table combined with user profiles
      const { data: userData, error: userError } = await supabase
        .from("user_profile")
        .select("id, name, nrp")
        .in("id", players.map(p => p.id));

      if (userError) throw userError;

      const { data: scoreData, error: scoreError } = await supabase
        .from("score")
        .select("user_id, total_score, direct_encounter, buchholz")
        .eq("pertemuan_id", parseInt(pertemuanId)) // Changed to pertemuan_id
        .in("user_id", players.map(p => p.id));

      if (scoreError) throw scoreError;

      // Combine user data with scores
      const combinedData = (userData || []).map(user => {
        const userScore = (scoreData || []).find(score => score.user_id === user.id) || {
          total_score: 0,
          direct_encounter: 0,
          buchholz: 0
        };

        return {
          ...user,
          ...userScore
        };
      });

      // Sort based on FIDE rules
      const sortedPlayers = combinedData.sort((a, b) => {
        // 1. Primary: Total Score (DESC)
        if (b.total_score !== a.total_score) {
          return (b.total_score || 0) - (a.total_score || 0);
        }
        
        // 2. Secondary: TB1 Direct Encounter (DESC)
        if ((b.direct_encounter || 0) !== (a.direct_encounter || 0)) {
          return (b.direct_encounter || 0) - (a.direct_encounter || 0);
        }
        
        // 3. Tertiary: TB2 Buchholz (DESC)
        return (b.buchholz || 0) - (a.buchholz || 0);
      });

      // Update Top 6 for display
      updateTopWinners(sortedPlayers);

      // Prepare Excel data
      const excelData = sortedPlayers.map((player, index) => ({
        "Rank": index + 1,
        "Name": player.name,
        "NRP": player.nrp,
        "Points": player.total_score || 0,
        "Direct Encounter": player.direct_encounter || 0,
        "Buchholz": player.buchholz || 0
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 8 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Final Standings");

      const { data: pertemuanData } = await supabase
        .from("pertemuan")
        .select("judul_pertemuan")
        .eq("id", pertemuanId)
        .single();

      const pertemuanName = pertemuanData?.judul_pertemuan || "Tournament";
      const now = new Date();
      const dateString = now.toLocaleDateString('id-ID').replace(/\//g, '-');
      const fileName = `Leaderboard ${pertemuanName} ${dateString}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting final standings:", error);
      alert("Failed to export final standings. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const areAllRoundsCompleted = async (): Promise<boolean> => {
    if (!maxRounds || rounds.length < maxRounds) {
      return false;
    }

    try {
      for (const round of rounds) {
        const { data: matches, error } = await supabase
          .from("turnamen")
          .select("id, pemenang, pemain_1_id, pemain_2_id, pemain_1_name, pemain_2_name, hasil_pemain_1, hasil_pemain_2")
          .eq("round", round.id)
          .eq("pertemuan_id", parseInt(pertemuanId));

        if (error) throw error;

        const isByeMatch = (match: any) => {
          const p2IsBye = !match.pemain_2_id || 
                          match.pemain_2_id === 'BYE' || 
                          match.pemain_2_id === 'null' ||
                          match.pemain_2_name === 'BYE';
          
          const p1IsBye = match.pemain_1_id === 'BYE' || 
                          match.pemain_1_name === 'BYE';
          
          return p2IsBye || p1IsBye;
        };

        const hasIncompleteMatch = matches?.some(match => {
          if (isByeMatch(match)) {
            return false;
          }

          const hasWinner = match.pemenang !== null && match.pemenang !== undefined;
          const hasResults = match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null;
          
          return !hasWinner && !hasResults;
        });

        if (hasIncompleteMatch) {
          const incompleteMatches = matches?.filter(match => {
            if (isByeMatch(match)) return false;
            const hasWinner = match.pemenang !== null && match.pemenang !== undefined;
            const hasResults = match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null;
            return !hasWinner && !hasResults;
          });
          
          console.log(`❌ Round ${round.roundNumber} has incomplete matches`);
          console.log("Incomplete matches:", incompleteMatches);
          return false;
        }
      }

      console.log("✅ All rounds completed!");
      return true;
    } catch (error) {
      console.error("Error checking round completion:", error);
      return false;
    }
  };

  const fetchMaxRounds = async () => {
    try {
      const { data, error } = await supabase
        .from("pertemuan")
        .select("max_rounds")
        .eq("id", pertemuanId)
        .single();

      if (error) throw error;
      
      setMaxRounds(data?.max_rounds || null);
    } catch (error) {
      console.error("Error fetching max rounds:", error);
    }
  };

  const fetchExistingRounds = async () => {
    try {
      const { data: roundData, error: roundError } = await supabase
        .from("round")
        .select("id, created_at, pertemuan_id, name")
        .eq("pertemuan_id", pertemuanId)
        .order("name", { ascending: true });

      if (roundError) throw roundError;

      const roundsWithNames = roundData?.map((round) => ({
        id: round.id,
        name: `Round ${round.name?.toString() || '?'}`,
        time: new Date(round.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        roundNumber: round.name || 0
      })) || [];

      setRounds(roundsWithNames);
      setTotalRounds(roundsWithNames.length);

      console.log("📋 Existing rounds:", roundsWithNames);
    } catch (error) {
      console.error("Error fetching existing rounds:", error);
    }
  };

  const saveMaxRounds = async () => {
    if (!pertemuanId || !maxRoundsInput) return;
    
    const rounds = parseInt(maxRoundsInput);
    if (isNaN(rounds) || rounds < 1) {
      alert("Enter amount of rounds (min. 1)");
      return;
    }

    setSavingMaxRounds(true);
    try {
      const { error } = await supabase
        .from("pertemuan")
        .update({ max_rounds: rounds })
        .eq("id", pertemuanId);

      if (error) throw error;

      setMaxRounds(rounds);
      setShowMaxRoundsModal(false);
      setMaxRoundsInput("");
    } catch (error) {
      console.error("Error saving max rounds:", error);
      alert("Gagal menyimpan max rounds");
    } finally {
      setSavingMaxRounds(false);
    }
  };

  const getNextAvailableRoundNumber = (): number | null => {
    if (!maxRounds) return null;

    const usedNumbers = new Set(rounds.map(r => r.roundNumber));

    for (let i = 1; i <= maxRounds; i++) {
      if (!usedNumbers.has(i)) {
        return i;
      }
    }

    return null;
  };

  const canAddRound = () => {
    if (maxRounds === null) return false;
    if (totalRounds >= maxRounds) return false;
    if (players.length < 2) return false;
    return true;
  };

  const addRound = async () => {
    if (maxRounds === null) {
      alert("Harap set max rounds terlebih dahulu sebelum menambah round!");
      return;
    }

    if (totalRounds >= maxRounds) {
      alert(`Tidak dapat menambah round. Sudah mencapai batas maksimum ${maxRounds} rounds!`);
      return;
    }

    if (players.length < 2) {
      alert("Minimal 2 pemain diperlukan untuk membuat round");
      return;
    }

    const nextRoundNumber = getNextAvailableRoundNumber();
    if (nextRoundNumber === null) {
      alert("Tidak ada slot round yang tersedia!");
      return;
    }

    setLoading(true);
    try {
      console.log("🎯 Creating Round", nextRoundNumber);

      const { data: newRound, error: roundError } = await supabase
        .from("round")
        .insert({
          pertemuan_id: parseInt(pertemuanId),
          name: nextRoundNumber
        })
        .select()
        .single();

      if (roundError) throw roundError;

      const roundId = newRound.id;

      const { pairPlayers } = await import("../../../utils/swiss");
      const pairings = pairPlayers(players);

      const insertPromises = pairings.map(async (pairing, index) => {
        const matchKe = index + 1;
        const isByeMatch = !pairing.player2;

        const matchData = {
          pertemuan_id: parseInt(pertemuanId),
          pemain_1_id: pairing.player1.id,
          hasil_pemain_1: null,
          pemain_2_id: isByeMatch ? null : pairing.player2!.id,
          hasil_pemain_2: null,
          match_ke: matchKe,
          pemain_1_name: pairing.player1.name,
          pemain_2_name: isByeMatch ? "BYE" : pairing.player2!.name,
          pemenang: null,
          round: roundId,
          pairingId: nextRoundNumber
        };

        const { error } = await supabase
          .from("turnamen")
          .insert(matchData);

        if (error) throw error;
      });

      await Promise.all(insertPromises);
      await fetchExistingRounds();
      
      // Refresh players data to update top winners after round creation
      await fetchPlayers();
    } catch (error) {
      console.error("❌ Error creating round:", error);
      alert("Gagal membuat round. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Updated deleteRound to work with correct score table schema
  const deleteRound = async (roundId: number, roundName: string, roundNumber: number) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${roundName}? 
    
Semua data pertandingan akan dihapus dan skor pemain akan dikurangi sesuai hasil round ini.`)) {
      return;
    }

    setLoading(true);
    try {
      console.log(`🗑️ Deleting round ${roundNumber} (ID: ${roundId})`);
      
      // 1. Get all matches in this round
      const { data: matches, error: matchesError } = await supabase
        .from("turnamen")
        .select("*")
        .eq("round", roundId);

      if (matchesError) throw matchesError;

      console.log(`📋 Found ${matches?.length || 0} matches to delete`);

      // 2. Calculate score deductions before deleting matches
      if (matches && matches.length > 0) {
        console.log("📊 Calculating score deductions for this round...");
        
        // Create a map of player score deductions
        const scoreDeductions = new Map<string, number>();
        
        matches.forEach(match => {
          // Calculate score deductions for completed matches
          if (match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null) {
            // Check if it's a BYE match
            const isByeMatch = !match.pemain_2_id || 
                              match.pemain_2_id === 'BYE' || 
                              match.pemain_2_name === 'BYE' ||
                              match.pemain_1_id === 'BYE' || 
                              match.pemain_1_name === 'BYE';
            
            if (isByeMatch) {
              // For BYE matches, the non-BYE player gets 1 point
              if (match.pemain_1_id !== 'BYE' && match.pemain_1_name !== 'BYE') {
                const current = scoreDeductions.get(match.pemain_1_id) || 0;
                scoreDeductions.set(match.pemain_1_id, current - 1);
                console.log(`   BYE: ${match.pemain_1_name} loses 1 point`);
              } else if (match.pemain_2_id && match.pemain_2_id !== 'BYE' && match.pemain_2_name !== 'BYE') {
                const current = scoreDeductions.get(match.pemain_2_id) || 0;
                scoreDeductions.set(match.pemain_2_id, current - 1);
                console.log(`   BYE: ${match.pemain_2_name} loses 1 point`);
              }
            } else {
              // Regular match - deduct points based on results
              const currentP1 = scoreDeductions.get(match.pemain_1_id) || 0;
              const currentP2 = scoreDeductions.get(match.pemain_2_id) || 0;
              
              if (match.pemenang === "Tie" || (match.hasil_pemain_1 === 0.5 && match.hasil_pemain_2 === 0.5)) {
                scoreDeductions.set(match.pemain_1_id, currentP1 - 0.5);
                scoreDeductions.set(match.pemain_2_id, currentP2 - 0.5);
                console.log(`   TIE: ${match.pemain_1_name} and ${match.pemain_2_name} lose 0.5 points each`);
              } else if (match.pemenang === match.pemain_1_name || match.hasil_pemain_1 === 1) {
                scoreDeductions.set(match.pemain_1_id, currentP1 - 1);
                scoreDeductions.set(match.pemain_2_id, currentP2 - 0);
                console.log(`   WIN: ${match.pemain_1_name} loses 1 point, ${match.pemain_2_name} loses 0 points`);
              } else if (match.pemenang === match.pemain_2_name || match.hasil_pemain_2 === 1) {
                scoreDeductions.set(match.pemain_1_id, currentP1 - 0);
                scoreDeductions.set(match.pemain_2_id, currentP2 - 1);
                console.log(`   WIN: ${match.pemain_1_name} loses 0 points, ${match.pemain_2_name} loses 1 point`);
              }
            }
          }
        });

        // 3. Update scores in the score table using pertemuan_id
        if (scoreDeductions.size > 0) {
          console.log("\n📊 Updating scores in the database:");
          
          const updatePromises = Array.from(scoreDeductions.entries()).map(async ([playerId, deduction]) => {
            try {
              // Get current score record
              const { data: currentScore, error: fetchError } = await supabase
                .from("score")
                .select("id, total_score")
                .eq("user_id", playerId)
                .eq("pertemuan_id", parseInt(pertemuanId)) // Changed to pertemuan_id
                .maybeSingle();

              if (fetchError) throw fetchError;

              if (currentScore) {
                const newTotalScore = Math.max(0, (currentScore.total_score || 0) + deduction); // deduction is negative
                
                const { error: updateError } = await supabase
                  .from("score")
                  .update({ 
                    total_score: newTotalScore,
                    direct_encounter: 0 // Reset direct encounter, will be recalculated later
                  })
                  .eq("id", currentScore.id);

                if (updateError) throw updateError;
                
                const userData = await supabase
                  .from("user_profile")
                  .select("name")
                  .eq("id", playerId)
                  .single();
                
                const playerName = userData.data?.name || playerId;
                console.log(`   ${playerName}: ${currentScore.total_score || 0} → ${newTotalScore} (${deduction > 0 ? '+' : ''}${deduction})`);
              } else {
                console.log(`   Player ${playerId} has no score record, skipping`);
              }
            } catch (error) {
              console.error(`   Error updating score for player ${playerId}:`, error);
            }
          });

          await Promise.all(updatePromises);
        } else {
          console.log("No completed matches to deduct scores from");
        }
      }

      // 4. Delete all matches in this round
      const { error: tournamentError } = await supabase
        .from("turnamen")
        .delete()
        .eq("round", roundId);

      if (tournamentError) throw tournamentError;
      console.log("✅ All matches deleted");

      // 5. Delete the round itself
      const { error: roundError } = await supabase
        .from("round")
        .delete()
        .eq("id", roundId);

      if (roundError) throw roundError;
      console.log("✅ Round deleted");

      // 6. Recalculate Buchholz scores for all players
      console.log("\n🔄 Recalculating Buchholz scores...");
      await recalculateBuchholzScores();

      // 7. Recalculate Direct Encounter tiebreakers
      console.log("🔄 Recalculating Direct Encounter tiebreakers...");
      await computeAndSaveTB1(pertemuanId);

      // 8. Refresh all data
      await fetchExistingRounds();
      await fetchPlayers();

      console.log("\n✅ Round deletion completed successfully!");

    } catch (error) {
      console.error("❌ Error deleting round:", error);
      alert("Failed to delete round. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Helper function to recalculate Buchholz scores using pertemuan_id
  const recalculateBuchholzScores = async () => {
    try {
      const pertemuanIdNum = parseInt(pertemuanId);
      
      // 1. Get all players in this tournament
      const { data: attendance, error: attErr } = await supabase
        .from("kehadiran")
        .select("user_id")
        .eq("pertemuan_id", pertemuanId)
        .eq("isAttending", true);

      if (attErr) throw attErr;

      const userIds = (attendance || []).map((r) => r.user_id);
      if (userIds.length === 0) return;

      // 2. Get current total scores for all players from score table
      const { data: playerScores, error: scoresErr } = await supabase
        .from("score")
        .select("user_id, total_score")
        .eq("pertemuan_id", pertemuanIdNum) // Changed to pertemuan_id
        .in("user_id", userIds);

      if (scoresErr) throw scoresErr;

      const playerScoreMap = new Map<string, number>();
      playerScores?.forEach(score => {
        playerScoreMap.set(score.user_id, score.total_score || 0);
      });

      // Initialize missing players with 0
      userIds.forEach(id => {
        if (!playerScoreMap.has(id)) {
          playerScoreMap.set(id, 0);
        }
      });

      // 3. Calculate Buchholz for each player
      for (const playerId of userIds) {
        let buchholzScore = 0;
        
        // Get all matches for this player in this tournament (excluding deleted round)
        const { data: playerMatches, error: matchesError } = await supabase
          .from("turnamen")
          .select("*")
          .eq("pertemuan_id", pertemuanIdNum)
          .or(`pemain_1_id.eq.${playerId},pemain_2_id.eq.${playerId}`);

        if (matchesError) throw matchesError;

        // Sum up opponents' scores
        for (const match of playerMatches || []) {
          let opponentId = null;
          
          if (match.pemain_1_id === playerId && match.pemain_2_id && match.pemain_2_id !== 'BYE') {
            opponentId = match.pemain_2_id;
          } else if (match.pemain_2_id === playerId && match.pemain_1_id && match.pemain_1_id !== 'BYE') {
            opponentId = match.pemain_1_id;
          }

          if (opponentId) {
            const opponentScore = playerScoreMap.get(opponentId) || 0;
            buchholzScore += opponentScore;
          }
        }

        // Update Buchholz score in the database using pertemuan_id
        const { error: updateError } = await supabase
          .from("score")
          .update({ buchholz: buchholzScore })
          .eq("user_id", playerId)
          .eq("pertemuan_id", pertemuanIdNum); // Changed to pertemuan_id

        if (updateError) {
          console.error(`Error updating Buchholz for player ${playerId}:`, updateError);
        }
      }

      console.log("✅ Buchholz scores recalculated");
    } catch (error) {
      console.error("❌ Error recalculating Buchholz scores:", error);
      throw error;
    }
  };

  const handleViewPairings = (roundId: number) => {
    navigate(`/admin/pairing/${roundId}?pertemuanId=${pertemuanId}`);
  };

  const getAddButtonText = () => {
    if (maxRounds === null) {
      return "Set Max Rounds First!";
    }
    
    if (totalRounds >= maxRounds) {
      return `Max Reached (${maxRounds})`;
    }
    
    if (players.length < 2) {
      return "At least 2 Players needed.";
    }
    
    const nextNumber = getNextAvailableRoundNumber();
    return loading ? "Loading..." : `+ Add Round ${nextNumber || ''}`;
  };

  return (
    <div className="">
      {topWinners.length > 0 && (
        <div className="mb-6 bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-xl p-6 border border-slate-600 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-yellow-400" size={24} />
            <h2 className="text-xl font-bold text-slate-50">Top Players</h2>
          </div>
          
          {(() => {
            const chartData = [...topWinners].reverse().map(winner => ({
              ...winner,
              rankLabel: `#${winner.rank}`
            }));
            
            return (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <div className="w-full lg:w-1/2 h-64 lg:h-auto select-none" style={{ outline: "none", }} onMouseDown={(e) => e.preventDefault()} >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: -35, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="rankLabel" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis 
                        orientation="right" 
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip 
                        cursor={{fill: '#334155', opacity: 0.6}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                        labelFormatter={(label) => {
                            const winner = chartData.find(w => w.rankLabel === label);
                          return winner ? winner.name : label;
                        }}
                      />
                      <Bar dataKey="score" fill="#38bdf8">
                        <LabelList 
                          dataKey="score" 
                          position="top" 
                          fill="#f1f5f9" 
                          formatter={(value: ReactNode) => {
                            if (typeof value === 'number') {
                              return value.toFixed(1);
                            }
                            return value;
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full lg:w-1/2 flex flex-col gap-2">
                  {topWinners.map((winner) => (
                    <div 
                      key={winner.rank} 
                      className="text-[#fefff9] bg-gradient-to-tl from-[#002680] to-transparent hover:bg-blue-700 transition-colors rounded-lg px-4 py-3 shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-semibold text-slate-300 w-5 text-left">
                            #{winner.rank}
                          </span>
                          <span className="font-semibold text-slate-100 truncate" title={winner.name}>
                            {winner.name}
                          </span>
                        </div>

                        <div className="text-sm text-slate-400 flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Pts:</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#44ff6f] to-[#b3ffe5]">
                              {winner.score.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">TB:</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#568eff] to-[#a0c3ff]">
                              {winner.tb.toFixed(1)}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {topWinners.length < 80 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Total players: {players.length} (showing top {topWinners.length} players)
            </p>
          )}
        </div>
      )}
      <div className="bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-xl p-6 border border-slate-600 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Rounds</h2>
            {maxRounds !== null && (
              <p className="text-sm text-slate-300">
                {totalRounds} / {maxRounds} rounds
                {totalRounds >= maxRounds && (
                  <span className="ml-2 text-red-400 font-semibold">(MAX)</span>
                )}
                {totalRounds < maxRounds && getNextAvailableRoundNumber() && (
                  <span className="ml-2 text-blue-400 text-xs">
                    (Next: Round {getNextAvailableRoundNumber()})
                  </span>
                )}
              </p>
            )}
          </div>
          
        <div className="flex gap-2">
            {maxRounds !== null && totalRounds >= maxRounds ? (
              <button
                onClick={exportFinalStandings}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-tl from-[#01b82c] to-[#29ffb8] text-[#fefff9] rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className='hidden sm:inline'>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span className='hidden sm:inline'>Export</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={addRound}
                disabled={!canAddRound() || loading}
                className="px-3 py-2 bg-gradient-to-tl from-[#2700a8] to-[#d685ff] text-[#fefff9] disabled:from-[#5f00a8] disabled:to-transparent disabled:border disabled:border-[#b625ff] disabled:cursor-not-allowed rounded-lg transition"
              >
                {getAddButtonText()}
              </button>
            )}
            
            <button
              onClick={() => setShowMaxRoundsModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-tl from-[#0600a8] to-[#679dfb] text-[#fefff9] rounded-lg transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {maxRounds === null && (
          <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg">
            <p className="text-yellow-200 text-sm">
              <strong>Perhatian:</strong> Harap set max rounds terlebih dahulu sebelum menambah round baru.
            </p>
          </div>
        )}

      {rounds.length === 0 ? (
        <p className="text-slate-400 italic text-center py-4">No rounds created yet</p>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left table-auto">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Round</th>
                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Time Created</th>
                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rounds.map((round) => (
                <tr 
                  key={round.id} 
                  className="hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => handleViewPairings(round.id)}
                >
                  <td className="p-3 font-semibold text-slate-50">{round.name}</td>
                  <td className="p-3 text-sm text-slate-300">{round.time}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPairings(round.id);
                        }}
                        className="flex items-center p-2 border border-[#150de7] text-[#fefff9] bg-gradient-to-tl from-[#0032a8] to-transparent rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRound(round.id, round.name, round.roundNumber);
                        }}
                        disabled={loading}
                        className="flex items-center p-2 border border-[#da0000] text-[#fefff9] bg-gradient-to-tl from-[#850000] to-transparent rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                        title="Delete Round"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {maxRounds !== null && totalRounds >= maxRounds && (
          <div className="mt-2 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
            <p className="text-green-200 text-sm">
              <strong>Tournament Finished:</strong> Maximum of {maxRounds} rounds reached.
            </p>
          </div>
        )}

      </div>
      {showMaxRoundsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-b from-[#0c1015] to-[#1f2038] rounded-t-2xl flex items-center justify-between p-6">
              <div className="flex items-center">
                <div className="text-blue-400">
                  <Settings size={24} />
                </div>
                <h2 className="ml-3 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-tl from-[#568eff] to-[#a0c3ff]">
                  Set Max Rounds
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowMaxRoundsModal(false);
                  setMaxRoundsInput("");
                }}
                className="text-sky-50 hover:text-sky-100 p-1"
                disabled={savingMaxRounds}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Number of Rounds
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxRoundsInput}
                  onChange={(e) => setMaxRoundsInput(e.target.value)}
                  placeholder="Enter max rounds"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set the maximum number of rounds for this tournament.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowMaxRoundsModal(false);
                    setMaxRoundsInput("");
                  }}
                  disabled={savingMaxRounds}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMaxRounds}
                  disabled={savingMaxRounds || !maxRoundsInput}
                  className="flex-1 px-4 py-2 bg-gradient-to-tl from-[#0600a8] to-[#679dfb] text-[#fefff9] rounded-lg hover:opacity-90 transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {savingMaxRounds ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}