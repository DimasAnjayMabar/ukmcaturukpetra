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

  // NEW: Function to calculate and update top winners
  const updateTopWinners = (playersData: any[]) => {
    if (playersData.length === 0) {
      setTopWinners([]);
      return;
    }

    // Sort players by: total_score DESC, tb1_direct_encounter DESC, tb2_buchholz DESC
    const sortedPlayers = [...playersData].sort((a, b) => {
      // Primary: total_score
      if (b.total_score !== a.total_score) {
        return (b.total_score || 0) - (a.total_score || 0);
      }
      
      // Secondary: tb1_direct_encounter
      if ((b.tb1_direct_encounter || 0) !== (a.tb1_direct_encounter || 0)) {
        return (b.tb1_direct_encounter || 0) - (a.tb1_direct_encounter || 0);
      }
      
      // Tertiary: tb2_buchholz
      return (b.tb2_buchholz || 0) - (a.tb2_buchholz || 0);
    });

    // Take top 6
    const top6 = sortedPlayers.slice(0, 6).map((player, index) => ({
      rank: index + 1,
      name: player.name,
      score: player.total_score || 0,
      tb1: player.tb1_direct_encounter || 0,
      tb2: player.tb2_buchholz || 0
    }));

    setTopWinners(top6);
  };

  const fetchPlayers = async () => {
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("kehadiran")
        .select("user_id")
        .eq("pertemuan_id", pertemuanId)
        .eq("isAttending", true);

      if (attendanceError) throw attendanceError;

      const userIds = attendanceData?.map(a => a.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from("user_profile")
          .select("id, name, nrp, role, email, total_score, tb1_direct_encounter, tb2_buchholz")
          .in("id", userIds);

        if (userError) throw userError;

        const playersData: SwissPlayer[] = (userData || []).map(user => ({
          id: user.id,
          name: user.name,
          score: user.total_score || 0,
          playedOpponents: [],
          nrp: user.nrp,
          role: user.role,
          email: user.email,
          tb1: user.tb1_direct_encounter || 0,
          tb2: user.tb2_buchholz || 0
        }));

        setPlayers(playersData);
        
        // NEW: Always update top winners when fetching players
        updateTopWinners(userData || []);
      } else {
        setTopWinners([]);
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      setTopWinners([]);
    }
  };

  const computeAndSaveTB1 = async (pertemuanId: string) => {
    try {
      // 1️⃣ Ambil semua pemain yang hadir di pertemuan
      const { data: attendance, error: attErr } = await supabase
        .from("kehadiran")
        .select("user_id")
        .eq("pertemuan_id", pertemuanId)
        .eq("isAttending", true);
      if (attErr) throw attErr;

      const userIds = (attendance || []).map((r) => r.user_id);
      if (userIds.length === 0) return;

      // 2️⃣ Ambil skor total untuk setiap pemain
      const { data: users, error: usersErr } = await supabase
        .from("user_profile")
        .select("id, total_score")
        .in("id", userIds);
      if (usersErr) throw usersErr;

      // 3️⃣ Kelompokkan pemain berdasarkan total_score
      const groups = new Map<number, string[]>();
      users.forEach((u) => {
        const s = Number(u.total_score || 0);
        if (!groups.has(s)) groups.set(s, []);
        groups.get(s)!.push(u.id);
      });

      // 4️⃣ Inisialisasi map hasil TB1
      const tb1Map = new Map<string, number>();

      for (const [score, group] of groups.entries()) {
        // ⚠️ PENTING: DE hanya dihitung jika grup terdiri dari TEPAT 2 pemain
        if (group.length !== 2) {
          // Jika grup hanya 1 orang atau lebih dari 2 orang, DE = 0
          group.forEach((pid) => tb1Map.set(pid, 0));
          continue;
        }

        // Jika tepat 2 pemain, hitung DE berdasarkan head-to-head
        const groupSet = new Set(group);

        // Ambil semua match antar pemain di grup ini
        const { data: matches, error: matchErr } = await supabase
          .from("turnamen")
          .select("pemain_1_id, pemain_2_id, hasil_pemain_1, hasil_pemain_2")
          .eq("pertemuan_id", parseInt(pertemuanId));

        if (matchErr) throw matchErr;

        const headToHead = (matches || []).filter(
          (m) =>
            m.pemain_1_id &&
            m.pemain_2_id &&
            groupSet.has(m.pemain_1_id) &&
            groupSet.has(m.pemain_2_id)
        );

        // Inisialisasi TB1 per pemain di grup
        group.forEach((pid) => tb1Map.set(pid, 0));

        // Hitung TB1 berdasarkan hasil head-to-head
        headToHead.forEach((m) => {
          const p1 = m.pemain_1_id;
          const p2 = m.pemain_2_id;
          const r1 = Number(m.hasil_pemain_1 ?? 0);
          const r2 = Number(m.hasil_pemain_2 ?? 0);

          tb1Map.set(p1, (tb1Map.get(p1) || 0) + r1);
          tb1Map.set(p2, (tb1Map.get(p2) || 0) + r2);
        });
      }

      // 5️⃣ Update ke tabel user_profile
      const updatePromises = Array.from(tb1Map.entries()).map(([pid, tb1]) =>
        supabase
          .from("user_profile")
          .update({ tb1_direct_encounter: tb1 })
          .eq("id", pid)
      );

      await Promise.all(updatePromises);
      console.log("✅ TB1 Direct Encounter berhasil dihitung dan disimpan.");
    } catch (error) {
      console.error("❌ Error menghitung TB1:", error);
    }
  };

  // UPDATED: Function to export final standings - simplified
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
      // 🧠 Langkah baru: Hitung TB1 sebelum export
      await computeAndSaveTB1(pertemuanId);

      // Fetch data pemain terbaru (sudah mengandung TB1 & TB2 terbaru)
      const { data: userData, error } = await supabase
        .from("user_profile")
        .select("id, name, nrp, total_score, tb1_direct_encounter, tb2_buchholz")
        .in("id", players.map(p => p.id));

      if (error) throw error;

      // Sort berdasarkan aturan FIDE
      const sortedPlayers = (userData || []).sort((a, b) => {
        if (b.total_score !== a.total_score)
          return (b.total_score || 0) - (a.total_score || 0);
        if ((b.tb1_direct_encounter || 0) !== (a.tb1_direct_encounter || 0))
          return (b.tb1_direct_encounter || 0) - (a.tb1_direct_encounter || 0);
        return (b.tb2_buchholz || 0) - (a.tb2_buchholz || 0);
      });

      // Update Top 6
      updateTopWinners(userData || []);

      // Siapkan data Excel
      const excelData = sortedPlayers.map((player, index) => ({
        "Rank": index + 1,
        "Name": player.name,
        "NRP": player.nrp,
        "Points": player.total_score || 0,
        "Direct Encounter": player.tb1_direct_encounter || 0,
        "Buchholz": player.tb2_buchholz || 0,
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

        // Helper function to check if match is BYE
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
          // BYE matches are always considered complete
          if (isByeMatch(match)) {
            return false;
          }

          // For non-BYE matches, check if match has results
          // Match is complete if:
          // 1. Has a winner (pemenang is set), OR
          // 2. Has results recorded (tie: both hasil fields are not null)
          const hasWinner = match.pemenang !== null && match.pemenang !== undefined;
          const hasResults = match.hasil_pemain_1 !== null && match.hasil_pemain_2 !== null;
          
          // Match is incomplete if it has neither winner nor results
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
      alert(`Max rounds berhasil diset menjadi ${rounds}`);
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
      
      // NEW: Refresh players data to update top winners after round creation
      await fetchPlayers();
    } catch (error) {
      console.error("❌ Error creating round:", error);
      alert("Gagal membuat round. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const deleteRound = async (roundId: number, roundName: string, roundNumber: number) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${roundName}? Slot round ${roundNumber} akan tersedia kembali.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error: tournamentError } = await supabase
        .from("turnamen")
        .delete()
        .eq("round", roundId);

      if (tournamentError) throw tournamentError;

      const { error: roundError } = await supabase
        .from("round")
        .delete()
        .eq("id", roundId);

      if (roundError) throw roundError;

      await fetchExistingRounds();
      // NEW: Refresh players data to update top winners after round deletion
      await fetchPlayers();
      
      alert(`${roundName} successfully deleted! Round ${roundNumber} can now be readded.`);
    } catch (error) {
      console.error("Error deleting round:", error);
      alert("Failed to delete round. Please try again.");
    } finally {
      setLoading(false);
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
                        
                        {/* Left side - Rank and Name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-semibold text-slate-300 w-5 text-left">
                            #{winner.rank}
                          </span>
                          <span className="font-semibold text-slate-100 truncate" title={winner.name}>
                            {winner.name}
                          </span>
                        </div>

                        {/* Right side - Stats: Points, TB1, TB2 */}
                        <div className="text-sm text-slate-400 flex items-center gap-2 flex-shrink-0">
                          {/* Points */}
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Pts:</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#44ff6f] to-[#b3ffe5]">
                              {winner.score.toFixed(1)}
                            </span>
                          </div>
                          
                          {/* TB1 - Direct Encounter */}
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">TB1:</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#ffd744] to-[#ffe5b3]">
                              {winner.tb1.toFixed(1)}
                            </span>
                          </div>
                          
                          {/* TB2 - Buchholz */}
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">TB2:</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-tl from-[#568eff] to-[#a0c3ff]">
                              {winner.tb2.toFixed(1)}
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