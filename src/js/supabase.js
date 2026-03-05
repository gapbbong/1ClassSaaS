import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing! Check your .env file.");
}

// createClient will throw if URL is missing. Let's handle it.
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: new Error("Missing Supabase Config") }),
                    maybeSingle: () => Promise.resolve({ data: null, error: new Error("Missing Supabase Config") }),
                    limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: new Error("Missing Supabase Config") }) })
                }),
                order: () => Promise.resolve({ data: [], error: new Error("Missing Supabase Config") }),
                in: () => Promise.resolve({ data: [], error: new Error("Missing Supabase Config") })
            }),
            insert: () => Promise.resolve({ error: new Error("Missing Supabase Config") }),
            update: () => Promise.resolve({ error: new Error("Missing Supabase Config") }),
            delete: () => Promise.resolve({ error: new Error("Missing Supabase Config") })
        })
    };

