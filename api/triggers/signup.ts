
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
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { guest_id } = request.body;

    if (!guest_id) {
        return response.status(400).json({ error: 'Missing guest_id' });
    }

    try {
        // 1. Fetch Guest Details (for variable replacement if needed immediately, though queue stores template mostly)
        // Actually we just need the ID to schedule. 

        // 2. Fetch Active Signup Relative Rules
        const { data: rules, error: rulesError } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('active', true)
            .eq('type', 'signup_relative');

        if (rulesError) throw rulesError;

        if (!rules || rules.length === 0) {
            return response.status(200).json({ message: 'No signup rules active' });
        }

        // Initialize queueItems array
        const queueItems: any[] = [];

        // Fetch full guest details including companions
        const { data: guest } = await supabase
            .from('guests')
            .select('*')
            .eq('id', guest_id)
            .single();

        if (guest) {
            rules.forEach(rule => {
                const minutes = parseInt(rule.trigger_value, 10);
                const scheduledFor = new Date();
                scheduledFor.setMinutes(scheduledFor.getMinutes() + minutes);
                const scheduledIso = scheduledFor.toISOString();

                // 1. Main Guest Item
                queueItems.push({
                    guest_id,
                    rule_id: rule.id,
                    content: rule.message_template.replace(/{name}/g, guest.name),
                    scheduled_for: scheduledIso,
                    status: 'pending',
                    target_phone: null, // Use default
                    target_name: null   // Use default
                });

                // 2. Companion 1 Item
                if (guest.companion1_name && guest.companion1_phone) {
                    queueItems.push({
                        guest_id,
                        rule_id: rule.id,
                        content: rule.message_template.replace(/{name}/g, guest.companion1_name),
                        scheduled_for: scheduledIso,
                        status: 'pending',
                        target_phone: guest.companion1_phone,
                        target_name: guest.companion1_name
                    });
                }

                // 3. Companion 2 Item
                if (guest.companion2_name && guest.companion2_phone) {
                    queueItems.push({
                        guest_id,
                        rule_id: rule.id,
                        content: rule.message_template.replace(/{name}/g, guest.companion2_name),
                        scheduled_for: scheduledIso,
                        status: 'pending',
                        target_phone: guest.companion2_phone,
                        target_name: guest.companion2_name
                    });
                }
            });
        }

        const { error: insertError } = await supabase
            .from('message_queue')
            .insert(queueItems);

        if (insertError) throw insertError;

        // Trigger Inngest to process the queue immediately
        try {
            // Dynamically import to avoid top-level await issues if any
            const { inngest } = await import('../_lib/inngest/client');
            await inngest.send({
                name: "app/process.queue",
                data: {}
            });
            console.log("Inngest event triggered");
        } catch (inngestErr) {
            console.error("Failed to trigger Inngest:", inngestErr);
            // Don't fail the request just because trigger failed, cron will pick it up later if configured
        }

        return response.status(200).json({ message: `Scheduled ${queueItems.length} messages`, tasks: queueItems });

    } catch (e: any) {
        console.error('Error scheduling signup messages:', e);
        return response.status(500).json({ error: e.message });
    }
}
