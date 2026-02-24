import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gscdpximjlilbjimecou.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key';

// A secondary Supabase client that docs not persist the session.
// This is useful for creating new users while an admin is logged in, 
// so the admin does not get logged out when the signUp completes.
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});
