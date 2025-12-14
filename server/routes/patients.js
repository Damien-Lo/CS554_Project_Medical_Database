import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/high-risk', async (req, res) => {
    try {
        const limit = req.query.limit || 20;

        const query = `
      WITH recent_discharges AS (
        SELECT 
          p.Id as patient_id,
          p.FIRST || ' ' || p.LAST as patient_name,
          p.BIRTHDATE,
          p.GENDER,
          e.Id as encounter_id,
          e.START as admission_date,
          e.STOP as discharge_date,
          e.ENCOUNTERCLASS,
          o.NAME as hospital,
          (SELECT c.DESCRIPTION 
           FROM conditions c 
           WHERE c.ENCOUNTER = e.Id 
           ORDER BY c.START 
           LIMIT 1) as primary_diagnosis,
          (SELECT COUNT(*) 
           FROM conditions c 
           WHERE c.ENCOUNTER = e.Id) as condition_count,
          EXTRACT(DAY FROM (e.STOP - e.START))::int as length_of_stay,
          (SELECT COUNT(*)
           FROM encounters e2
           WHERE e2.PATIENT = e.PATIENT
             AND e2.ENCOUNTERCLASS IN ('inpatient', 'emergency')
             AND e2.STOP < e.START
             AND e2.STOP >= e.START - INTERVAL '6 months') as prior_admissions_6mo,
          (SELECT COUNT(*)
           FROM encounters e2
           WHERE e2.PATIENT = e.PATIENT
             AND e2.ENCOUNTERCLASS = 'emergency'
             AND e2.STOP >= e.START - INTERVAL '6 months'
             AND e2.STOP < e.START) as ed_visits_6mo,
          CASE WHEN e.ENCOUNTERCLASS = 'emergency' THEN 1 ELSE 0 END as admitted_via_ed
        FROM encounters e
        JOIN patients p ON e.PATIENT = p.Id
        JOIN organizations o ON e.ORGANIZATION = o.Id
        WHERE e.ENCOUNTERCLASS IN ('inpatient', 'emergency')
          AND e.STOP IS NOT NULL
          AND e.STOP >= CURRENT_DATE - INTERVAL '90 days'
      ),
      lace_scores AS (
        SELECT 
          *,
          -- L: Length of stay (0-7 points)
          LEAST(7, GREATEST(0, 
            CASE 
              WHEN length_of_stay < 1 THEN 0
              WHEN length_of_stay = 1 THEN 1
              WHEN length_of_stay = 2 THEN 2
              WHEN length_of_stay = 3 THEN 3
              WHEN length_of_stay >= 14 THEN 7
              ELSE 4 + LEAST(3, length_of_stay - 4)
            END
          )) as lace_length,
          
          -- A: Acuity of admission (3 points if emergency)
          CASE WHEN admitted_via_ed = 1 THEN 3 ELSE 0 END as lace_acuity,
          
          -- C: Comorbidities (0-6 points, Charlson approximation)
          LEAST(6, condition_count) as lace_comorbidity,
          
          -- E: Emergency department visits in last 6 months (0-4 points)
          LEAST(4, ed_visits_6mo) as lace_ed_visits,
          
          -- Age calculation
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE))::int as age
        FROM recent_discharges
      ),
      risk_calculation AS (
        SELECT 
          *,
          -- LACE Score (0-19 points) - van Walraven et al., 2010
          (lace_length + lace_acuity + lace_comorbidity + lace_ed_visits) as lace_score,
          
          -- Age-adjusted risk multiplier (Silverstein et al., 2008)
          -- Based on odds ratios from published study
          CASE 
            WHEN age < 65 THEN 1.00
            WHEN age BETWEEN 65 AND 69 THEN 1.00
            WHEN age BETWEEN 70 AND 74 THEN 1.11
            WHEN age BETWEEN 75 AND 79 THEN 1.30
            WHEN age BETWEEN 80 AND 84 THEN 1.22
            WHEN age >= 85 THEN 1.28
          END as age_multiplier,
          
          -- Age risk points (0-6 points added to LACE)
          CASE 
            WHEN age < 65 THEN 0
            WHEN age BETWEEN 65 AND 69 THEN 0
            WHEN age BETWEEN 70 AND 74 THEN 2
            WHEN age BETWEEN 75 AND 79 THEN 4
            WHEN age BETWEEN 80 AND 84 THEN 3
            WHEN age >= 85 THEN 5
          END as age_points
        FROM lace_scores
      )
      SELECT DISTINCT ON (patient_id)
        patient_name,
        patient_id,
        age,
        ENCOUNTERCLASS as visit_type,
        discharge_date,
        hospital,
        primary_diagnosis,
        condition_count as comorbidities,
        prior_admissions_6mo as recent_admissions,
        length_of_stay,
        ed_visits_6mo,
        lace_score,
        age_points,
        age_multiplier,
        -- Combined LACE + Age Score (0-25 points)
        (lace_score + age_points) as risk_score,
        
        -- Risk categories based on LACE + Age
        CASE 
          WHEN (lace_score + age_points) >= 15 THEN 'CRITICAL'
          WHEN (lace_score + age_points) >= 10 THEN 'HIGH'
          WHEN (lace_score + age_points) >= 5 THEN 'MEDIUM'
          ELSE 'LOW'
        END as risk_category,
        
        -- Evidence-based readmission risk estimates
        CASE 
          WHEN lace_score >= 10 THEN 'High (15-25% risk)'
          WHEN lace_score >= 5 THEN 'Moderate (8-15% risk)'
          ELSE 'Low (3-8% risk)'
        END as estimated_readmission_risk
      FROM risk_calculation
      ORDER BY patient_id, (lace_score + age_points) DESC
      LIMIT $1;
    `;

        const result = await pool.query(query, [limit]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching high-risk patients:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/patients/search?query=<name or id>
router.get('/search', async (req, res) => {
  try {
    const searchQuery = req.query.query;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    // Search by name or ID
    const query = `
      SELECT 
        p.Id as patient_id,
        p.FIRST || ' ' || p.LAST as patient_name,
        p.BIRTHDATE,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.BIRTHDATE))::int as age,
        p.GENDER,
        p.CITY,
        p.STATE
      FROM patients p
      WHERE 
        LOWER(p.FIRST || ' ' || p.LAST) LIKE LOWER($1)
        OR p.Id::text = $2
      LIMIT 10;
    `;

    const result = await pool.query(query, [`%${searchQuery}%`, searchQuery]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching patients:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/encounters/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const query = `
      SELECT
        e.id AS encounter_id,
        e.start AS encounter_start,
        e.stop AS encounter_end,
        e.encounterclass,
        e.description,
        o.id AS organization_id,
        o.name AS organization_name,
        o.address,
        o.city,
        o.state
      FROM encounters e
      JOIN organizations o ON e.organization = o.id
      WHERE e.patient = $1
      ORDER BY e.start DESC
    `;

        const result = await pool.query(query, [patientId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching encounter history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check readmission/follow-up status for a patient
router.get('/readmission-check/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { days = 30 } = req.query;

        // First, get the last discharge
        const dischargeQuery = `
      SELECT 
        MAX(e.stop) AS last_discharge_at,
        e.encounterclass,
        e.description
      FROM encounters e
      WHERE e.patient = $1
        AND e.encounterclass != 'wellness'
        AND e.stop IS NOT NULL
      GROUP BY e.encounterclass, e.description
      ORDER BY MAX(e.stop) DESC
      LIMIT 1;
    `;

        const dischargeResult = await pool.query(dischargeQuery, [patientId]);

        if (dischargeResult.rows.length === 0) {
            return res.json({
                last_discharge: null,
                follow_ups: [],
                days_window: days
            });
        }

        const lastDischarge = dischargeResult.rows[0].last_discharge_at;

        // Then get follow-ups within the window
        const followUpQuery = `
      SELECT 
        p.start,
        p.stop,
        p.patient,
        p.encounter,
        p.code AS procedure_code,
        p.description AS procedure_description,
        p.reasondescription,
        e.encounterclass,
        e.description AS encounter_description,
        EXTRACT(EPOCH FROM (p.stop - $2::timestamp)) / 86400 AS days_since_discharge
      FROM procedures p
      JOIN encounters e ON p.encounter = e.id
      WHERE e.patient = $1
        AND p.stop >= $2::timestamp
        AND p.stop < $2::timestamp + ($3 || ' days')::INTERVAL
        AND e.encounterclass = 'wellness'
      ORDER BY p.stop;
    `;

        const followUpResult = await pool.query(followUpQuery, [patientId, lastDischarge, days]);

        res.json({
            last_discharge: dischargeResult.rows[0],
            follow_ups: followUpResult.rows,
            days_window: days
        });
    } catch (error) {
        console.error('Error checking readmission:', error);
        res.status(500).json({ error: error.message });
    }
});
// Readmission Detection for a patient
router.get('/readmission-detection/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { years = 10, windowDays = 30 } = req.query; // Configurable parameters

        const query = `
      WITH filtered AS (
        SELECT *
        FROM encounters e
        WHERE e.patient = $1
          AND e.encounterclass != 'wellness'
          AND e.start >= NOW() - INTERVAL '${years} years'
        ORDER BY e.start
      ),
      w AS (
        SELECT
          s.id AS index_encounter_id,
          s.start AS window_start,
          s.encounterclass AS index_encounter_class,
          s.description AS index_description,
          MAX(e.start) AS window_end,
          COUNT(*) AS encounter_count,
          COUNT(*) - 1 AS readmission_count,
          ARRAY_AGG(e.id ORDER BY e.start) AS encounter_ids,
          ARRAY_AGG(e.encounterclass ORDER BY e.start) AS encounter_classes,
          ARRAY_AGG(e.start ORDER BY e.start) AS encounter_dates
        FROM filtered s
        JOIN filtered e
          ON e.start >= s.start
         AND e.start < s.start + INTERVAL '${windowDays} days'
        GROUP BY s.id, s.start, s.encounterclass, s.description
      ),
      max_windows AS (
        SELECT w1.*
        FROM w AS w1
        WHERE NOT EXISTS (
          SELECT 1
          FROM w AS w2
          WHERE w2.window_end = w1.window_end
            AND (
              w2.encounter_count > w1.encounter_count
              OR (w2.encounter_count = w1.encounter_count
                  AND w2.window_start < w1.window_start)
            )
        )
      )
      SELECT
        index_encounter_id,
        window_start,
        window_end,
        index_encounter_class,
        index_description,
        encounter_count,
        readmission_count,
        encounter_ids,
        encounter_classes,
        encounter_dates,
        EXTRACT(DAY FROM (window_end - window_start)) AS window_duration_days
      FROM max_windows
      WHERE encounter_count > 1
      ORDER BY window_start DESC;
    `;

        const result = await pool.query(query, [patientId]);

        res.json({
            patient_id: patientId,
            years_analyzed: years,
            window_days: windowDays,
            readmission_events: result.rows,
            total_readmission_events: result.rows.length,
            total_readmissions: result.rows.reduce((sum, row) => sum + row.readmission_count, 0)
        });
    } catch (error) {
        console.error('Error detecting readmissions:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/patients/:id/risk - Get risk score for specific patient
router.get('/:id/risk', async (req, res) => {
  try {
    const patientId = req.params.id;
    
    const query = `
      WITH patient_encounters AS (
        SELECT 
          e.Id as encounter_id,
          e.START,
          e.STOP,
          e.ENCOUNTERCLASS
        FROM encounters e
        WHERE e.PATIENT = $1
          AND e.ENCOUNTERCLASS IN ('inpatient', 'emergency')
          AND e.STOP IS NOT NULL
        ORDER BY e.STOP DESC
        LIMIT 1
      ),
      patient_info AS (
        SELECT 
          p.Id as patient_id,
          p.FIRST || ' ' || p.LAST as patient_name,
          p.BIRTHDATE,
          pe.encounter_id,
          pe.STOP as last_discharge,
          (SELECT COUNT(*) 
           FROM conditions c 
           WHERE c.ENCOUNTER = pe.encounter_id) as condition_count,
          (SELECT COUNT(*)
           FROM encounters e2
           WHERE e2.PATIENT = p.Id
             AND e2.ENCOUNTERCLASS IN ('inpatient', 'emergency')
             AND e2.STOP < pe.STOP
             AND e2.STOP >= pe.STOP - INTERVAL '90 days') as prior_admissions_90d
        FROM patients p
        CROSS JOIN patient_encounters pe
        WHERE p.Id = $1
      )
      SELECT 
        patient_id,
        patient_name,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE))::int as age,
        last_discharge,
        condition_count as comorbidities,
        prior_admissions_90d as recent_admissions,
        (
          LEAST(20, GREATEST(0, 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE)) - 50) * 0.5) +
          LEAST(30, condition_count * 5) +
          LEAST(50, prior_admissions_90d * 20)
        )::numeric(5,2) as risk_score,
        CASE 
          WHEN (
            LEAST(20, GREATEST(0, 
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE)) - 50) * 0.5) +
            LEAST(30, condition_count * 5) +
            LEAST(50, prior_admissions_90d * 20)
          ) >= 75 THEN 'CRITICAL'
          WHEN (
            LEAST(20, GREATEST(0, 
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE)) - 50) * 0.5) +
            LEAST(30, condition_count * 5) +
            LEAST(50, prior_admissions_90d * 20)
          ) >= 50 THEN 'HIGH'
          WHEN (
            LEAST(20, GREATEST(0, 
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, BIRTHDATE)) - 50) * 0.5) +
            LEAST(30, condition_count * 5) +
            LEAST(50, prior_admissions_90d * 20)
          ) >= 25 THEN 'MEDIUM'
          ELSE 'LOW'
        END as risk_category
      FROM patient_info;
    `;

    const result = await pool.query(query, [patientId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found or no recent admissions' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching patient risk:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
