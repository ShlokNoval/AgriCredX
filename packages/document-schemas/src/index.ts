// ============================================================
// AgriCredX — Document Extraction Schemas
// ============================================================
// These types define the structured fields extracted from
// each document type by the AI service.
// ============================================================

/**
 * Fields extracted from an Invoice PDF.
 */
export interface InvoiceExtraction {
  invoiceNumber: string;
  invoiceDate?: string;
  supplierName?: string;
  buyerName?: string;
  invoiceAmount?: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  commodity?: string;
  paymentTermDays?: number;
  dueDate?: string;
  confidence: number;
}

/**
 * Fields extracted from a Purchase Order PDF.
 */
export interface PurchaseOrderExtraction {
  poNumber: string;
  poDate?: string;
  buyerName?: string;
  supplierName?: string;
  poAmount?: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  commodity?: string;
  deliveryDate?: string;
  confidence: number;
}

/**
 * Fields extracted from a GRN / Delivery Proof PDF.
 */
export interface GRNExtraction {
  grnNumber?: string;
  grnDate?: string;
  receivedQuantity?: number;
  unit?: string;
  commodity?: string;
  supplierName?: string;
  buyerName?: string;
  deliveryLocation?: string;
  condition?: string;
  confidence: number;
}

/**
 * Fields extracted from a Quality Certificate PDF.
 */
export interface QualityCertificateExtraction {
  certificateNumber?: string;
  issueDate?: string;
  issuingAuthority?: string;
  commodity?: string;
  grade?: string;
  parameters?: Record<string, string>;
  result?: string;
  confidence: number;
}

/**
 * Fields extracted from a Lab Report PDF.
 */
export interface LabReportExtraction {
  reportNumber?: string;
  reportDate?: string;
  laboratory?: string;
  commodity?: string;
  testResults?: Record<string, string>;
  overallResult?: string;
  confidence: number;
}

/**
 * Union type for all document extractions.
 */
export type DocumentExtraction =
  | { type: 'invoice'; data: InvoiceExtraction }
  | { type: 'purchase_order'; data: PurchaseOrderExtraction }
  | { type: 'grn'; data: GRNExtraction }
  | { type: 'quality_certificate'; data: QualityCertificateExtraction }
  | { type: 'lab_report'; data: LabReportExtraction };
