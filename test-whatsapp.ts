import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.from('app_config').select('key,value');
    const config = data.reduce((a, c) => { a[c.key] = c.value; return a; }, {});

    const apiKey = config.connectyhub_api_key;
    const apiUrl = config.connectyhub_api_url;
    const instanceName = config.connectyhub_instance;
    const number = '5547999999999';
    const message = 'Test from AI Assistant';

    console.log(`Sending to ${apiUrl}/message/sendText/${instanceName}`);

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: JSON.stringify({ number, text: message })
    });
    console.log(response.status, await response.text());
}
run().catch(console.error);
