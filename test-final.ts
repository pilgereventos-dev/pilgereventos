import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

async function testPdfSend() {
    try {
        const apiUrl = "https://api.connectyhub.com.br";
        const apiKey = "74AWQ8ZOUMSY-TZCF-CX62-EUNM54Q7DAZW";
        const instanceName = "819fa4ace69765cf35db6b842ace976f";

        const guest = { name: "Teste Dev", phone: "5547988577996" };

        const pdfPath = path.join(process.cwd(), 'docs', 'relatorio-sc.pdf');
        console.log('Reading PDF from:', pdfPath);
        const existingPdfBytes = readFileSync(pdfPath);

        // Convert the buffer straight to base64 (without modifying it via pdf-lib) to test pure upload
        const pdfBytes = existingPdfBytes.toString('base64');

        const number = guest.phone;

        // Try standard payload:
        const sendMediaPayload = {
            number: number,
            mediatype: "document",
            mimetype: "application/pdf",
            caption: `Olá ${guest.name}! Conforme solicitado, segue o seu Relatório Estratégico SC exclusivo.\n\nAtenciosamente,\nEquipe Guilherme Pilger`,
            // Based on typical Evolution API, we need data Uri, OR try just base64. 
            // I'll test basic base64 first.
            media: pdfBytes,
            fileName: `Relatorio_Estrategico_Teste.pdf`,
        };

        const targetUrl = `${apiUrl}/message/sendMedia/${instanceName}`;
        console.log('Sending to URL:', targetUrl);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(sendMediaPayload),
        });

        if (!response.ok) {
            console.error('API responded with:', response.status, response.statusText);
            const errText = await response.text();
            console.error('Error Body:', errText);

            // Optionally try DataURI format if raw base64 fails:
            console.log("Retrying with DataURI...");
            sendMediaPayload.media = `data:application/pdf;base64,${pdfBytes}`;
            const res2 = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify(sendMediaPayload),
            });
            if (!res2.ok) {
                console.error('DataURI API responded with:', res2.status, res2.statusText);
                console.error('DataURI Error:', await res2.text());
            } else {
                console.log('Success with DataURI!', await res2.json());
            }
        } else {
            const resJson = await response.json();
            console.log('Success with raw base64!', resJson);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testPdfSend();
