
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Fetch old keys
    const { data: oldData, error: fetchError } = await supabase
        .from('app_config')
        .select('*')
        .in('key', ['evolution_api_url', 'evolution_api_key', 'evolution_instance']);

    if (fetchError) {
        console.error('Error fetching data:', fetchError);
        return;
    }

    console.log('Found old data:', oldData);

    // 2. Insert new keys with old values (or defaults if missing)
    const newConfigs = [
        {
            key: 'connectyhub_api_url',
            value: oldData.find(d => d.key === 'evolution_api_url')?.value || 'https://api.connectyhub.com',
            description: 'ConnectyHub API URL'
        },
        {
            key: 'connectyhub_api_key',
            value: oldData.find(d => d.key === 'evolution_api_key')?.value || '',
            description: 'ConnectyHub API Key'
        },
        {
            key: 'connectyhub_instance',
            value: oldData.find(d => d.key === 'evolution_instance')?.value || '',
            description: 'ConnectyHub Instance Name'
        }
    ];

    const { error: insertError } = await supabase
        .from('app_config')
        .upsert(newConfigs);

    if (insertError) {
        console.error('Error inserting new keys:', insertError);
        return;
    }

    console.log('Inserted new keys.');

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
