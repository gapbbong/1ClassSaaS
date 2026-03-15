import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';

// config.js의 설정을 우선 사용하고, 없으면 환경변수 사용
const supabaseUrl = SUPABASE_CONFIG.URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = SUPABASE_CONFIG.ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase configuration is missing in both config.js and .env!");
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

