// ====================================== LOGIN ======================================
export interface LoginFormData {
  email: string;
  password: string;
}

// ====================================== REGISTER ======================================
export interface RegisterFormData {
  password: string;
  name: string;
  nrp: string;
  email: string;
}

export interface UserProfile {
  id: string;
  role: string;
  total_score: number;
  name: string;
  nrp: string;
  email: string;
}

export interface Pertemuan {
  id: string;
  judul_pertemuan: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  lokasi: string;
  deskripsi?: string;
  is_tournament: boolean;
  qr_code: string;
}

export interface Kehadiran {
  id: string;
  user_id: string;
  pertemuan_id: string;
  isAttending: boolean;
  waktu_kehadiran?: string;
}

export interface RegistOut {
  id: string;
  user_id: string;
  pertemuan_id: string;
  isRegistedOut: boolean;
  waktu_regist_out?: string;
}

export type TournamentMatch = {
  id?: number; // Optional for new matches
  pertemuan_id: number;
  pairingId: number; // tambahkan ini
  round: number;
  match_ke: number;
  pemain_1_id: string;
  pemain_1_name: string;
  hasil_pemain_1?: number | null; // Optional for new matches
  pemain_2_id: string;
  pemain_2_name: string;
  hasil_pemain_2?: number | null; // Optional for new matches
  pemenang?: string | null; // Optional for new matches
}