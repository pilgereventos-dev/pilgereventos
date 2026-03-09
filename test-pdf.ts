import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

async function testPdfSend() {
    try {
        // --- Supabase Setup ---
        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase anon credentials in .env');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch a real guest for the test
        const { data: guests, error: guestError } = await supabase
            .from('guests')
            .select('id, name, phone, event_name')
            .order('created_at', { ascending: false })
            .limit(1);

        if (guestError || !guests || guests.length === 0) {
            throw new Error('Guest fetch error or no guests found');
        }

        const guest = guests[0];
        console.log(`Using guest: ${guest.name} (${guest.phone}) - Event: ${guest.event_name}`);

        // --- Fetch ConnectyHub API credentials from app_config ---
        const { data: configRows, error: configError } = await supabase
            .from('app_config')
            .select('key, value')
            .in('key', ['connectyhub_api_url', 'connectyhub_api_key', 'connectyhub_instance']);

        if (configError || !configRows || configRows.length === 0) {
            throw new Error('Failed to fetch API config');
        }

        const config: Record<string, string> = {};
        configRows.forEach((row: any) => { config[row.key] = row.value; });

        const apiUrl = config.connectyhub_api_url;
        const apiKey = config.connectyhub_api_key;
        const instanceName = config.connectyhub_instance;

        // --- Generate personalized PDF ---
        const pdfPath = path.join(process.cwd(), 'docs', 'relatorio-sc.pdf');
        console.log('Attempting to read PDF from:', pdfPath);
        const existingPdfBytes = readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const firstPage = pdfDoc.getPages()[0];
        const { height } = firstPage.getSize();
        firstPage.drawText(`Exclusivo para: ${guest.name}`, { x: 50, y: height - 50, size: 20, color: rgb(0.83, 0.68, 0.21) });

        const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
        writeFileSync('test-output.pdf', Buffer.from(pdfBytes, 'base64'));
        console.log('PDF Generated and saved locally as test-output.pdf for verification.');

        // --- Format phone number ---
        const cleanPhone = guest.phone.replace(/\D/g, '');
        const number = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

        // --- Send via ConnectyHub WhatsApp API ---
        const sendMediaPayload = {
            number: number,
            mediatype: "document",
            mimetype: "application/pdf",
            caption: `Olá ${guest.name}! Conforme solicitado, segue o seu Relatório Estratégico SC exclusivo.\n\nAtenciosamente,\nEquipe Guilherme Pilger`,
            // Evolution API uses base64 string directly for media, usually. Sometimes requires dataUri.
            // Let's test standard base64 without data URI first since the original had it.
            // Oh wait, the original `sendMediaPayload` in Evolution expects just base64 or a URL. 
            // In fact, if data URI is given it sometimes fails to parse it if not fully supported.
            media: pdfBytes,
            fileName: `Relatorio_Estrategico_${guest.name.replace(/\s+/g, '_')}.pdf`,
        };

        console.log('Sending to URL:', `${apiUrl}/message/sendMedia/${instanceName}`);

        const response = await fetch(`${apiUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(sendMediaPayload),
        });

        if (!response.ok) {
            console.error('API responded with:', response.status, response.statusText);
            const errText = await response.text();
            console.error('Error Body:', errText);
            // Let's try alternative payload if it fails
        } else {
            const resJson = await response.json();
            console.log('Success!', resJson);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testPdfSend();
