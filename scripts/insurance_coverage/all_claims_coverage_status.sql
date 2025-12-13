-- ============================================================================
-- Query: All Claims with Coverage Status
-- Description: Shows first 20 claims classified by coverage status
-- ============================================================================

SELECT 
    claim_id,
    PROCEDURECODE,
    billed_amount,
    paid_amount,
    outstanding_amount,
    coverage_ratio,
    coverage_status
FROM view_claim_coverage_status
ORDER BY claim_date DESC
LIMIT 20;
