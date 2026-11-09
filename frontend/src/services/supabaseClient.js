import { createClient } from '@supabase/supabase-js';

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured =
    /^https?:\/\/.+/i.test(rawUrl) &&
    Boolean(rawKey) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your_supabase');

const safeUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? rawKey : 'placeholder_anon_key';

let client = null;
try {
    if (isSupabaseConfigured) {
        client = createClient(safeUrl, safeKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        });
    }
} catch {
    client = null;
}

export const supabase = client;
