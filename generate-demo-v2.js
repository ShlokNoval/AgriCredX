const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createPDF(filename, lines, color) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 450]);
    
    let y = 400;
    for (const line of lines) {
        page.drawText(line, {
            x: 50,
            y: y,
            size: 14,
            color: color || rgb(0, 0, 0)
        });
        y -= 25;
    }

    const pdfBytes = await pdfDoc.save();
    const dir = path.join(__dirname, 'demo_v2');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.join(dir, filename), pdfBytes);
    console.log(`Successfully generated real PDF: demo_v2/${filename}`);
}

async function main() {
    const BUYER = 'ABC Foods';
    const SUPPLIER = 'Demo Basmati Exporter';
    const AMOUNT = '850,000 MSTC';
    const COMMODITY = 'Premium Basmati Rice (100 Tons)';
    const DURATION = '60 Days Net';
    const DATE = '2026-09-29';
    const TX_ID = 'REC-2026-0001';

    // 1. BUYER generates Purchase Order
    await createPDF('1-Purchase-Order-Buyer.pdf', [
        'PURCHASE ORDER (PO)',
        '=============================================',
        `PO Number: PO-ABC-2026-088`,
        `Date: ${DATE}`,
        `From (Buyer): ${BUYER}`,
        `To (Supplier): ${SUPPLIER}`,
        '',
        `Commodity: ${COMMODITY}`,
        `Total Cost: ${AMOUNT}`,
        `Payment Terms: ${DURATION}`,
        '',
        'Authorized Signature: ___________________',
        'ABC Foods Procurement Division'
    ], rgb(0, 0.2, 0.5));

    // 2. SUPPLIER generates Invoice
    await createPDF('2-Commercial-Invoice-Supplier.pdf', [
        'COMMERCIAL INVOICE',
        '=============================================',
        `Invoice ID: INV-2026-09124`,
        `Date: ${DATE}`,
        `Supplier: ${SUPPLIER}`,
        `Billed To: ${BUYER}`,
        '',
        `Commodity Delivered: ${COMMODITY}`,
        `Total Amount Due: ${AMOUNT}`,
        `Due Date: 60 Days from ${DATE}`,
        `Transaction Ref: ${TX_ID}`,
        '',
        'Thank you for your business!'
    ], rgb(0, 0, 0));

    // 3. SUPPLIER generates Quality Certificate (Lab Cert)
    await createPDF('3-Quality-Lab-Certificate.pdf', [
        'QUALITY ASSURANCE & LAB CERTIFICATE',
        '=============================================',
        `Certificate ID: QA-2026-001`,
        `Date of Inspection: ${DATE}`,
        `Inspected For: ${SUPPLIER}`,
        `Commodity: ${COMMODITY}`,
        '',
        'INSPECTION RESULTS:',
        '- Moisture Content: 12% (Pass)',
        '- Broken Grains: < 2% (Pass)',
        '- Purity: 99.9% (Pass)',
        '',
        'OVERALL STATUS: EXCELLENT / EXPORT GRADE',
        'Certified by: AgriCredX Automated QA Node'
    ], rgb(0, 0.4, 0));

    // 4. SUPPLIER generates GRN (Goods Receipt Note)
    await createPDF('4-Goods-Receipt-Note-Supplier.pdf', [
        'GOODS RECEIPT NOTE (GRN)',
        '=============================================',
        `GRN ID: GRN-2026-099`,
        `Date Received: ${DATE}`,
        `Received By Logistics Agent for: ${SUPPLIER}`,
        `Originating PO: PO-ABC-2026-088`,
        '',
        `Items Received: ${COMMODITY}`,
        `Condition: Intact, sealed, ready for transit.`,
        '',
        'Warehouse Manager Signature: _______________'
    ], rgb(0.4, 0.2, 0));

    // 5. TAMPERED FAKE INVOICE (For Judge Demo)
    await createPDF('TAMPERED-FAKE-Invoice.pdf', [
        'COMMERCIAL INVOICE',
        '=============================================',
        `Invoice ID: INV-2026-09124`,
        `Date: ${DATE}`,
        `Supplier: ${SUPPLIER}`,
        `Billed To: ${BUYER}`,
        '',
        `Commodity Delivered: ${COMMODITY}`,
        `Total Amount Due: 9,999,999 MSTC  <-- ALTERED AMOUNT!`,
        `Due Date: 60 Days from ${DATE}`,
        `Transaction Ref: ${TX_ID}`,
        '',
        'Malicious Hacker signature: HACKED!'
    ], rgb(0.8, 0, 0));
}

main().catch(console.error);
