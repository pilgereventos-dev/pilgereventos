
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase credentials');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request: VercelRequest, response: VercelResponse) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

    const { rule_id } = request.body;
    if (!rule_id) return response.status(400).json({ error: 'Missing rule_id' });

    try {
        // 1. Fetch Rule
        const { data: rule, error: ruleError } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('id', rule_id)
            .single();

        if (ruleError || !rule) throw new Error('Rule not found');

        // Only process fixed date rules here? 
        // Or if I add a new "relative" rule, should it apply to past users? 
        // Relative to signup: If I add "1 hour after signup" rule today, should users who signed up yesterday get it? Probably not (it's in the past). 
        // But if I add "1 year after signup", maybe.
        // For simplicity, let's limit this "Bulk Schedule" to Fixed Date rules for now.
        if (rule.type !== 'fixed_date') {
            return response.status(200).json({ message: 'Skipping bulk schedule for relative rule' });
        }

        const scheduledTime = new Date(rule.trigger_value);
        if (isNaN(scheduledTime.getTime())) throw new Error('Invalid date in rule');

        // 2. Fetch All Guests
        const { data: guests, error: guestsError } = await supabase
            .from('guests')
            .select('id, name');

        if (guestsError) throw guestsError;

        if (!guests || guests.length === 0) return response.status(200).json({ message: 'No guests found' });

        // 3. Create Queue Items
        const queueItems = guests.map(guest => ({
            guest_id: guest.id,
            rule_id: rule.id,
            content: rule.message_template.replace(/{name}/g, guest.name),
            scheduled_for: scheduledTime.toISOString(),
            status: 'pending'
        }));

        const { error: insertError } = await supabase
            .from('message_queue')
            .insert(queueItems);

        if (insertError) throw insertError;

        return response.status(200).json({ message: `Scheduled ${queueItems.length} messages for rule ${rule.name}` });

    } catch (e: any) {
        console.error('Error scheduling rule:', e);
        return response.status(500).json({ error: e.message });
    }
}
