import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';

function pdfGeneratorPlugin() {
  return {
    name: 'pdf-generator',
    configureServer(server: any) {
      server.middlewares.use('/api/generate-demo-docs', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const txId = data.txId || 'REC-UNKNOWN';
              const buyerName = data.buyerName || 'ABC Foods';
              const supplierName = data.supplierName || 'Demo Supplier';
              const amount = data.amount || '0 MSTC';
              const date = new Date().toISOString().split('T')[0];

              const rootDir = path.resolve(__dirname, '../../');
              const demoDir = path.join(rootDir, 'demo', txId);
              if (!fs.existsSync(demoDir)) {
                fs.mkdirSync(demoDir, { recursive: true });
              }

              async function createPDF(filename: string, lines: string[], r: number, g: number, b: number) {
                  const pdfDoc = await PDFDocument.create();
                  const page = pdfDoc.addPage([600, 450]);
                  let y = 400;
                  for (const line of lines) {
                      page.drawText(line, { x: 50, y, size: 14, color: rgb(r, g, b) });
                      y -= 25;
                  }
                  const pdfBytes = await pdfDoc.save();
                  fs.writeFileSync(path.join(demoDir, filename), pdfBytes);
              }

              // 1. PO from Buyer
              await createPDF('1-Purchase-Order-Buyer.pdf', [
                  'PURCHASE ORDER (PO)',
                  '=============================================',
                  `PO Number: PO-${txId}`,
                  `Date: ${date}`,
                  `From (Buyer): ${buyerName}`,
                  `To (Supplier): ${supplierName}`,
                  '',
                  `Total Cost: ${amount} MSTC`,
                  `Payment Terms: 60 Days Net`,
                  '',
                  'Authorized Signature: ___________________'
              ], 0, 0.2, 0.5);

              // 2. Invoice from Supplier
              await createPDF('2-Commercial-Invoice-Supplier.pdf', [
                  'COMMERCIAL INVOICE',
                  '=============================================',
                  `Invoice Ref: INV-${txId}`,
                  `Date: ${date}`,
                  `Supplier: ${supplierName}`,
                  `Billed To: ${buyerName}`,
                  '',
                  `Total Amount Due: ${amount} MSTC`,
                  `Due Date: 60 Days from ${date}`,
                  `Transaction Ref: ${txId}`,
                  '',
                  'Thank you for your business!'
              ], 0, 0, 0);

              // 3. QA Cert from Supplier
              await createPDF('3-Quality-Lab-Certificate.pdf', [
                  'QUALITY ASSURANCE & LAB CERTIFICATE',
                  '=============================================',
                  `Certificate Ref: QA-${txId}`,
                  `Date of Inspection: ${date}`,
                  `Inspected For: ${supplierName}`,
                  '',
                  'INSPECTION RESULTS:',
                  '- Moisture Content: 12% (Pass)',
                  '- Broken Grains: < 2% (Pass)',
                  '- Purity: 99.9% (Pass)',
                  '',
                  'OVERALL STATUS: EXCELLENT / EXPORT GRADE',
                  'Certified by: AgriCredX Automated QA Node'
              ], 0, 0.4, 0);

              // 4. GRN from Supplier
              await createPDF('4-Goods-Receipt-Note-Supplier.pdf', [
                  'GOODS RECEIPT NOTE (GRN)',
                  '=============================================',
                  `GRN ID: GRN-${txId}`,
                  `Date Received: ${date}`,
                  `Received By Logistics Agent for: ${supplierName}`,
                  `Originating PO: PO-${txId}`,
                  '',
                  `Condition: Intact, sealed, ready for transit.`,
                  '',
                  'Warehouse Manager Signature: _______________'
              ], 0.4, 0.2, 0);

              // 5. Fake Invoice
              await createPDF('TAMPERED-FAKE-Invoice.pdf', [
                  'COMMERCIAL INVOICE',
                  '=============================================',
                  `Invoice Ref: INV-${txId}`,
                  `Date: ${date}`,
                  `Supplier: ${supplierName}`,
                  `Billed To: ${buyerName}`,
                  '',
                  `Total Amount Due: 9,999,999 MSTC  <-- ALTERED AMOUNT!`,
                  `Due Date: 60 Days from ${date}`,
                  `Transaction Ref: ${txId}`,
                  '',
                  'Malicious Hacker signature: HACKED!'
              ], 0.8, 0, 0);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, folder: `demo/${txId}` }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [react(), pdfGeneratorPlugin()],
  server: {
    allowedHosts: ["hosea-requisitionary-unawares.ngrok-free.dev"],
    proxy: {
      '/rpc': {
        target: 'http://127.0.0.1:8545',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, '')
      }
    }
  }
});
