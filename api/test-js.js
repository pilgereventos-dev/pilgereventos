import { serve } from 'inngest/node';
import { Inngest } from 'inngest';

export default function handler(req, res) {
    try {
        const client = new Inngest({ id: 'test-js' });
        res.status(200).json({
            status: 'ok',
            type: 'ESM',
            serveExists: !!serve,
            clientCreated: !!client
        });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
}
