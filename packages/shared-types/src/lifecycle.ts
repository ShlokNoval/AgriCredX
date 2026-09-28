// ============================================================
// AgriCredX — Canonical Lifecycle
// ============================================================
// FROZEN: This is the ONLY lifecycle ordering.
// Do NOT create alternative orderings anywhere in the codebase.
// ============================================================

/**
 * Canonical receivable lifecycle states.
 *
 * CREATED → VERIFIED → BUYER_ACCEPTED → ATTESTED → FINANCEABLE
 * → FUNDED → OUTSTANDING → REPAID → CLOSED
 *
 * Dispute/reject paths block financeability.
 */
export enum ReceivableStatus {
  CREATED = 'CREATED',
  VERIFIED = 'VERIFIED',
  BUYER_ACCEPTED = 'BUYER_ACCEPTED',
  ATTESTED = 'ATTESTED',
  FINANCEABLE = 'FINANCEABLE',
  FUNDED = 'FUNDED',
  OUTSTANDING = 'OUTSTANDING',
  REPAID = 'REPAID',
  CLOSED = 'CLOSED',
  DISPUTED = 'DISPUTED',
}

/**
 * Ordered lifecycle states for UI rail display.
 * DISPUTED is excluded — it is a branching state, not a step.
 */
export const LIFECYCLE_ORDER: ReceivableStatus[] = [
  ReceivableStatus.CREATED,
  ReceivableStatus.VERIFIED,
  ReceivableStatus.BUYER_ACCEPTED,
  ReceivableStatus.ATTESTED,
  ReceivableStatus.FINANCEABLE,
  ReceivableStatus.FUNDED,
  ReceivableStatus.OUTSTANDING,
  ReceivableStatus.REPAID,
  ReceivableStatus.CLOSED,
];

/**
 * Valid state transitions.
 * Key = current state, Value = set of valid next states.
 */
export const VALID_TRANSITIONS: Record<ReceivableStatus, ReceivableStatus[]> = {
  [ReceivableStatus.CREATED]: [ReceivableStatus.VERIFIED],
  [ReceivableStatus.VERIFIED]: [ReceivableStatus.BUYER_ACCEPTED, ReceivableStatus.DISPUTED],
  [ReceivableStatus.BUYER_ACCEPTED]: [ReceivableStatus.ATTESTED, ReceivableStatus.DISPUTED],
  [ReceivableStatus.ATTESTED]: [ReceivableStatus.FINANCEABLE],
  [ReceivableStatus.FINANCEABLE]: [ReceivableStatus.FUNDED],
  [ReceivableStatus.FUNDED]: [ReceivableStatus.OUTSTANDING],
  [ReceivableStatus.OUTSTANDING]: [ReceivableStatus.REPAID],
  [ReceivableStatus.REPAID]: [ReceivableStatus.CLOSED],
  [ReceivableStatus.CLOSED]: [],
  [ReceivableStatus.DISPUTED]: [ReceivableStatus.VERIFIED], // Resolution returns to VERIFIED
};
