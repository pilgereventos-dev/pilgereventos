import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gscdpximjlilbjimecou.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-key';

console.log('Supabase Key configured:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'YES' : 'NO');
if (supabaseKey === 'missing-key') console.warn('Using fallback Supabase key!');

export const supabase = createClient(supabaseUrl, supabaseKey);
