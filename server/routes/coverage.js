import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ============================================================================
// GET /api/coverage/claims - Recent Claims Overview
// Description: Shows recent claims classified by coverage status
// ============================================================================
router.get('/claims', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    
    const query = `
      SELECT 
        claim_id,
        PROCEDURECODE as procedure_code,
        billed_amount,
        paid_amount,
        outstanding_amount,
        coverage_ratio,
        patient_burden_ratio,
        coverage_status,
        claim_date
      FROM view_claim_coverage_status
      ORDER BY claim_date DESC
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    
    // Calculate summary stats
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_claims,
        SUM(CASE WHEN coverage_status = 'FULLY_COVERED' THEN 1 ELSE 0 END) as fully_covered,
        SUM(CASE WHEN coverage_status = 'PARTIALLY_COVERED' THEN 1 ELSE 0 END) as partially_covered,
        SUM(CASE WHEN coverage_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
        ROUND(AVG(coverage_ratio)::numeric, 4) as avg_coverage_ratio,
        SUM(billed_amount) as total_billed,
        SUM(paid_amount) as total_paid,
        SUM(outstanding_amount) as total_outstanding
      FROM view_claim_coverage_status;
    `;
    
    const summaryResult = await pool.query(summaryQuery);
    
    res.json({
      summary: summaryResult.rows[0],
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching claims coverage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/coverage/payers - Payer Performance Ranking
// Description: Ranks payers by their average coverage ratio
// ============================================================================
router.get('/payers', async (req, res) => {
  try {
    const query = `
      SELECT 
        payer_id,
        payer_name,
        payer_type,
        total_claims,
        fully_covered_count,
        partially_covered_count,
        rejected_count,
        fully_covered_pct,
        partially_covered_pct,
        rejected_pct,
        avg_coverage_ratio,
        total_billed,
        total_paid,
        total_outstanding
      FROM view_coverage_by_payer
      ORDER BY avg_coverage_ratio DESC;
    `;

    const result = await pool.query(query);
    
    // Calculate summary stats
    const totalPayers = result.rows.length;
    const totalClaims = result.rows.reduce((sum, r) => sum + parseInt(r.total_claims), 0);
    const totalPaid = result.rows.reduce((sum, r) => sum + parseFloat(r.total_paid), 0);
    const avgCoverage = result.rows.length > 0 
      ? result.rows.reduce((sum, r) => sum + parseFloat(r.avg_coverage_ratio), 0) / result.rows.length 
      : 0;
    
    res.json({
      summary: {
        total_payers: totalPayers,
        total_claims: totalClaims,
        total_paid: totalPaid.toFixed(2),
        avg_coverage_ratio: avgCoverage.toFixed(4)
      },
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching payer coverage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/coverage/procedures/list - Get procedure list for autocomplete
// Description: Returns distinct encounter types with descriptions
// ============================================================================
router.get('/procedures/list', async (req, res) => {
  try {
    const search = req.query.search || '';
    
    // Use encounters table which has actual coverage data
    const query = `
      SELECT DISTINCT 
        e.CODE as procedure_code,
        e.DESCRIPTION as procedure_name,
        COUNT(*) as usage_count
      FROM encounters e
      WHERE e.CODE IS NOT NULL
        AND e.DESCRIPTION IS NOT NULL
        AND e.TOTAL_CLAIM_COST > 0
        AND (
          LOWER(e.CODE) LIKE LOWER($1)
          OR LOWER(e.DESCRIPTION) LIKE LOWER($1)
        )
      GROUP BY e.CODE, e.DESCRIPTION
      ORDER BY usage_count DESC
      LIMIT 50;
    `;

    const result = await pool.query(query, [`%${search}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching procedure list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/coverage/procedures/rejections - High Rejection Procedures
// Description: Shows procedures that get rejected most often
// ============================================================================
router.get('/procedures/rejections', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const minClaims = req.query.min_claims || 5;
    
    // Get procedure descriptions from encounters table
    const query = `
      SELECT 
        v.PROCEDURECODE as procedure_code,
        e.DESCRIPTION as procedure_name,
        v.total_claims,
        v.fully_covered_count,
        v.partially_covered_count,
        v.rejected_count,
        v.fully_covered_pct,
        v.partially_covered_pct,
        v.rejected_pct,
        v.avg_coverage_ratio,
        v.total_billed,
        v.total_paid,
        v.total_outstanding
      FROM view_coverage_by_procedure v
      LEFT JOIN (
        SELECT DISTINCT CODE, DESCRIPTION 
        FROM encounters 
        WHERE DESCRIPTION IS NOT NULL
      ) e ON v.PROCEDURECODE = e.CODE
      WHERE v.total_claims >= $1
      ORDER BY v.rejected_pct DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [minClaims, limit]);
    
    // Calculate summary stats
    const totalProcedures = result.rows.length;
    const avgRejectionRate = result.rows.length > 0
      ? result.rows.reduce((sum, r) => sum + parseFloat(r.rejected_pct), 0) / result.rows.length
      : 0;
    const totalBilled = result.rows.reduce((sum, r) => sum + parseFloat(r.total_billed), 0);
    
    res.json({
      summary: {
        procedures_analyzed: totalProcedures,
        avg_rejection_rate: avgRejectionRate.toFixed(2),
        total_billed: totalBilled.toFixed(2)
      },
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching procedure rejections:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/coverage/procedures/:code - Procedure Coverage Lookup
// Description: Detailed coverage stats for one procedure code
// ============================================================================
router.get('/procedures/:code', async (req, res) => {
  try {
    const procedureCode = req.params.code;
    
    // Get procedure descriptions from encounters table
    const query = `
      SELECT 
        v.PROCEDURECODE as procedure_code,
        e.DESCRIPTION as procedure_name,
        v.total_claims,
        v.fully_covered_count,
        v.partially_covered_count,
        v.rejected_count,
        v.fully_covered_pct,
        v.partially_covered_pct,
        v.rejected_pct,
        v.avg_coverage_ratio,
        v.total_billed,
        v.total_paid,
        v.total_outstanding
      FROM view_coverage_by_procedure v
      LEFT JOIN (
        SELECT DISTINCT CODE, DESCRIPTION 
        FROM encounters 
        WHERE DESCRIPTION IS NOT NULL
      ) e ON v.PROCEDURECODE = e.CODE
      WHERE v.PROCEDURECODE = $1;
    `;

    const result = await pool.query(query, [procedureCode]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found or no claims data' });
    }
    
    // Get recent claims for this procedure (procedurecode is now just 'procedurecode' in view)
    const claimsQuery = `
      SELECT 
        claim_id,
        billed_amount,
        paid_amount,
        outstanding_amount,
        coverage_ratio,
        coverage_status,
        claim_date
      FROM view_claim_coverage_status
      WHERE procedurecode = $1
      ORDER BY claim_date DESC
      LIMIT 10;
    `;
    
    const claimsResult = await pool.query(claimsQuery, [procedureCode]);
    
    res.json({
      summary: result.rows[0],
      recent_claims: claimsResult.rows
    });
  } catch (err) {
    console.error('Error fetching procedure coverage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

