const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createPDF(filename, lines, color) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    let y = 350;
    for (const line of lines) {
        page.drawText(line, {
            x: 50,
            y: y,
            size: 16,
            color: color || rgb(0, 0, 0)
        });
        y -= 30;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.join(__dirname, 'demo', filename), pdfBytes);
    console.log(`Successfully generated real PDF: ${filename}`);
}

async function main() {
    await createPDF('QA-2026-001.pdf', [
        'QUALITY ASSURANCE CERTIFICATE',
        '-----------------------------------',
        'Certificate ID: QA-2026-001',
        'Date: 2026-09-29',
        'Status: PASSED',
        'Items Inspected: 100% compliant with PO-ABC-2026-088.',
        'Inspector: AgriCredX QA Node'
    ], rgb(0, 0.5, 0));

    await createPDF('INV-2026-09124.pdf', [
        'COMMERCIAL INVOICE',
        '-----------------------------------',
        'Invoice ID: INV-2026-09124',
        'Supplier: Demo Basmati Exporter',
        'Buyer: ABC Foods',
        'Amount Due: 850,000 INR',
        'Commodity: Premium Basmati Rice'
    ], rgb(0, 0, 0.5));

    await createPDF('PO-ABC-2026-088.pdf', [
        'PURCHASE ORDER',
        '-----------------------------------',
        'PO Number: PO-ABC-2026-088',
        'From: ABC Foods',
        'To: Demo Basmati Exporter',
        'Terms: 60 Days Net',
        'Authorized By: Procurement Desk'
    ], rgb(0.5, 0, 0));
}

main().catch(console.error);
