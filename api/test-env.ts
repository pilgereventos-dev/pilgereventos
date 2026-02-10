import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
    const envVars = {
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'DEFINED' : 'MISSING',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'DEFINED' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'DEFINED' : 'MISSING',
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'DEFINED' : 'MISSING',
        INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY ? 'DEFINED' : 'MISSING',
        INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY ? 'DEFINED' : 'MISSING',
    };

    return res.status(200).json({
        status: 'ok',
        environment: process.env.NODE_ENV,
        variables: envVars
    });
}
