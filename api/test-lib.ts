import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Inngest } from "inngest";
import { serve } from "inngest/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        console.log("Inngest Lib Imported:", !!Inngest, !!serve);
        const client = new Inngest({ id: "test-lib" });
        res.status(200).json({ status: 'ok', message: 'Lib imported successfully', clientCreated: !!client });
    } catch (error: any) {
        console.error("Lib Error:", error);
        res.status(500).json({ status: 'error', error: error.message, stack: error.stack });
    }
}
