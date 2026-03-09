import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function run() {
    // We can't query information_schema directly via JS client, but we can fetch 1 row to see the fields.
    const { data: qData, error: qErr } = await supabase.from('message_queue').select('*').limit(1);
    const { data: rData, error: rErr } = await supabase.from('automation_rules').select('*').limit(1);

    console.log('message_queue columns:', qData ? Object.keys(qData[0] || {}) : qErr);
    console.log('automation_rules columns:', rData ? Object.keys(rData[0] || {}) : rErr);
}
run();
