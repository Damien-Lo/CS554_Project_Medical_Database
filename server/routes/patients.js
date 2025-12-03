import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/patients/high-risk - Top risk patients
router.get('/high-risk', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    
    const query = `
      WITH recent_discharges AS (
        SELECT 
          p.Id as patient_id,
          p.FIRST || ' ' || p.LAST as patient_name,
          p.BIRTHDATE,
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
          (SELECT COUNT(*)
           FROM encounters e2
           WHERE e2.PATIENT = e.PATIENT
             AND e2.ENCOUNTERCLASS IN ('inpatient', 'emergency')
             AND e2.STOP < e.START
             AND e2.STOP >= e.START - INTERVAL '90 days') as prior_admissions_90d
        FROM encounters e
        JOIN patients p ON e.PATIENT = p.Id
        JOIN organizations o ON e.ORGANIZATION = o.Id
        WHERE e.ENCOUNTERCLASS IN ('inpatient', 'emergency')
          AND e.STOP IS NOT NULL
          AND e.STOP >= '2025-11-20'::date - INTERVAL '90 days'
      ),
      risk_factors AS (
        SELECT 
          *,
          (
            LEAST(20, GREATEST(0, 
              EXTRACT(YEAR FROM AGE('2025-11-20'::date, BIRTHDATE)) - 50) * 0.5) +
            LEAST(30, condition_count * 5) +
            LEAST(50, prior_admissions_90d * 20)
          )::numeric(5,2) as risk_score
        FROM recent_discharges
      )
      SELECT 
        patient_name,
        patient_id,
        EXTRACT(YEAR FROM AGE('2025-11-20'::date, BIRTHDATE))::int as age,
        ENCOUNTERCLASS as visit_type,
        discharge_date,
        hospital,
        primary_diagnosis,
        condition_count as comorbidities,
        prior_admissions_90d as recent_admissions,
        risk_score,
        CASE 
          WHEN risk_score >= 75 THEN 'CRITICAL'
          WHEN risk_score >= 50 THEN 'HIGH'
          WHEN risk_score >= 25 THEN 'MEDIUM'
          ELSE 'LOW'
        END as risk_category
      FROM risk_factors
      ORDER BY risk_score DESC
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
