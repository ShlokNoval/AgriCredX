// ============================================================
// AgriCredX — Shared Entity Types
// ============================================================

import { ReceivableStatus } from './lifecycle';

// --- Roles ---

export enum UserRole {
  SUPPLIER = 'supplier',
  BUYER = 'buyer',
  FINANCIER = 'financier',
  ADMIN = 'admin',
}

// --- Document Types ---

export enum DocumentType {
  INVOICE = 'invoice',
  PURCHASE_ORDER = 'purchase_order',
  GRN = 'grn',
  QUALITY_CERTIFICATE = 'quality_certificate',
  LAB_REPORT = 'lab_report',
}

// --- Organization ---

export interface Organization {
  id: string;
  name: string;
  type: 'supplier' | 'buyer' | 'financier';
  contactMetadata?: Record<string, unknown>;
  createdAt: string;
}

// --- User Profile ---

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
  organizationId: string;
  walletAddress?: string;
  createdAt: string;
}

// --- Receivable ---

export interface Receivable {
  id: string;
  invoiceId: string;
  supplierId: string;
  buyerId: string;
  amount: number;
  currency: string;
  dueDate: string;
  commodity: string;
  status: ReceivableStatus;
  attestationDigest?: string;
  onChainId?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Document ---

export interface DocumentMeta {
  id: string;
  receivableId: string;
  type: DocumentType;
  filename: string;
  mimeType: string;
  sha256: string;
  objectKey: string;
  version: number;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

// --- Attestation ---

export interface Attestation {
  id: string;
  receivableId: string;
  digest: string;
  signerWallet: string;
  txHash?: string;
  blockReference?: string;
  timestamp: string;
  schemaVersion: string;
}

/**
 * Canonical attestation payload — deterministic serialization.
 * The same logical payload MUST produce the same SHA-256 digest
 * in both JavaScript and Python.
 */
export interface AttestationPayload {
  schemaVersion: string;
  invoiceId: string;
  supplierWallet: string;
  buyerWallet: string;
  invoiceAmount: number;
  currency: string;
  dueDate: string;
  poHash: string;
  invoiceHash: string;
  grnHash: string;
  qualityEvidenceHash: string;
  poMatched: boolean;
  grnMatched: boolean;
  buyerAccepted: boolean;
  duplicateCheckPassed: boolean;
  verificationEngineVersion: string;
  createdAt: string;
}

// --- Financing ---

export enum FinancingRequestStatus {
  OPEN = 'OPEN',
  SELECTED = 'SELECTED',
  FUNDED = 'FUNDED',
  CLOSED = 'CLOSED',
}

export enum FinancingBidStatus {
  OPEN = 'OPEN',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
}

export interface FinancingRequest {
  id: string;
  receivableId: string;
  requestedAmount: number;
  desiredTerm?: number;
  status: FinancingRequestStatus;
  createdAt: string;
}

export interface FinancingBid {
  id: string;
  requestId: string;
  financierId: string;
  amount: number;
  feeOrDiscount?: number;
  maturity?: string;
  status: FinancingBidStatus;
  txHash?: string;
  createdAt: string;
}

export interface Financing {
  id: string;
  receivableId: string;
  financierId: string;
  fundedAmount: number;
  fundedAt?: string;
  status: string;
  txHash?: string;
}

// --- Repayment ---

export interface Repayment {
  id: string;
  receivableId: string;
  amount: number;
  paidAt: string;
  txHash?: string;
  status: string;
}

// --- Audit Log ---

export enum AuditAction {
  RECEIVABLE_CREATED = 'RECEIVABLE_CREATED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  VERIFICATION_COMPLETED = 'VERIFICATION_COMPLETED',
  BUYER_ACCEPTED = 'BUYER_ACCEPTED',
  BUYER_DISPUTED = 'BUYER_DISPUTED',
  ATTESTATION_ANCHORED = 'ATTESTATION_ANCHORED',
  FINANCING_OPENED = 'FINANCING_OPENED',
  BID_SUBMITTED = 'BID_SUBMITTED',
  BID_SELECTED = 'BID_SELECTED',
  FUNDING_COMPLETED = 'FUNDING_COMPLETED',
  REPAYMENT_RECORDED = 'REPAYMENT_RECORDED',
  RECEIVABLE_CLOSED = 'RECEIVABLE_CLOSED',
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadataJson?: Record<string, unknown>;
  createdAt: string;
}
