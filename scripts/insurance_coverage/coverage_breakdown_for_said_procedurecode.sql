-- ============================================================================
-- Query: Coverage Breakdown for a Specific Procedure
-- Description: Detailed coverage stats for one procedure code
-- Usage: Replace '430193006' with your procedure code of interest
-- ============================================================================

-- Example procedure code: 430193006 (Medication reconciliation)
SELECT 
    PROCEDURECODE,
    total_claims,
    fully_covered_count,
    partially_covered_count,
    rejected_count,
    fully_covered_pct || '%' AS fully_covered,
    partially_covered_pct || '%' AS partially_covered,
    rejected_pct || '%' AS rejected,
    '$' || total_billed::TEXT AS total_billed,
    '$' || total_paid::TEXT AS total_paid,
    '$' || total_outstanding::TEXT AS total_outstanding,
    avg_coverage_ratio
FROM view_coverage_by_procedure
WHERE PROCEDURECODE = '430193006';
