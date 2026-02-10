import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', mode: 'dynamic-wrapper', message: 'Send POST to test Inngest' });
    }

    try {
        console.log("Loading Inngest modules dynamically...");

        // 2. Dynamic Import of dependencies
        const { serve } = await import("inngest/node");

        // 3. Import Project Client and Functions Dynamically
        console.log("Loading project Inngest client and functions...");
        const { inngest } = await import("./_lib/inngest/client");
        const { processQueue } = await import("./_lib/inngest/process-queue");

        // 4. Create and Execute Handler
        const serveHandler = serve({
            client: inngest,
            functions: [processQueue],
        });

        console.log("Executing Inngest handler with processQueue...");
        return await serveHandler(req, res);

    } catch (error: any) {
        console.error("CRITICAL: Failed to load Inngest:", error);
        return res.status(500).json({
            error: "Failed to load Inngest library",
            details: error.message,
            stack: error.stack
        });
    }
}
