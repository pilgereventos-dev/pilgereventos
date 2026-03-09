import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { guest_id } = request.body;

    if (!guest_id) {
        return response.status(400).json({ error: 'Missing guest_id' });
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        return response.status(500).json({ error: 'Server configuration error (Supabase)' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Fetch Guest
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .select('*')
            .eq('id', guest_id)
            .single();

        if (guestError || !guest) {
            console.error('Guest not found:', guestError);
            return response.status(404).json({ error: 'Guest not found' });
        }

        if (!guest.phone) {
            return response.status(400).json({ error: 'Guest has no phone number' });
        }

        // 2. Fetch ConnectyHub credentials & Welcome configuration
        const { data: configData, error: configError } = await supabase
            .from('app_config')
            .select('key, value')
            .in('key', [
                'connectyhub_api_url',
                'connectyhub_api_key',
                'connectyhub_instance',
                'welcome_message_template',
                'welcome_message_media_url',
                'welcome_message_media_type',
                'welcome_message_media_name'
            ]);

        if (configError || !configData) {
            console.error('Error fetching config:', configError);
            return response.status(500).json({ error: 'Failed to fetch API configuration' });
        }

        const config: Record<string, string> = {};
        configData.forEach((row: any) => { config[row.key] = row.value; });

        const apiUrl = config.connectyhub_api_url;
        const apiKey = config.connectyhub_api_key;
        const instanceName = config.connectyhub_instance;

        // Message and Media
        const messageTemplate = config.welcome_message_template || 'Olá {name}, seu cadastro foi recebido com sucesso!';
        const messageContent = messageTemplate.replace(/{name}/g, guest.name);

        const mediaUrl = config.welcome_message_media_url;
        const mediaTypeRaw = config.welcome_message_media_type;
        const mediaName = config.welcome_message_media_name || 'anexo';

        if (!apiUrl || !apiKey || !instanceName) {
            console.error('Missing ConnectyHub credentials. Found keys:', Object.keys(config));
            return response.status(500).json({ error: 'API credentials not configured in database' });
        }

        // 3. Format phone number
        const cleanPhone = guest.phone.replace(/\D/g, '');
        const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        console.log(`Sending Welcome API to number: ${number}`);

        // 4. Send Content (Text or Media)
        let endpoint = `${apiUrl}/message/sendText/${instanceName}`;
        let requestBody: any = {
            number: number,
            options: { delay: 1200, presence: "composing" },
            textMessage: { text: messageContent }
        };

        if (mediaUrl) {
            // Determine mediatype for ConnectyHub
            let mediaTypeParams = 'document';
            if (mediaTypeRaw) {
                if (mediaTypeRaw.startsWith('image')) mediaTypeParams = 'image';
                else if (mediaTypeRaw.startsWith('video')) mediaTypeParams = 'video';
                else if (mediaTypeRaw.startsWith('audio')) mediaTypeParams = 'audio';
            }

            endpoint = `${apiUrl}/message/sendMedia/${instanceName}`;
            requestBody = {
                number: number,
                options: { delay: 1200, presence: "composing" },
                mediaMessage: {
                    mediatype: mediaTypeParams,
                    fileName: mediaName,
                    caption: messageContent,
                    media: mediaUrl
                }
            };
        }

        console.log(`Calling ConnectyHub API: ${endpoint}`);
        const apiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.text();
            console.error('ConnectyHub API Error:', apiResponse.status, errorData);
            throw new Error(`API Error (${apiResponse.status}): ${errorData}`);
        }

        const data = await apiResponse.json();
        console.log('Welcome payload sent successfully:', data);

        // 5. Mark WhatsApp as sent
        await supabase
            .from('guests')
            .update({ whatsapp_sent: true })
            .eq('id', guest_id);

        return response.status(200).json({ success: true, data });

    } catch (error: any) {
        console.error('Execution Error:', error);
        return response.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
