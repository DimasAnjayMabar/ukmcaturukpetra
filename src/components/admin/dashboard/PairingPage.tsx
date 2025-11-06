// PairingPage.tsx - ADDED: Excel export functionality and Search bar
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trophy, Download, Search } from "lucide-react";
import Bracket from "./Bracket";
import { supabase } from "../../../db_client/client";
import * as XLSX from "xlsx";

export default function PairingPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roundScores, setRoundScores] = useState<Map<number, string>>(new Map());
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [pertemuanName, setPertemuanName] = useState<string>("");
  const [isRoundUpdated, setIsRoundUpdated] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const pertemuanId = searchParams.get("pertemuanId");

  // Fetch pertemuan name
  const fetchPertemuanName = async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from("pertemuan")
        .select("name")
        .eq("id", meetingId)
        .single();

      if (error) throw error;
      setPertemuanName(data?.name || "");
    } catch (error) {
      console.error("Error fetching pertemuan name:", error);
    }
  };

  // Filter matches based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMatches(matches);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = matches.filter(match => {
      const player1Name = match.pemain_1_name?.toLowerCase() || "";
      const player2Name = match.pemain_2_name?.toLowerCase() || "";
      
      return player1Name.includes(query) || player2Name.includes(query);
    });

    // NEW: Sort filtered results - regular first, BYE last
    const sortedFiltered = [...filtered].sort((a, b) => {
      const aIsBye = isByeMatch(a);
      const bIsBye = isByeMatch(b);
      
      if (aIsBye === bIsBye) {
        return a.match_ke - b.match_ke;
      }
      
      return aIsBye ? 1 : -1;
    });

    setFilteredMatches(sortedFiltered);
  }, [searchQuery, matches]);

  // CRITICAL: Most comprehensive BYE detection possible
  const isByeMatch = (match: any) => {
    if (!match) return false;
    
    // Check Player 2 (most common BYE case)
    const p2Id = match.pemain_2_id;
    const p2Name = match.pemain_2_name;
    
    const p2IsBye = (
      !p2Id || 
      p2Id === null || 
      p2Id === "BYE" || 
      p2Id === "" ||
      p2Id === "null" ||
      p2Name === "BYE" ||
      p2Name === null ||
      p2Name === "" ||
      p2Name === "null"
    );
    
    // Check Player 1 (edge case where BYE is assigned to P1)
    const p1Id = match.pemain_1_id;
    const p1Name = match.pemain_1_name;
    
    const p1IsBye = (
      p1Id === "BYE" ||
      p1Name === "BYE"
    );
    
    return p2IsBye || p1IsBye;
  };

  const exportToExcel = () => {
    if (matches.length === 0) {
      alert("Tidak ada data pairing untuk di-export!");
      return;
    }

    // Use filtered matches if search is active, otherwise use all matches
    const matchesToExport = searchQuery.trim() ? filteredMatches : matches;

    if (matchesToExport.length === 0) {
      alert("Tidak ada data yang sesuai dengan pencarian untuk di-export!");
      return;
    }

    // Biarkan seperti semula untuk Excel export (tidak perlu sorting khusus)
    const excelData = matchesToExport.map(match => {
      const p1Score = playerScores.get(match.pemain_1_id) || 0;
      const p2Score = match.pemain_2_id ? (playerScores.get(match.pemain_2_id) || 0) : 0;
      
      let result = "";
      if (isByeMatch(match)) {
        result = "1 - 0"; // Default for BYE (white wins)
        if (match.pemain_1_id === 'BYE' || match.pemain_1_name === 'BYE') {
          result = "0 - 1"; // If BYE is player 1, then black wins
        }
      } else {
        const winner = roundScores.get(match.id);
        if (winner === "tie") {
          result = "1/2 - 1/2";
        } else if (winner === match.pemain_1_id) {
          result = "1 - 0";
        } else if (winner === match.pemain_2_id) {
          result = "0 - 1";
        }
        // If no result yet and before update round, leave empty
      }

      return {
        "Board": match.match_ke,
        "White": match.pemain_1_name || "BYE",
        "Pts.": p1Score,
        "Result": result,
        "Pts..1": p2Score,
        "Black": match.pemain_2_name || "BYE"
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 8 },  // Board
      { wch: 25 }, // White
      { wch: 8 },  // Pts.
      { wch: 12 }, // Result (adjusted for longer text)
      { wch: 8 },  // Pts.
      { wch: 25 }  // Black
    ];
    ws['!cols'] = colWidths;

    // Add bold headers and borders
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      
      // Make headers bold and add borders
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cellAddress]) continue;
        
        // Bold headers
        ws[cellAddress].s = {
          font: { bold: true },
          alignment: { horizontal: 'center' },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
      
      // Add borders to all data cells
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellAddress]) continue;
          
          // Ensure cell has style object
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          
          // Add borders
          ws[cellAddress].s.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Center align Board and Result columns
          if (C === 0 || C === 3) { // Board and Result columns
            ws[cellAddress].s.alignment = { horizontal: 'center' };
          }
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Pairing");

    // Generate file name
    const status = isRoundUpdated ? "after" : "before";
    const date = new Date().toISOString().split('T')[0];
    const searchSuffix = searchQuery.trim() ? `_search_${searchQuery}` : "";
    const fileName = `Pairing Round ${roundNumber} ${pertemuanName} ${status}${searchSuffix} ${date}.xlsx`;

    // Export to Excel
    XLSX.writeFile(wb, fileName);
  };

  const fetchPlayerScores = async () => {
    try {
      const playerIds = getAllPlayerIds();
      if (playerIds.length === 0) return;

      const { data: userData, error } = await supabase
        .from("user_profile")
        .select("id, total_score")
        .in("id", playerIds);

      if (error) throw error;

      const scoresMap = new Map<string, number>();
      userData?.forEach(user => {
        scoresMap.set(user.id, user.total_score || 0);
      });

      setPlayerScores(scoresMap);
    } catch (error) {
      console.error("Error fetching player scores:", error);
    }
  };

  const getAllPlayerIds = () => {
    const playerIds = new Set<string>();
    matches.forEach(match => {
      if (match.pemain_1_id && match.pemain_1_id !== "BYE") playerIds.add(match.pemain_1_id);
      if (match.pemain_2_id && match.pemain_2_id !== "BYE" && match.pemain_2_id !== null) {
        playerIds.add(match.pemain_2_id);
      }
    });
    return Array.from(playerIds);
  };

  useEffect(() => {
    if (matches.length > 0) {
      fetchPlayerScores();
    }
  }, [matches]);

  const fetchRoundData = async (roundId: number, meetingId: string) => {
    try {
      setLoading(true);
      setInitialLoadComplete(false);
      
      console.log("\n" + "=".repeat(80));
      console.log("📄 FETCH START");
      console.log("   Round ID:", roundId);
      console.log("   Meeting ID:", meetingId);
      
      // Fetch pertemuan name
      await fetchPertemuanName(meetingId);
      
      const { data: roundData, error: roundError } = await supabase
        .from("round")
        .select("id, name, created_at")
        .eq("id", roundId)
        .single();

      if (roundError) throw roundError;

      const { data: allRounds, error: roundsError } = await supabase
        .from("round")
        .select("id, name")
        .eq("pertemuan_id", meetingId)
        .order("name", { ascending: true });

      if (roundsError) throw roundsError;

      const roundNumber = roundData?.name || 1;
      setRoundNumber(roundNumber);
      
      console.log("📊 ROUND INFO:");
      console.log("   Round Name from DB:", roundData?.name);
      console.log("   Round Number Set:", roundNumber);
      
      const { data: allMatches, error: matchesError } = await supabase
        .from("turnamen")
        .select("*")
        .eq("pertemuan_id", meetingId)
        .eq("round", roundId)
        .order("match_ke", { ascending: true });

      if (matchesError) throw matchesError;
      
      console.log("📄 RAW DATA FROM DB:");
      console.log("   Total matches:", allMatches?.length || 0);
      
      if (!allMatches || allMatches.length === 0) {
        console.log("⚠️ No matches found");
        setMatches([]);
        setFilteredMatches([]);
        setRoundScores(new Map());
        setInitialLoadComplete(true);
        return;
      }

      // NEW: Sort matches - regular matches first, BYE matches at the end
      const sortedMatches = [...allMatches].sort((a, b) => {
        const aIsBye = isByeMatch(a);
        const bIsBye = isByeMatch(b);
        
        // Jika kedua match sama (keduanya BYE atau keduanya regular), urutkan berdasarkan match_ke
        if (aIsBye === bIsBye) {
          return a.match_ke - b.match_ke;
        }
        
        // Regular matches first, BYE matches last
        return aIsBye ? 1 : -1;
      });

      // Check if round has been updated (has results saved)
      const hasSavedResults = sortedMatches.some(match => 
        match.hasil_pemain_1 !== null || match.hasil_pemain_2 !== null || match.pemenang !== null
      );
      setIsRoundUpdated(hasSavedResults);

      // Log every match in detail
      console.log("📋 SORTED MATCHES (BYE at bottom):");
      sortedMatches.forEach((match, idx) => {
        const isBye = isByeMatch(match);
        console.log(`   ${idx + 1}. Board ${match.match_ke}${isBye ? ' [BYE]' : ''}: ${match.pemain_1_name} vs ${match.pemain_2_name}`);
      });

      // Build scores map dengan sorted matches
      const scores = new Map<number, string>();
      let byeCount = 0;
      let savedCount = 0;
      let tieCount = 0;

      sortedMatches.forEach((match) => {
        if (!match.id) {
          console.error("❌ Match without ID:", match);
          return;
        }

        const isBye = isByeMatch(match);
        
        console.log(`\n🔍 PROCESSING Match ${match.id}:`);
        console.log(`   Is BYE Match: ${isBye}`);
        
        if (isBye) {
          // Determine the non-BYE player as winner
          let byeWinner = null;
          
          if (match.pemain_1_id !== 'BYE' && match.pemain_1_name !== 'BYE') {
            byeWinner = match.pemain_1_id;
            console.log(`   ✅ AUTO-SET BYE: ${match.pemain_1_name} (P1) wins`);
          } else if (match.pemain_2_id && match.pemain_2_id !== 'BYE' && match.pemain_2_name !== 'BYE') {
            byeWinner = match.pemain_2_id;
            console.log(`   ✅ AUTO-SET BYE: ${match.pemain_2_name} (P2) wins`);
          }
          
          if (byeWinner) {
            scores.set(match.id, byeWinner);
            byeCount++;
            console.log(`   ✅ Score added to map: Match ${match.id} → ${byeWinner}`);
          } else {
            console.error(`   ❌ BYE match but no valid winner found!`, match);
          }
        }
        else if (match.pemenang) {
          scores.set(match.id, match.pemenang);
          savedCount++;
          console.log(`   💾 SAVED WINNER: ${match.pemenang}`);
        }
        else if (match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null && match.pemenang === null) {
          scores.set(match.id, "tie");
          tieCount++;
          console.log(`   🤝 SAVED TIE`);
        }
        else {
          console.log(`   ⏸️ NO RESULT YET`);
        }
      });

      console.log("\n📊 PROCESSING SUMMARY:");
      console.log(`   Total Matches: ${sortedMatches.length}`);
      console.log(`   BYE Matches: ${byeCount}`);
      console.log(`   Saved Winners: ${savedCount}`);
      console.log(`   Ties: ${tieCount}`);
      console.log(`   Total Scores in Map: ${scores.size}`);
      
      console.log("\n📋 FINAL SCORES MAP:");
      Array.from(scores.entries()).forEach(([matchId, winnerId]) => {
        console.log(`   Match ${matchId} → ${winnerId}`);
      });

      console.log("\n⚙️ Setting React states...");
      setMatches(sortedMatches); // Gunakan sortedMatches yang sudah diurutkan
      setFilteredMatches(sortedMatches); // Initialize filtered matches dengan sorted matches
      
      setTimeout(() => {
        console.log("✅ Initial load complete, enabling render");
        setInitialLoadComplete(true);
      }, 100);

    } catch (error) {
      console.error("❌ ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && pertemuanId) {
      console.log("🚀 COMPONENT MOUNT");
      fetchRoundData(parseInt(id), pertemuanId);
    }
  }, [id, pertemuanId]);

  useEffect(() => {
    console.log("\n📊 STATE UPDATE:");
    console.log(`   Matches: ${matches.length}`);
    console.log(`   Filtered Matches: ${filteredMatches.length}`);
    console.log(`   Search Query: "${searchQuery}"`);
    console.log(`   Scores Map Size: ${roundScores.size}`);
    console.log(`   Initial Load: ${initialLoadComplete}`);
    if (roundScores.size > 0) {
      console.log("   Current Scores:");
      Array.from(roundScores.entries()).forEach(([k, v]) => {
        console.log(`      Match ${k} → ${v}`);
      });
    }
  }, [matches, filteredMatches, roundScores, initialLoadComplete, searchQuery]);

  const handleSetWinner = (pairingId: number, matchId: number, winnerId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match && isByeMatch(match)) {
      console.log(`🚫 Cannot change BYE match ${matchId}`);
      return;
    }
    
    setRoundScores(prev => {
      const newScores = new Map(prev);
      newScores.set(matchId, winnerId);
      console.log(`✅ Winner set: Match ${matchId} → ${winnerId}`);
      return newScores;
    });
  };

  const handleSetTie = (pairingId: number, matchId: number) => {
    const match = matches.find(m => m.id === matchId);
    if (match && isByeMatch(match)) {
      console.log(`🚫 Cannot set tie for BYE match ${matchId}`);
      return;
    }
    
    setRoundScores(prev => {
      const newScores = new Map(prev);
      newScores.set(matchId, "tie");
      console.log(`✅ Tie set: Match ${matchId}`);
      return newScores;
    });
  };

  const allMatchesCompleted = () => {
    if (matches.length === 0) return false;

    const completed = matches.every(match => {
      if (isByeMatch(match)) return true;
      return roundScores.has(match.id);
    });

    const byeCount = matches.filter(m => isByeMatch(m)).length;
    const regularCount = matches.length - byeCount;
    const regularCompleted = matches.filter(m => !isByeMatch(m) && roundScores.has(m.id)).length;

    console.log(`📊 Completion:`, {
      completed,
      total: matches.length,
      bye: byeCount,
      regular: regularCount,
      regularCompleted,
      scoresInMap: roundScores.size
    });
    
    return completed;
  };

  const calculateNewScores = () => {
    const scoreUpdates = new Map<string, number>();
    
    matches.forEach(match => {
      const winner = roundScores.get(match.id);
      const currentP1Score = (match.pemain_1_id && match.pemain_1_id !== 'BYE') 
        ? playerScores.get(match.pemain_1_id) || 0 
        : 0;
      const currentP2Score = (match.pemain_2_id && match.pemain_2_id !== 'BYE' && !isByeMatch(match))
        ? playerScores.get(match.pemain_2_id) || 0 
        : 0;

      if (isByeMatch(match)) {
        // Award point to the non-BYE player
        if (match.pemain_1_id !== 'BYE' && match.pemain_1_name !== 'BYE') {
          scoreUpdates.set(match.pemain_1_id, currentP1Score + 1);
        } else if (match.pemain_2_id && match.pemain_2_id !== 'BYE' && match.pemain_2_name !== 'BYE') {
          scoreUpdates.set(match.pemain_2_id, currentP2Score + 1);
        }
        return;
      }

      if (winner === "tie") {
        scoreUpdates.set(match.pemain_1_id, currentP1Score + 0.5);
        scoreUpdates.set(match.pemain_2_id, currentP2Score + 0.5);
      } else if (winner === match.pemain_1_id) {
        scoreUpdates.set(match.pemain_1_id, currentP1Score + 1);
        scoreUpdates.set(match.pemain_2_id, currentP2Score + 0);
      } else if (winner === match.pemain_2_id) {
        scoreUpdates.set(match.pemain_1_id, currentP1Score + 0);
        scoreUpdates.set(match.pemain_2_id, currentP2Score + 1);
      }
    });

    return scoreUpdates;
  };

  // NEW: Function to calculate Buchholz scores for all players (called every round)
  const calculateBuchholzScores = async (): Promise<Map<string, number>> => {
    try {
      const buchholzMap = new Map<string, number>();
      const playerIds = getAllPlayerIds();

      if (playerIds.length === 0) return buchholzMap;

      // Get current total scores for all players
      const { data: playerScoresData, error } = await supabase
        .from("user_profile")
        .select("id, total_score")
        .in("id", playerIds);

      if (error) throw error;

      const playerScoreMap = new Map<string, number>();
      playerScoresData?.forEach(player => {
        playerScoreMap.set(player.id, player.total_score || 0);
      });

      // Calculate Buchholz for each player
      for (const playerId of playerIds) {
        let buchholzScore = 0;
        let opponentCount = 0;
        
        // Get all matches for this player in this meeting
        const { data: playerMatches, error: matchesError } = await supabase
          .from("turnamen")
          .select("*")
          .eq("pertemuan_id", parseInt(pertemuanId!))
          .or(`pemain_1_id.eq.${playerId},pemain_2_id.eq.${playerId}`);

        if (matchesError) throw matchesError;

        // Sum up opponents' scores (Buchholz calculation)
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
            opponentCount++;
          }
        }

        // For players with fewer opponents, adjust Buchholz score
        if (opponentCount > 0) {
          // Optional: You can apply adjustments here if needed
          // For example: buchholzScore = buchholzScore * (expectedRounds / opponentCount)
        }

        buchholzMap.set(playerId, buchholzScore);
      }

      console.log("📊 Buchholz Scores Calculated:", Object.fromEntries(buchholzMap));
      return buchholzMap;

    } catch (error) {
      console.error("Error calculating Buchholz scores:", error);
      return new Map();
    }
  };

  const updateRound = async () => {
    if (!allMatchesCompleted()) {
      alert("Harap tentukan pemenang untuk semua match terlebih dahulu!");
      return;
    }

    setSaving(true);
    try {
      console.log("💾 SAVING...");

      const updatePromises = matches.map(async (match) => {
        const winner = roundScores.get(match.id);
        
        if (isByeMatch(match)) {
          console.log(`💾 Saving BYE: Match ${match.id}`);
          
          // Determine the non-BYE player
          let byeWinner = null;
          
          if (match.pemain_1_id !== 'BYE' && match.pemain_1_name !== 'BYE') {
            byeWinner = match.pemain_1_id;
            return supabase
              .from("turnamen")
              .update({
                pemenang: byeWinner,
                hasil_pemain_1: 1,
                hasil_pemain_2: 0
              })
              .eq("id", match.id);
          } else if (match.pemain_2_id && match.pemain_2_id !== 'BYE' && match.pemain_2_name !== 'BYE') {
            byeWinner = match.pemain_2_id;
            return supabase
              .from("turnamen")
              .update({
                pemenang: byeWinner,
                hasil_pemain_1: 0,
                hasil_pemain_2: 1
              })
              .eq("id", match.id);
          }
        }

        if (winner === "tie") {
          return supabase
            .from("turnamen")
            .update({
              pemenang: null,
              hasil_pemain_1: 0.5,
              hasil_pemain_2: 0.5
            })
            .eq("id", match.id);
        } else if (winner === match.pemain_1_id) {
          return supabase
            .from("turnamen")
            .update({
              pemenang: match.pemain_1_id,
              hasil_pemain_1: 1,
              hasil_pemain_2: 0
            })
            .eq("id", match.id);
        } else if (winner === match.pemain_2_id) {
          return supabase
            .from("turnamen")
            .update({
              pemenang: match.pemain_2_id,
              hasil_pemain_1: 0,
              hasil_pemain_2: 1
            })
            .eq("id", match.id);
        }
      });

      await Promise.all(updatePromises);

      const scoreUpdates = calculateNewScores();
      
      const buchholzScores = await calculateBuchholzScores();
      
      const userUpdatePromises = Array.from(scoreUpdates.entries()).map(async ([playerId, newScore]) => {
        const buchholzScore = buchholzScores.get(playerId) || 0;
        
        return supabase
          .from("user_profile")
          .update({
            total_score: newScore,
            // TB1 Direct Encounter tetap 0, akan dihitung hanya di akhir
            tb1_direct_encounter: 0,
            // TB2 Buchholz diupdate setiap round
            tb2_buchholz: buchholzScore
          })
          .eq("id", playerId);
      });

      await Promise.all(userUpdatePromises);

      console.log("✅ SAVE COMPLETE");
      setIsRoundUpdated(true);
      alert("Round berhasil diupdate dan scores telah diperbarui!");
      navigate(-1);
    } catch (error) {
      console.error("❌ SAVE ERROR:", error);
      alert("Gagal mengupdate round. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  // Di PairingPage.tsx
  const handleBack = () => {
    if (pertemuanId) {
      navigate(`/admin/pertemuan/${pertemuanId}?tab=matches`);
    } else {
      navigate(-1);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (loading || !initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? "Loading round data..." : "Initializing bracket..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Kembali</span>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">
                Round {roundNumber} Pairings
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">Tournament Bracket</h2>
              </div>
              
              {/* Export Excel Button */}
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={18} />
                <span>Export Excel</span>
              </button>
            </div>
            
            {/* NEW: Search Bar */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari pemain berdasarkan nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <span className="text-gray-400 hover:text-gray-600">×</span>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-gray-600 mt-2">
                  Menampilkan {filteredMatches.length} dari {matches.length} match yang sesuai dengan pencarian "{searchQuery}"
                </p>
              )}
            </div>
            
            <p className="text-gray-600">
              Tentukan pemenang untuk setiap match. Semua match harus diselesaikan sebelum update round.
              <br />
              <strong>Scoring:</strong> Menang = 1 point, Tie = 0.5 point, Kalah = 0 point
            </p>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  Status: {allMatchesCompleted() ? "✅ Semua match selesai" : "⚠️ Beberapa match belum selesai"}
                </span>
                <span className="text-sm text-blue-800">
                  Completed: {roundScores.size} / {matches.length}
                  {matches.filter(m => isByeMatch(m)).length > 0 && 
                    ` (${matches.filter(m => isByeMatch(m)).length} BYE auto-win)`}
                </span>
              </div>
            </div>
          </div>
          

          <Bracket
            matches={filteredMatches} // Pass filtered matches to Bracket component
            roundScores={roundScores}
            onSetWinner={handleSetWinner}
            onSetTie={handleSetTie}
            roundNumber={roundNumber}
            playerScores={playerScores}
          />

          <div className="flex gap-3 mt-5">
            <button
              onClick={updateRound}
              disabled={saving || !allMatchesCompleted()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Update Round</span>
                </>
              )}
            </button>

            {/* Alternative Export Button */}
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={18} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}