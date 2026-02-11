import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Dynamic import to match the successful pattern in api/inngest.ts
        const { inngest } = await import("../src/inngest/client");

        console.log("Sending test event app/process.queue...");

        const { ids } = await inngest.send({
            name: "app/process.queue",
            data: {
                manual_trigger: true,
                timestamp: Date.now()
            }
        });

        return res.status(200).json({
            status: 'ok',
            message: 'Event sent successfully',
            eventIds: ids,
            dashboard_url: "https://app.inngest.com/env/production/events"
        });

    } catch (error: any) {
        console.error("Trigger Error:", error);
        return res.status(500).json({
            error: "Failed to trigger event",
            details: error.message,
            stack: error.stack
        });
    }
}
