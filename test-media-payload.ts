import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const apiKey = '0BFE0A6930723DC0E3CB35A1ADFBFEF9'; // Hardcoding from test-final.ts of previous session or env
const instance = 'Pilger';
const apiUrl = 'https://api.connectyhub.com.br';

const phone = '5547988577996';
const mediaUrl = 'https://pilgereventos.vercel.app/relatorio-sc.pdf'; // Or a small image

async function testPayload(payloadName: string, body: any) {
    console.log(`\n--- Testing Payload: ${payloadName} ---`);
    try {
        const response = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 200)}`);
    } catch (e) {
        console.error(e);
    }
}

async function runTests() {
    // Payload 1: Flat structure (often used by Evolution v2 base)
    await testPayload('Flat Structure', {
        number: phone,
        mediatype: "document",
        mimetype: "application/pdf",
        fileName: "test.pdf",
        caption: "Caption test",
        media: mediaUrl
    });

    // Payload 2: mediaMessage wrapper with text
    await testPayload('mediaMessage Wrapper (text)', {
        number: phone,
        options: { delay: 1200, presence: "composing" },
        mediaMessage: {
            mediatype: "document",
            fileName: "test.pdf",
            caption: "Caption test",
            text: "Text test",
            media: mediaUrl
        }
    });

    // Payload 3: What if sendMedia expects base64 only?
    // Let's assume URL works for now and find which schema format it prefers.
}

runTests();
