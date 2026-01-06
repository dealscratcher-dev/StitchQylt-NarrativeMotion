import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Document = {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
  updated_at: string;
};

export type NarrativeSegment = {
  id: string;
  document_id: string;
  segment_index: number;
  text_content: string;
  emotion_tone: string;
  intensity: number;
  motion_type: string;
  created_at: string;
};

export type ReadingSession = {
  id: string;
  document_id: string;
  current_segment: number;
  started_at: string;
  last_active_at: string;
};
