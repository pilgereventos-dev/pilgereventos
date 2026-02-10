
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request: VercelRequest, response: VercelResponse) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Fetch API credentials (ConnectyHub with fallback to Evolution)
        const { data: configData, error: configError } = await supabase
            .from('app_config')
            .select('key, value')
            .in('key', [
                'connectyhub_api_url', 'connectyhub_api_key', 'connectyhub_instance',
                'evolution_api_url', 'evolution_api_key', 'evolution_instance'
            ]);

        if (configError || !configData) {
            console.error('Error fetching config:', configError);
            return response.status(500).json({ error: 'Failed to fetch API configuration' });
        }

        const config = configData.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        const apiKey = config.connectyhub_api_key || config.evolution_api_key;
        const apiUrl = config.connectyhub_api_url || config.evolution_api_url;
        const instanceName = config.connectyhub_instance || config.evolution_instance;

        if (!apiKey || !apiUrl || !instanceName) {
            return response.status(500).json({ error: 'API credentials not configured' });
        }

        // 2. Fetch Pending Messages due for sending
        const { data: messages, error: queueError } = await supabase
            .from('message_queue')
            .select('*, guests(name, phone)')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString()) // scheduled_for <= now
            .limit(10); // Process in batches

        if (queueError) {
            return response.status(500).json({ error: queueError.message });
        }

        if (!messages || messages.length === 0) {
            return response.status(200).json({ message: 'No messages to process', processed: 0 });
        }

        // 3. Send Messages
        const results = await Promise.all(messages.map(async (msg) => {
            // Determine Recipient (Use target_phone if available, otherwise guest phone)
            const targetPhone = msg.target_phone || (msg.guests ? msg.guests.phone : null);

            if (!targetPhone) {
                // Invalid guest or no phone, mark as failed
                await supabase.from('message_queue').update({ status: 'failed' }).eq('id', msg.id);
                return { id: msg.id, status: 'failed', reason: 'No phone number' };
            }

            // Format phone (Ensure it sends to 55...)
            let number = targetPhone.replace(/\D/g, '');
            if (!number.startsWith('55')) {
                number = '55' + number;
            }

            try {
                const apiResponse = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey,
                    },
                    body: JSON.stringify({
                        number: number,
                        options: {
                            delay: 1200,
                            presence: "composing",
                        },
                        textMessage: {
                            text: msg.content,
                        },
                    }),
                });

                if (apiResponse.ok) {
                    await supabase.from('message_queue').update({
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    }).eq('id', msg.id);
                    return { id: msg.id, status: 'sent' };
                } else {
                    const errorText = await apiResponse.text();
                    console.error(`Failed to send message ${msg.id}:`, errorText);
                    await supabase.from('message_queue').update({ status: 'failed' }).eq('id', msg.id);
                    return { id: msg.id, status: 'failed', reason: 'API Error' };
                }
            } catch (err) {
                console.error(`Exception sending message ${msg.id}:`, err);
                await supabase.from('message_queue').update({ status: 'failed' }).eq('id', msg.id);
                return { id: msg.id, status: 'failed', reason: 'Network Error' };
            }
        }));

        return response.status(200).json({
            message: 'Queue processed',
            processed: results.length,
            results
        });

    } catch (e: any) {
        console.error(e);
        return response.status(500).json({ error: e.message });
    }
}
