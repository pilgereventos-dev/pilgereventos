import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Node.js environment)
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// We need to handle the case where env vars might be missing during build time vs runtime
const supabase = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

export const processQueue = inngest.createFunction(
    { id: "process-message-queue" },
    [
        { event: "app/process.queue" },
        { cron: "* * * * *" }
    ],
    async ({ step }) => {
        if (!supabase) {
            throw new Error("Supabase credentials missing");
        }

        // 1. Fetch Configuration
        const config = await step.run("fetch-config", async () => {
            const { data: configData, error: configError } = await supabase
                .from('app_config')
                .select('key, value')
                .in('key', [
                    'connectyhub_api_url', 'connectyhub_api_key', 'connectyhub_instance',
                    'evolution_api_url', 'evolution_api_key', 'evolution_instance'
                ]);

            if (configError || !configData) throw new Error("Failed to fetch config");

            const cfg = configData.reduce((acc: any, item: any) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const apiKey = cfg.connectyhub_api_key || cfg.evolution_api_key;
            const apiUrl = cfg.connectyhub_api_url || cfg.evolution_api_url;
            const instanceName = cfg.connectyhub_instance || cfg.evolution_instance;

            if (!apiKey || !apiUrl || !instanceName) throw new Error("API credentials not configured");

            return { apiKey, apiUrl, instanceName };
        });

        // 2. Fetch Pending Messages
        const messages = await step.run("fetch-messages", async () => {
            const { data, error } = await supabase
                .from('message_queue')
                .select('*, guests(name, phone)')
                .eq('status', 'pending')
                .lte('scheduled_for', new Date().toISOString())
                .limit(50); // Process 50 at a time

            if (error) throw error;
            return data || [];
        });

        if (messages.length === 0) {
            return { processed: 0, message: "No pending messages" };
        }

        // 3. Process Messages
        const results = await step.run("send-messages", async () => {
            const results = [];

            for (const msg of messages) {
                // Determine Recipient
                const targetPhone = msg.target_phone || (msg.guests ? msg.guests.phone : null);

                if (!targetPhone) {
                    await supabase.from('message_queue').update({ status: 'failed', sent_at: new Date().toISOString() }).eq('id', msg.id);
                    results.push({ id: msg.id, status: 'failed', reason: 'No phone' });
                    continue;
                }

                // Format Phone
                let number = targetPhone.replace(/\D/g, '');
                if (!number.startsWith('55')) number = '55' + number;

                try {
                    const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': config.apiKey,
                        },
                        body: JSON.stringify({
                            number: number,
                            options: { delay: 1200, presence: "composing" },
                            textMessage: { text: msg.content },
                        }),
                    });

                    if (response.ok) {
                        await supabase.from('message_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', msg.id);
                        results.push({ id: msg.id, status: 'sent' });
                    } else {
                        const errText = await response.text();
                        console.error(`Failed to send ${msg.id}: ${errText}`);
                        // Mark failed
                        await supabase.from('message_queue').update({ status: 'failed' }).eq('id', msg.id);
                        results.push({ id: msg.id, status: 'failed', error: errText });
                    }
                } catch (e: any) {
                    console.error(`Exception sending ${msg.id}:`, e);
                    await supabase.from('message_queue').update({ status: 'failed' }).eq('id', msg.id);
                    results.push({ id: msg.id, status: 'failed', error: e.message });
                }

                // Small delay between messages
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return results;
        });

        // 4. Check if more messages exist
        if (messages.length === 50) {
            await step.sendEvent("trigger-next-batch", {
                name: "app/process.queue",
                data: {},
            });
        }

        return { processed: messages.length, results };
    }
);
