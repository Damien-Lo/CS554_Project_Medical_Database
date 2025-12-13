-- ============================================================================
-- Query: Best Payer Coverage
-- Description: Ranks payers by their average coverage ratio
-- ============================================================================

SELECT 
    payer_name,
    payer_type,
    total_claims,
    fully_covered_pct,
    partially_covered_pct,
    rejected_pct,
    avg_coverage_ratio,
    total_paid,
    total_outstanding
FROM view_coverage_by_payer
ORDER BY avg_coverage_ratio DESC;

