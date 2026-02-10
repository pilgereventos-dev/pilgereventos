
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.temp file
const envPath = path.resolve(__dirname, '.env');
console.log('Reading .env from:', envPath);

let env = {};
try {
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/['"]/g, ''); // Remove quotes
                env[key] = value;
            }
        });
    } else {
        console.log('.env.temp file not found');
    }
} catch (e) {
    console.error('Error reading .env.temp file:', e);
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing credentials in .env.temp');
    console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Fetch old keys AND potential new keys if user already ran partially
    const { data: allData, error: fetchError } = await supabase
        .from('app_config')
        .select('*')
        .in('key', [
            'evolution_api_url', 'evolution_api_key', 'evolution_instance',
            'connectyhub_api_url', 'connectyhub_api_key', 'connectyhub_instance'
        ]);

    if (fetchError) {
        console.error('Error fetching data:', fetchError);
        return;
    }

    console.log('Found current data:', allData);

    // We want to ensure we have connectyhub keys with correct descriptions.
    // We prefer values from 'evolution_*' if 'connectyhub_*' don't exist yet or are empty.

    const getVal = (key) => allData?.find(d => d.key === key)?.value;

    const newConfigs = [
        {
            key: 'connectyhub_api_url',
            value: getVal('connectyhub_api_url') || getVal('evolution_api_url') || 'https://api.connectyhub.com',
            description: 'URL Base da API ConnectyHub'
        },
        {
            key: 'connectyhub_api_key',
            value: getVal('connectyhub_api_key') || getVal('evolution_api_key') || '',
            description: 'Chave de API ConnectyHub'
        },
        {
            key: 'connectyhub_instance',
            value: getVal('connectyhub_instance') || getVal('evolution_instance') || '',
            description: 'ID da Instância ConnectyHub'
        }
    ];

    console.log('Upserting:', newConfigs);

    const { error: insertError } = await supabase
        .from('app_config')
        .upsert(newConfigs);

    if (insertError) {
        console.error('Error inserting new keys:', insertError);
        return;
    }

    console.log('Inserted/Updated new keys.');

    // 3. Delete old keys
    const { error: deleteError } = await supabase
        .from('app_config')
        .delete()
        .in('key', ['evolution_api_url', 'evolution_api_key', 'evolution_instance']);

    if (deleteError) {
        console.error('Error deleting old keys:', deleteError);
    } else {
        console.log('Deleted old keys.');
    }

    console.log('Migration complete.');
}

migrate();
