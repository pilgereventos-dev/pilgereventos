import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
    const envVars = {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        INNGEST_EVENT_KEY: !!process.env.INNGEST_EVENT_KEY,
        INNGEST_SIGNING_KEY: !!process.env.INNGEST_SIGNING_KEY,
        NODE_ENV: process.env.NODE_ENV,
    };

    res.status(200).json({ status: 'ok', env: envVars });
}
