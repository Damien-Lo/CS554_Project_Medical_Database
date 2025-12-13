-- ============================================================================
-- Query: Procedures with Worst Rejection Rates
-- Description: Shows procedures that get rejected most often
-- ============================================================================

SELECT 
    PROCEDURECODE,
    total_claims,
    rejected_count,
    rejected_pct,
    fully_covered_pct,
    avg_coverage_ratio,
    total_billed,
    total_paid
FROM view_coverage_by_procedure
WHERE total_claims >= 5  -- Only show procedures with enough data
ORDER BY rejected_pct DESC
LIMIT 20;
