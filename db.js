import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Ensure Supabase credentials are provided in the .env file
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key are required. Please check your .env file.");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

