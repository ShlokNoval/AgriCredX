# Demo Runbook

## Fictional Organizations
- **Supplier**: Demo Basmati Exporter
- **Buyer**: ABC Foods
- **Financiers**: Financier A, Financier B, Financier C

## Scenario: Successful Financing

1. **Setup**: Deploy contracts, configure `.env`, seed Supabase DB.
2. **Supplier Login**: Upload Invoice (INV-2026-09124, 8,50,000 INR), PO, GRN, Quality Cert.
3. **AI Verification**: Trigger verification. Observe it pass and transition state to VERIFIED.
4. **Buyer Login**: View receivable. Connect BridgeKey. Sign acceptance transaction. State becomes BUYER_ACCEPTED.
5. **Attestation**: Backend automatically generates digest and anchors it to MST Blockchain. State becomes ATTESTED, then FINANCEABLE.
6. **Financier Login**: View financeable receivable. Submit bid for 8,20,000 INR.
7. **Supplier**: Selects bid.
8. **Financier**: Executes funding transaction. State becomes OUTSTANDING.
9. **Buyer**: Submits repayment. State becomes CLOSED.

## Scenario: Tamper Attack

1. Supplier uploads a tampered Invoice (altered amount).
2. AI Verification flags the discrepancy against the PO/GRN.
3. Status set to DISPUTED or flagged with HIGH risk.
4. Cannot proceed to ATTESTED or FINANCEABLE.
