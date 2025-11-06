// services/tournamentStateService.ts

import { supabase } from '../db_client/client';
import { TournamentState } from '../types';

export class TournamentStateService {
  static async saveState(tournamentId: string, state: TournamentState) {
    const { data, error } = await supabase
      .from('tournament_state')
      .upsert({
        pertemuan_id: tournamentId,
        state_data: {
          ...state,
          metadata: {
            ...state.metadata,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
          }
        },
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('Error saving tournament state:', error);
      throw error;
    }
    return data;
  }

  static async loadState(tournamentId: string): Promise<TournamentState | null> {
    const { data, error } = await supabase
      .from('tournament_state')
      .select('state_data')
      .eq('pertemuan_id', tournamentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error loading tournament state:', error);
      throw error;
    }
    
    return data?.state_data || null;
  }

  static async deleteState(tournamentId: string) {
    const { error } = await supabase
      .from('tournament_state')
      .delete()
      .eq('pertemuan_id', tournamentId);

    if (error) {
      console.error('Error deleting tournament state:', error);
      throw error;
    }
  }
}