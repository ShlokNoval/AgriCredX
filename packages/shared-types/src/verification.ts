// ============================================================
// AgriCredX — Verification Types
// ============================================================

export enum VerificationCheckCode {
  AMOUNT_MATCH = 'AMOUNT_MATCH',
  BUYER_MATCH = 'BUYER_MATCH',
  QTY_MATCH = 'QTY_MATCH',
  DATE_CONSISTENCY = 'DATE_CONSISTENCY',
  DUPLICATE_ID = 'DUPLICATE_ID',
  DOCUMENT_HASH = 'DOCUMENT_HASH',
}

export enum VerificationStatus {
  PASS = 'PASS',
  WARN = 'WARN',
  FAIL = 'FAIL',
}

export enum RiskBand {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface VerificationCheck {
  code: VerificationCheckCode | string;
  status: VerificationStatus;
  extractedValue?: string;
  expectedValue?: string;
  explanation: string;
}

export interface VerificationResult {
  id: string;
  receivableId: string;
  checkCode: string;
  status: VerificationStatus;
  extractedValue?: string;
  expectedValue?: string;
  explanation: string;
  engineVersion: string;
  createdAt: string;
}

export interface VerificationReport {
  riskScore: number;
  riskBand: RiskBand;
  checks: VerificationCheck[];
  extractedFields: Record<string, unknown>;
  engineVersion: string;
}

// --- AI Service Request/Response Contract ---

export interface VerificationRequest {
  receivableId: string;
  documents: Array<{
    type: 'invoice' | 'purchase_order' | 'grn' | 'quality_certificate' | 'lab_report';
    url: string;
    sha256: string;
  }>;
}

export interface VerificationResponse {
  riskScore: number;
  riskBand: RiskBand;
  checks: VerificationCheck[];
  extractedFields: Record<string, unknown>;
  engineVersion: string;
}
