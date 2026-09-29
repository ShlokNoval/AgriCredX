import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
              const commodity = data.commodity || 'Premium Agri Product';

              const rootDir = path.resolve(__dirname, '../../');
              const demoDir = path.join(rootDir, 'demo', txId);
              if (!fs.existsSync(demoDir)) {
                fs.mkdirSync(demoDir, { recursive: true });
              }

              async function createBeautifulPDF(filename: string, title: string, details: Record<string, string>, themeColor: [number, number, number]) {
                  const pdfDoc = await PDFDocument.create();
                  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
                  const page = pdfDoc.addPage([600, 700]);
                  
                  // Header Background
                  page.drawRectangle({
                      x: 0, y: 580, width: 600, height: 120,
                      color: rgb(themeColor[0], themeColor[1], themeColor[2])
                  });

                  // Title
                  page.drawText(title, {
                      x: 50, y: 640, size: 24, font: fontBold, color: rgb(1, 1, 1)
                  });
                  page.drawText("AgriCredX Secure Attestation Protocol", {
                      x: 50, y: 615, size: 10, font: fontRegular, color: rgb(0.9, 0.9, 0.9)
                  });

                  // Content Grid
                  let y = 520;
                  page.drawText("DOCUMENT DETAILS", { x: 50, y, size: 12, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
                  page.drawLine({ start: { x: 50, y: y - 10 }, end: { x: 550, y: y - 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
                  y -= 40;

                  for (const [key, value] of Object.entries(details)) {
                      page.drawText(key, { x: 50, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
                      page.drawText(value, { x: 220, y, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
                      y -= 35;
                      page.drawLine({ start: { x: 50, y: y + 15 }, end: { x: 550, y: y + 15 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
                  }
                  
                  // Footer Security Seal
                  page.drawText("SECURED BY AGRICREDX", { x: 230, y: 50, size: 10, font: fontBold, color: rgb(0.7, 0.7, 0.7) });
                  page.drawText("Generated on-the-fly for Demo purposes.", { x: 210, y: 35, size: 9, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

                  const pdfBytes = await pdfDoc.save();
                  fs.writeFileSync(path.join(demoDir, filename), pdfBytes);
              }

              // 1. PO from Buyer
              await createBeautifulPDF('1-Purchase-Order-Buyer.pdf', 'PURCHASE ORDER (PO)', {
                  'PO Number': `PO-${txId}`,
                  'Date of Order': date,
                  'From (Buyer)': buyerName,
                  'To (Supplier)': supplierName,
                  'Commodity Details': commodity,
                  'Total Contract Value': `${amount} MSTC`,
                  'Payment Terms': '60 Days Net (Escrow Locked)',
                  'Status': 'Approved by Buyer'
              }, [0.1, 0.4, 0.7]); // Blue

              // 2. Invoice from Supplier
              await createBeautifulPDF('2-Commercial-Invoice-Supplier.pdf', 'COMMERCIAL INVOICE', {
                  'Invoice Ref': `INV-${txId}`,
                  'Date of Issue': date,
                  'Supplier (Biller)': supplierName,
                  'Buyer (Billed To)': buyerName,
                  'Commodity Details': commodity,
                  'Total Amount Due': `${amount} MSTC`,
                  'Due Date': `60 Days from ${date}`,
                  'Blockchain Ref ID': txId
              }, [0.2, 0.2, 0.2]); // Dark Grey

              // 3. QA Cert from Supplier
              await createBeautifulPDF('3-Quality-Lab-Certificate.pdf', 'QUALITY ASSURANCE CERT.', {
                  'Certificate Ref': `QA-${txId}`,
                  'Date of Inspection': date,
                  'Inspected For': supplierName,
                  'Commodity': commodity,
                  'Moisture Content': '11.8% (Pass - Export Grade)',
                  'Broken Grains': '< 1.5% (Pass)',
                  'Purity': '99.9% (Pass)',
                  'Overall Status': 'APPROVED FOR SHIPMENT'
              }, [0.2, 0.6, 0.3]); // Green

              // 4. GRN from Supplier
              await createBeautifulPDF('4-Goods-Receipt-Note-Supplier.pdf', 'GOODS RECEIPT NOTE', {
                  'GRN ID': `GRN-${txId}`,
                  'Date Received': date,
                  'Received By': `Logistics Agent for ${supplierName}`,
                  'Originating PO': `PO-${txId}`,
                  'Commodity Received': commodity,
                  'Condition on Arrival': 'Intact, Sealed, Ready for Transit',
                  'Warehouse Bay': 'A-12',
                  'Action': 'Dispatched'
              }, [0.8, 0.4, 0.1]); // Orange

              // 5. Fake Invoice
              await createBeautifulPDF('TAMPERED-FAKE-Invoice.pdf', 'COMMERCIAL INVOICE (HACKED)', {
                  'Invoice Ref': `INV-${txId}`,
                  'Date of Issue': date,
                  'Supplier (Biller)': supplierName,
                  'Buyer (Billed To)': buyerName,
                  'Commodity Details': commodity,
                  'Total Amount Due': `99,999,999 MSTC   <-- TAMPERED!`,
                  'Due Date': `60 Days from ${date}`,
                  'Blockchain Ref ID': txId
              }, [0.8, 0.1, 0.2]); // Red

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

      server.middlewares.use('/api/set-profile', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { email, companyName } = JSON.parse(body);
              const rootDir = path.resolve(__dirname, '../../');
              const demoDir = path.join(rootDir, 'demo');
              if (!fs.existsSync(demoDir)) fs.mkdirSync(demoDir, { recursive: true });
              
              const profilesFile = path.join(demoDir, 'company_profiles.json');
              let profiles: any = {};
              if (fs.existsSync(profilesFile)) {
                profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
              }
              profiles[email.toLowerCase()] = companyName;
              fs.writeFileSync(profilesFile, JSON.stringify(profiles));
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });

      server.middlewares.use('/api/get-profile', (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          try {
            const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
            const email = urlParams.get('email');
            const profilesFile = path.resolve(__dirname, '../../demo/company_profiles.json');
            let profiles: any = {};
            if (fs.existsSync(profilesFile)) {
              profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
            }
            res.setHeader('Content-Type', 'application/json');
            if (email) {
              res.end(JSON.stringify({ companyName: profiles[email.toLowerCase()] || null }));
            } else {
              res.end(JSON.stringify(profiles));
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });

      server.middlewares.use('/api/admin-users', (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          try {
            const profilesFile = path.resolve(__dirname, '../../demo/company_profiles.json');
            let profiles: any = {};
            if (fs.existsSync(profilesFile)) {
              profiles = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
            }
            
            const users = Object.keys(profiles).map((email, index) => {
               const name = profiles[email];
               let role = 'supplier';
               if (name.toLowerCase().includes('buyer') || email.toLowerCase().includes('buyer')) role = 'buyer';
               if (email.toLowerCase().includes('admin')) role = 'admin';
               
               return {
                  id: email, // Use email as ID for flagging locally
                  email: email,
                  role: role,
                  organizations: { name: name }
               };
            });
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(users));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });

      server.middlewares.use('/api/upload-proof', async (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { id, phase, photoDataUrl } = JSON.parse(body);
              const rootDir = path.resolve(__dirname, '../../');
              const demoDir = path.join(rootDir, 'demo');
              if (!fs.existsSync(demoDir)) fs.mkdirSync(demoDir, { recursive: true });
              
              const proofsFile = path.join(demoDir, 'proofs.json');
              let proofs: any = {};
              if (fs.existsSync(proofsFile)) {
                proofs = JSON.parse(fs.readFileSync(proofsFile, 'utf8'));
              }
              if (!proofs[id]) proofs[id] = {};
              proofs[id][phase] = photoDataUrl;
              fs.writeFileSync(proofsFile, JSON.stringify(proofs));
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });

      server.middlewares.use('/api/get-proofs', (req: any, res: any, next: any) => {
        if (req.method === 'GET') {
          try {
            // Note: req.url for middleware strips the path, so it will just be `?id=X`
            const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
            const id = urlParams.get('id');
            const proofsFile = path.resolve(__dirname, '../../demo/proofs.json');
            let proofs: any = {};
            if (fs.existsSync(proofsFile)) {
              proofs = JSON.parse(fs.readFileSync(proofsFile, 'utf8'));
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(id ? (proofs[id] || {}) : proofs));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
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
