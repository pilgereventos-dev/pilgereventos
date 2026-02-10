import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', mode: 'dynamic-wrapper', message: 'Send POST to test Inngest' });
    }

    try {
        console.log("Loading Inngest modules dynamically...");

        // 2. Dynamic Import to catch module resolution errors
        const { serve } = await import("inngest/node");
        const { Inngest } = await import("inngest");

        // 3. Initialize Client
        console.log("Initializing Inngest client...");
        const inngest = new Inngest({ id: "pilger-eventos" });

        // 4. Define Hello World Function
        const helloWorld = inngest.createFunction(
            { id: "hello-world-dynamic" },
            { event: "test/hello.world" },
            async ({ event, step }) => {
                return { message: "Hello from Dynamic Inngest!" };
            }
        );

        // 5. Create and Execute Handler
        const serveHandler = serve({
            client: inngest,
            functions: [helloWorld],
        });

        console.log("Executing Inngest handler...");
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
