import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

async function run() {
    try {
        const existingPdfBytes = readFileSync(path.join(process.cwd(), 'docs', 'relatorio-sc.pdf'));
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // Embed the Helvetica font for reliable text rendering
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        console.log('PDF Page 1 Size:', { width, height });

        // Let's stamp in the middle of the cover to make it obvious
        firstPage.drawText('EXCLUSIVO PARA: TESTE DEV', {
            x: width / 2 - 150, // rough center
            y: height / 2,
            size: 24,
            font: helveticaFont,
            color: rgb(1, 0, 0), // RED for testing visibility
        });

        // Original stamp position
        firstPage.drawText('Original Stamp Position (x:50, y:height-50)', {
            x: 50,
            y: height - 50,
            size: 14,
            font: helveticaFont,
            color: rgb(0, 0, 0), // BLACK
        });

        const pdfBytes = await pdfDoc.save();
        writeFileSync('stamped-test.pdf', pdfBytes);
        console.log('Saved stamped-test.pdf');
    } catch (e) {
        console.error(e);
    }
}

run();
