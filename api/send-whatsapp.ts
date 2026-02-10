import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { phone, name, guests_count } = request.body;

    if (!phone || !name) {
        return response.status(400).json({ error: 'Missing phone or name' });
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        return response.status(500).json({
            error: `Server configuration error (Supabase). Missing: ${!supabaseUrl ? 'URL' : ''} ${!supabaseServiceKey ? 'Key' : ''}`
        });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch ConnectyHub API credentials AND welcome message template
    const { data: configData, error: configError } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', [
            'connectyhub_api_url',
            'connectyhub_api_key',
            'connectyhub_instance',
            'welcome_message_template'
        ]);

    if (configError || !configData) {
        console.error('Error fetching config:', configError);
        return response.status(500).json({ error: 'Failed to fetch API configuration' });
    }

    const config = configData.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
    }, {});

    const apiKey = config.connectyhub_api_key;
    const apiUrl = config.connectyhub_api_url;
    const instanceName = config.connectyhub_instance;
    // Default template fallback if DB is empty
    const template = config.welcome_message_template || `Olá *{name}*! 👋

Sua presença no *Folia do Pilger* foi confirmada com sucesso! 🎭✨

🗓 *Data:* 16 de Fevereiro
📍 *Local:* Av. Carlos Drummond de Andrade, Praia Brava
⏰ *Horário:* 16h

{guest_summary}

Estamos ansiosos para te receber neste evento exclusivo!

_Este é um convite digital e pessoal._`;

    if (!apiKey || !apiUrl || !instanceName) {
        console.error('Missing ConnectyHub API credentials in DB');
        return response.status(500).json({ error: 'API credentials not configured in database' });
    }

    try {
        // Format phone number (remove non-digits)
        const formattedPhone = phone.replace(/\D/g, '');
        const number = formattedPhone.startsWith('55') ? formattedPhone : `55${formattedPhone}`;

        // Prepare Guest Summary
        const guestSummary = guests_count === 0
            ? 'Você convidou: Somente você.'
            : `Você convidou: Você + ${guests_count} convidado(s).`;

        // Compile Message
        const message = template
            .replace(/{name}/g, name)
            .replace(/{guest_summary}/g, guestSummary);

        const responseEvolution = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                number: number,
                text: message,
            }),
        });

        if (!responseEvolution.ok) {
            const errorData = await responseEvolution.text();
            console.error('ConnectyHub API Error:', errorData);
            throw new Error(`Failed to send message: ${responseEvolution.statusText}`);
        }

        const data = await responseEvolution.json();
        return response.status(200).json({ success: true, data });

    } catch (error: any) {
        console.error('Error sending WhatsApp:', error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
