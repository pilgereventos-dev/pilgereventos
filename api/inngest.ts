import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
    res.status(200).json({
        message: "Inngest Endpoint is Up (imports removed)",
        env: process.env.NODE_ENV
    });
}
