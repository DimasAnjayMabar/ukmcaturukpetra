import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SwissPlayer } from "../../../utils/swiss";
import { supabase } from "../../../db_client/client";
import { Settings, Download, Trophy, Crown, Award, Star } from "lucide-react";
import * as XLSX from "xlsx";

export default function RoundsCard({ pertemuanId }: { pertemuanId: string }) {
  const [rounds, setRounds] = useState<{ id: number; name: string; date: string; roundNumber: number }[]>([]);
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
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<boolean>(true);

  // Effect to handle clicks outside the chart to close the tooltip on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartWrapperRef.current && !chartWrapperRef.current.contains(event.target as Node)) {
        setActiveTooltip(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [chartWrapperRef]);

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

    // Sort players by: total_score DESC, tb2_buchholz DESC
    const sortedPlayers = [...playersData].sort((a, b) => {
      // Primary: total_score
      if (b.total_score !== a.total_score) {
        return (b.total_score || 0) - (a.total_score || 0);
      }
      
      // Secondary: tb2_buchholz
      return (b.tb2_buchholz || 0) - (a.tb2_buchholz || 0);
    });

    // Take top 6
    const top6 = sortedPlayers.slice(0, 6).map((player, index) => ({
      rank: index + 1,
      name: player.name,
      score: player.total_score || 0,
      tb: player.tb2_buchholz || 0
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
          .select("id, name, nrp, role, email, total_score, tb2_buchholz")
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
        if (group.length === 1) {
          tb1Map.set(group[0], 0);
          continue;
        }

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
      alert("Max rounds belum diset!");
      return;
    }

    if (rounds.length < maxRounds) {
      alert(`Belum mencapai max rounds! Saat ini ${rounds.length} dari ${maxRounds} rounds.`);
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
        "Tiebreaker": player.tb2_buchholz || 0,
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
      alert("✅ Final standings berhasil di-export!");
    } catch (error) {
      console.error("Error exporting final standings:", error);
      alert("Gagal mengexport final standings. Silakan coba lagi.");
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
        date: new Date(round.created_at).toLocaleDateString(),
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
      alert("Masukkan jumlah round yang valid (minimal 1)");
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

      alert(`Round ${nextRoundNumber} berhasil dibuat dengan ${pairings.length} match!`);
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
      
      alert(`${roundName} berhasil dihapus! Slot round ${roundNumber} sekarang tersedia untuk dibuat ulang.`);
    } catch (error) {
      console.error("Error deleting round:", error);
      alert("Gagal menghapus round. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPairings = (roundId: number) => {
    navigate(`/admin/pairing/${roundId}?pertemuanId=${pertemuanId}`);
  };

  const getAddButtonText = () => {
    if (maxRounds === null) {
      return "Set Max Rounds Terlebih Dahulu";
    }
    
    if (totalRounds >= maxRounds) {
      return `Max Rounds Tercapai (${maxRounds})`;
    }
    
    if (players.length < 2) {
      return "Minimal 2 Pemain Diperlukan";
    }
    
    const nextNumber = getNextAvailableRoundNumber();
    return loading ? "Loading..." : `+ Tambah Round ${nextNumber || ''}`;
  };

  // Function to get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="text-yellow-500" size={20} />;
      case 2: return <Award className="text-slate-400" size={20} />;
      case 3: return <Award className="text-amber-600" size={20} />;
      default: return <Star className="text-[#30ffb6]" size={16} />;
    }
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
                {/* --- MODIFIED LINE (width and ref) --- */}
                <div className="w-full lg:w-1/2 h-64 lg:h-auto" ref={chartWrapperRef}> 
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: -35, left: 5, bottom: 5 }}
                      onMouseEnter={() => setActiveTooltip(true)} // <-- ADDED
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="rankLabel" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                      <YAxis 
                        orientation="right" 
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip 
                        active={activeTooltip} // <-- ADDED
                        cursor={{fill: '#334155', opacity: 0.6}}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                        // --- ADDED THIS PROP ---
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
                          // --- MODIFIED THIS PROP (FIXES TS ERROR) ---
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

          {topWinners.length < 6 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Total pemain: {players.length} (menampilkan {topWinners.length} teratas)
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
            {maxRounds !== null && totalRounds >= maxRounds && (
              <button
                onClick={exportFinalStandings}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-tl from-[#01b82c] to-[#29ffb8] text-[#fefff9] rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Export</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setShowMaxRoundsModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-tl from-[#0600a8] to-[#679dfb] text-[#fefff9] rounded-lg transition-colors"
            >
              <Settings size={18} />
              <span>Set Max Rounds</span>
            </button>

            <button
              onClick={addRound}
              disabled={!canAddRound() || loading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition"
            >
              {getAddButtonText()}
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

        {maxRounds !== null && totalRounds >= maxRounds && (
          <div className="mb-4 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg">
            <p className="text-green-200 text-sm">
              <strong>Turnamen Selesai:</strong> Sudah mencapai batas maksimum {maxRounds} rounds. Klik "Export Final Standings" untuk hasil akhir.
            </p>
          </div>
        )}

        {rounds.length === 0 ? (
          <p className="text-slate-400 italic text-center py-4">Belum ada round tercipta</p>
        ) : (
           
          <div className="grid gap-3 mt-4">
            {rounds.map((round) => (
              <div
                key={round.id}
                className="rounded-lg p-4 bg-slate-800 hover:bg-slate-700 transition shadow-sm border border-slate-700"
              >
                <div className="flex justify-between items-center">
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => handleViewPairings(round.id)}
                  >
                    <h3 className="font-semibold text-slate-50">{round.name}</h3>
                    <span className="text-sm text-slate-300">{round.date}</span>
                  </div>
                  <button
                    onClick={() => deleteRound(round.id, round.name, round.roundNumber)}
                    disabled={loading}
                    className="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white rounded-lg transition text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div 
                  className="text-sm text-blue-300 mt-2 cursor-pointer hover:underline"
                  onClick={() => handleViewPairings(round.id)}
                >
                  Pairings: (click to view and update results)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showMaxRoundsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Set Max Rounds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Maximum Rounds
              </label>
              <input
                type="number"
                min="1"
                value={maxRoundsInput}
                onChange={(e) => setMaxRoundsInput(e.target.value)}
                placeholder="Masukkan jumlah max rounds"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Set jumlah maksimum round untuk turnamen ini.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMaxRoundsModal(false);
                  setMaxRoundsInput("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveMaxRounds}
                disabled={savingMaxRounds || !maxRoundsInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {savingMaxRounds ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}