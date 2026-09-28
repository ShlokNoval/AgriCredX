import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing in environment variables! Using dummy values to prevent crash.");
}

export const supabase = createClient(
  supabaseUrl || 'https://dummy-project.supabase.co', 
  supabaseAnonKey || 'dummy-anon-key'
);
