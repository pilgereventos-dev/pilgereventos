const { serve } = require('inngest/node');
const { Inngest } = require('inngest');

module.exports = (req, res) => {
    try {
        const client = new Inngest({ id: 'test-cjs' });
        res.status(200).json({
            status: 'ok',
            type: 'CommonJS',
            serveExists: !!serve,
            clientCreated: !!client
        });
    } catch (e) {
        res.status(500).json({ error: e.message, stack: e.stack });
    }
};
