-- ============================================================================
-- CS554 Medical Database Schema
-- ============================================================================
-- 
-- STRUCTURE:
--   PART 1: Drop existing objects
--   PART 2: Base tables (patients, organizations, payers)
--   PART 3: Clinical tables (encounters, conditions, procedures, medications)
--   PART 4: Billing tables (claims_transactions)
--   PART 5: Insurance Coverage Analysis Views
--
-- ============================================================================


-- ============================================================================
-- PART 1: DROP EXISTING OBJECTS
-- ============================================================================
-- Drop in reverse dependency order (children first, then parents)

DROP VIEW IF EXISTS view_coverage_by_procedure CASCADE;
DROP VIEW IF EXISTS view_coverage_by_payer CASCADE;
DROP VIEW IF EXISTS view_claim_coverage_status CASCADE;

-- Drop tables in reverse dependency order (children first, then parents)
DROP TABLE IF EXISTS claims_transactions CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS procedures CASCADE;
DROP TABLE IF EXISTS conditions CASCADE;
DROP TABLE IF EXISTS encounters CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS payers CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS patients CASCADE;


-- ============================================================================
-- PART 2: BASE TABLES
-- ============================================================================
-- These tables have no foreign key dependencies

-- ----------------------------------------------------------------------------
-- Table: patients
-- Description: Core patient demographic information
-- ----------------------------------------------------------------------------
CREATE TABLE patients (
    Id UUID PRIMARY KEY,
    BIRTHDATE DATE,
    DEATHDATE DATE,
    SSN VARCHAR(11),
    DRIVERS VARCHAR(20),
    PASSPORT VARCHAR(20),
    PREFIX VARCHAR(10),
    FIRST VARCHAR(50),
    MIDDLE VARCHAR(50),
    LAST VARCHAR(50),
    SUFFIX VARCHAR(10),
    MAIDEN VARCHAR(50),
    MARITAL CHAR(1),
    RACE VARCHAR(50),
    ETHNICITY VARCHAR(50),
    GENDER CHAR(1),
    BIRTHPLACE VARCHAR(100),
    ADDRESS VARCHAR(200),
    CITY VARCHAR(50),
    STATE VARCHAR(50),
    COUNTY VARCHAR(50),
    FIPS VARCHAR(10),
    ZIP VARCHAR(10),
    LAT DECIMAL(9,6),
    LON DECIMAL(9,6),
    HEALTHCARE_EXPENSES DECIMAL(12,2),
    HEALTHCARE_COVERAGE DECIMAL(12,2),
    INCOME DECIMAL(12,2)
);



-- ----------------------------------------------------------------------------
-- Table: organizations
-- Description: Healthcare facilities and hospitals
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    Id UUID PRIMARY KEY,
    NAME VARCHAR(200),
    ADDRESS VARCHAR(200),
    CITY VARCHAR(50),
    STATE VARCHAR(50),
    ZIP VARCHAR(10),
    LAT DECIMAL(9,6),
    LON DECIMAL(9,6),
    PHONE VARCHAR(100),
    REVENUE DECIMAL(15,2),
    UTILIZATION INTEGER
);

-- ----------------------------------------------------------------------------
-- Table: payers
-- Description: Insurance companies and payment sources
-- ----------------------------------------------------------------------------
CREATE TABLE payers (
    Id UUID PRIMARY KEY,
    NAME VARCHAR(200),
    OWNERSHIP VARCHAR(100),
    ADDRESS VARCHAR(200),
    CITY VARCHAR(50),
    STATE_HEADQUARTERED VARCHAR(50),
    ZIP VARCHAR(10),
    PHONE VARCHAR(20),
    AMOUNT_COVERED DECIMAL(15,2),
    AMOUNT_UNCOVERED DECIMAL(15,2),
    REVENUE DECIMAL(15,2),
    COVERED_ENCOUNTERS INTEGER,
    UNCOVERED_ENCOUNTERS INTEGER,
    COVERED_MEDICATIONS INTEGER,
    UNCOVERED_MEDICATIONS INTEGER,
    COVERED_PROCEDURES INTEGER,
    UNCOVERED_PROCEDURES INTEGER,
    COVERED_IMMUNIZATIONS INTEGER,
    UNCOVERED_IMMUNIZATIONS INTEGER,
    UNIQUE_CUSTOMERS INTEGER,
    QOLS_AVG DECIMAL(5,2),
    MEMBER_MONTHS INTEGER
);



CREATE TABLE providers (
    Id UUID PRIMARY KEY,
    ORGANIZATION UUID NOT NULL REFERENCES organizations(Id),
    NAME VARCHAR(200),
    GENDER CHAR(1),
    SPECIALITY VARCHAR(100),
    ADDRESS VARCHAR(200),
    CITY VARCHAR(50),
    STATE VARCHAR(50),
    ZIP VARCHAR(10),
    LAT DECIMAL(9,6),
    LON DECIMAL(9,6),
    ENCOUNTERS INTEGER,
    PROCEDURES INTEGER
);

CREATE INDEX idx_provider_org ON providers(ORGANIZATION);
CREATE INDEX idx_provider_specialty ON providers(SPECIALITY);

-- ============================================================================
-- PART 3: CLINICAL TABLES
-- ============================================================================
-- These tables track patient care events

-- ----------------------------------------------------------------------------
-- Table: encounters
-- Description: Patient visits and care events
-- ----------------------------------------------------------------------------
CREATE TABLE encounters (
    Id UUID PRIMARY KEY,
    START TIMESTAMP NOT NULL,
    STOP TIMESTAMP,
    PATIENT UUID NOT NULL REFERENCES patients(Id),
    ORGANIZATION UUID NOT NULL REFERENCES organizations(Id),
    PROVIDER UUID REFERENCES providers(Id),
    PAYER UUID REFERENCES payers(Id),
    ENCOUNTERCLASS VARCHAR(50),
    CODE VARCHAR(20),
    DESCRIPTION TEXT,
    BASE_ENCOUNTER_COST DECIMAL(12,2),
    TOTAL_CLAIM_COST DECIMAL(12,2),
    PAYER_COVERAGE DECIMAL(12,2),
    REASONCODE VARCHAR(20),
    REASONDESCRIPTION TEXT
);

-- Existing indexes
CREATE INDEX idx_patient_timeline ON encounters(PATIENT, START);
CREATE INDEX idx_org_encounters ON encounters(ORGANIZATION, ENCOUNTERCLASS);
CREATE INDEX idx_encounter_type ON encounters(ENCOUNTERCLASS);
CREATE INDEX idx_encounter_payer ON encounters(PAYER);

-- ----------------------------------------------------------------------------
-- Table: conditions
-- Description: Patient diagnoses and conditions (SNOMED CT codes)
-- ----------------------------------------------------------------------------
CREATE TABLE conditions (
    id SERIAL PRIMARY KEY,
    START DATE NOT NULL,
    STOP DATE,
    PATIENT UUID NOT NULL REFERENCES patients(Id),
    ENCOUNTER UUID REFERENCES encounters(Id),
    SYSTEM VARCHAR(100),
    CODE VARCHAR(20),
    DESCRIPTION TEXT
);

CREATE INDEX idx_patient_conditions ON conditions(PATIENT);
CREATE INDEX idx_condition_code ON conditions(CODE);
CREATE INDEX idx_patient_condition_timeline ON conditions(PATIENT, START);
CREATE INDEX idx_condition_encounter ON conditions(ENCOUNTER);

-- NEW: Index for chronic/active conditions (no end date)
CREATE INDEX idx_active_conditions ON conditions(PATIENT, CODE) WHERE STOP IS NULL;

-- ----------------------------------------------------------------------------
-- Table: procedures
-- Description: Medical procedures performed on patients
-- ----------------------------------------------------------------------------
CREATE TABLE procedures (
    id SERIAL PRIMARY KEY,
    START TIMESTAMP NOT NULL,
    STOP TIMESTAMP,
    PATIENT UUID NOT NULL REFERENCES patients(Id),
    ENCOUNTER UUID REFERENCES encounters(Id),
    SYSTEM VARCHAR(100),
    CODE VARCHAR(20),
    DESCRIPTION TEXT,
    BASE_COST DECIMAL(12,2),
    REASONCODE VARCHAR(20),
    REASONDESCRIPTION TEXT
);

CREATE INDEX idx_procedure_encounter ON procedures(ENCOUNTER);
CREATE INDEX idx_procedure_code ON procedures(CODE);
CREATE INDEX idx_procedure_patient ON procedures(PATIENT);

-- ----------------------------------------------------------------------------
-- Table: medications
-- Description: Medications prescribed to patients
-- ----------------------------------------------------------------------------
CREATE TABLE medications (
    id SERIAL PRIMARY KEY,
    START TIMESTAMP NOT NULL,
    STOP TIMESTAMP,
    PATIENT UUID NOT NULL REFERENCES patients(Id),
    PAYER UUID REFERENCES payers(Id),
    ENCOUNTER UUID REFERENCES encounters(Id),
    CODE VARCHAR(20),
    DESCRIPTION TEXT,
    BASE_COST DECIMAL(12,2),
    PAYER_COVERAGE DECIMAL(12,2),
    DISPENSES INTEGER,
    TOTALCOST DECIMAL(12,2),
    REASONCODE VARCHAR(20),
    REASONDESCRIPTION TEXT
);

CREATE INDEX idx_patient_medications ON medications(PATIENT, START);
CREATE INDEX idx_medication_encounter ON medications(ENCOUNTER);
CREATE INDEX idx_medication_code ON medications(CODE);


-- ============================================================================
-- PART 4: BILLING TABLES
-- ============================================================================
-- These tables track financial transactions

-- ----------------------------------------------------------------------------
-- Table: claims_transactions
-- Description: Insurance claims and billing transactions
-- Key fields for coverage analysis:
--   AMOUNT      = Total billed amount
--   PAYMENTS    = Amount paid by insurance
--   OUTSTANDING = Amount still owed (by patient or pending)
--   ADJUSTMENTS = Write-offs or corrections
-- ----------------------------------------------------------------------------
CREATE TABLE claims_transactions (
    ID UUID PRIMARY KEY,
    CLAIMID UUID,
    CHARGEID INTEGER,
    PATIENTID UUID NOT NULL REFERENCES patients(Id),
    TYPE VARCHAR(50),
    AMOUNT DECIMAL(12,2),
    METHOD VARCHAR(50),
    FROMDATE TIMESTAMP,
    TODATE TIMESTAMP,
    PLACEOFSERVICE UUID REFERENCES organizations(Id),
    PROCEDURECODE VARCHAR(20),
    MODIFIER1 VARCHAR(10),
    MODIFIER2 VARCHAR(10),
    DIAGNOSISREF1 INTEGER,
    DIAGNOSISREF2 INTEGER,
    DIAGNOSISREF3 INTEGER,
    DIAGNOSISREF4 INTEGER,
    UNITS INTEGER,
    DEPARTMENTID INTEGER,
    NOTES TEXT,
    UNITAMOUNT DECIMAL(12,2),
    TRANSFEROUTID INTEGER,
    TRANSFERTYPE VARCHAR(50),
    PAYMENTS DECIMAL(12,2),
    ADJUSTMENTS DECIMAL(12,2),
    TRANSFERS DECIMAL(12,2),
    OUTSTANDING DECIMAL(12,2),
    APPOINTMENTID UUID REFERENCES encounters(Id),
    LINENOTE TEXT,
    PATIENTINSURANCEID UUID,
    FEESCHEDULEID INTEGER,
    PROVIDERID UUID REFERENCES providers(Id),
    SUPERVISINGPROVIDERID UUID REFERENCES providers(Id)
);

CREATE INDEX idx_patient_procedure_claims ON claims_transactions(PATIENTID, PROCEDURECODE);
CREATE INDEX idx_denial_analysis ON claims_transactions(PROCEDURECODE, OUTSTANDING);
CREATE INDEX idx_claims_encounter ON claims_transactions(APPOINTMENTID);
CREATE INDEX idx_transaction_type ON claims_transactions(TYPE);
CREATE INDEX idx_claims_amount ON claims_transactions(AMOUNT, PAYMENTS);


-- ============================================================================
-- PART 5: INSURANCE COVERAGE ANALYSIS VIEWS
-- ============================================================================
-- 
-- NOTE: These views use the ENCOUNTERS table which contains actual coverage data:
--   - TOTAL_CLAIM_COST = Total billed amount
--   - PAYER_COVERAGE = Amount insurance paid
--   - Patient responsibility = TOTAL_CLAIM_COST - PAYER_COVERAGE
--
-- Coverage Status Definitions (MUTUALLY EXCLUSIVE):
--   FULLY_COVERED    = Insurance paid >= billed amount
--   PARTIALLY_COVERED = Insurance paid some but < billed amount
--   REJECTED         = Insurance paid $0 on a claim
--
-- Key Metrics:
--   coverage_ratio   = PAYER_COVERAGE / TOTAL_CLAIM_COST (0.0 to 1.0)
--   patient_burden   = (TOTAL_CLAIM_COST - PAYER_COVERAGE) / TOTAL_CLAIM_COST
--
-- ============================================================================


-- ----------------------------------------------------------------------------
-- VIEW 1: view_claim_coverage_status (BASIC)
-- Description: Classifies each encounter by coverage status
-- Source: encounters table (has actual coverage data)
-- ----------------------------------------------------------------------------
CREATE VIEW view_claim_coverage_status AS
SELECT 
    e.Id AS claim_id,
    e.Id AS encounter_id,
    e.PATIENT AS patientid,
    e.CODE AS procedurecode,
    e.START AS claim_date,
    
    -- Dollar amounts from encounters
    e.TOTAL_CLAIM_COST AS billed_amount,
    e.PAYER_COVERAGE AS paid_amount,
    0::DECIMAL(12,2) AS adjusted_amount,
    (e.TOTAL_CLAIM_COST - e.PAYER_COVERAGE) AS outstanding_amount,
    
    -- Coverage ratio
    CASE 
        WHEN e.TOTAL_CLAIM_COST > 0 THEN ROUND((e.PAYER_COVERAGE / e.TOTAL_CLAIM_COST)::NUMERIC, 4)
        ELSE 0
    END AS coverage_ratio,
    
    -- Patient burden ratio
    CASE 
        WHEN e.TOTAL_CLAIM_COST > 0 THEN ROUND(((e.TOTAL_CLAIM_COST - e.PAYER_COVERAGE) / e.TOTAL_CLAIM_COST)::NUMERIC, 4)
        ELSE 0
    END AS patient_burden_ratio,
    
    -- Coverage status - MUTUALLY EXCLUSIVE classification
    CASE 
        WHEN e.PAYER_COVERAGE >= e.TOTAL_CLAIM_COST THEN 'FULLY_COVERED'
        WHEN e.PAYER_COVERAGE > 0 AND e.PAYER_COVERAGE < e.TOTAL_CLAIM_COST THEN 'PARTIALLY_COVERED'
        WHEN e.PAYER_COVERAGE = 0 AND e.TOTAL_CLAIM_COST > 0 THEN 'REJECTED'
        ELSE 'UNKNOWN'
    END AS coverage_status,
    
    e.PAYER AS payer_id

FROM encounters e
WHERE e.TOTAL_CLAIM_COST > 0;


-- ----------------------------------------------------------------------------
-- VIEW 2: view_coverage_by_procedure (AGGREGATED)
-- Description: Summary statistics for each encounter/procedure code
-- Shows: claim counts, coverage rates, rejection rates
-- ----------------------------------------------------------------------------
CREATE VIEW view_coverage_by_procedure AS
SELECT 
    e.CODE AS procedurecode,
    
    COUNT(*) AS total_claims,
    
    -- Count by MUTUALLY EXCLUSIVE coverage status
    SUM(CASE WHEN e.PAYER_COVERAGE >= e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) AS fully_covered_count,
    SUM(CASE WHEN e.PAYER_COVERAGE > 0 AND e.PAYER_COVERAGE < e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) AS partially_covered_count,
    SUM(CASE WHEN e.PAYER_COVERAGE = 0 AND e.TOTAL_CLAIM_COST > 0 THEN 1 ELSE 0 END) AS rejected_count,
    
    -- Percentages
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE >= e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) / COUNT(*), 2) AS fully_covered_pct,
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE > 0 AND e.PAYER_COVERAGE < e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) / COUNT(*), 2) AS partially_covered_pct,
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE = 0 AND e.TOTAL_CLAIM_COST > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) AS rejected_pct,
    
    -- Dollar totals
    SUM(e.TOTAL_CLAIM_COST) AS total_billed,
    SUM(e.PAYER_COVERAGE) AS total_paid,
    SUM(e.TOTAL_CLAIM_COST - e.PAYER_COVERAGE) AS total_outstanding,
    
    -- DOLLAR-WEIGHTED coverage ratio: SUM(paid) / SUM(billed)
    -- This gives the overall reimbursement rate weighted by dollar amount
    ROUND(
        CASE 
            WHEN SUM(e.TOTAL_CLAIM_COST) > 0 
            THEN SUM(e.PAYER_COVERAGE) / SUM(e.TOTAL_CLAIM_COST)
            ELSE 0 
        END::NUMERIC, 4
    ) AS avg_coverage_ratio

FROM encounters e
WHERE e.TOTAL_CLAIM_COST > 0
  AND e.CODE IS NOT NULL
GROUP BY e.CODE;


-- ----------------------------------------------------------------------------
-- VIEW 3: view_coverage_by_payer (AGGREGATED)
-- Description: Summary statistics for each insurance payer
-- Joins with: payers (to get payer name)
-- ----------------------------------------------------------------------------
CREATE VIEW view_coverage_by_payer AS
SELECT 
    py.Id AS payer_id,
    py.NAME AS payer_name,
    py.OWNERSHIP AS payer_type,
    
    COUNT(*) AS total_claims,
    
    -- Count by coverage status
    SUM(CASE WHEN e.PAYER_COVERAGE >= e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) AS fully_covered_count,
    SUM(CASE WHEN e.PAYER_COVERAGE > 0 AND e.PAYER_COVERAGE < e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) AS partially_covered_count,
    SUM(CASE WHEN e.PAYER_COVERAGE = 0 AND e.TOTAL_CLAIM_COST > 0 THEN 1 ELSE 0 END) AS rejected_count,
    
    -- Percentages
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE >= e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) / COUNT(*), 2) AS fully_covered_pct,
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE > 0 AND e.PAYER_COVERAGE < e.TOTAL_CLAIM_COST THEN 1 ELSE 0 END) / COUNT(*), 2) AS partially_covered_pct,
    ROUND(100.0 * SUM(CASE WHEN e.PAYER_COVERAGE = 0 AND e.TOTAL_CLAIM_COST > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) AS rejected_pct,
    
    -- Dollar totals
    SUM(e.TOTAL_CLAIM_COST) AS total_billed,
    SUM(e.PAYER_COVERAGE) AS total_paid,
    SUM(e.TOTAL_CLAIM_COST - e.PAYER_COVERAGE) AS total_outstanding,
    
    -- DOLLAR-WEIGHTED coverage ratio: SUM(paid) / SUM(billed)
    -- This gives the overall reimbursement rate weighted by dollar amount
    ROUND(
        CASE 
            WHEN SUM(e.TOTAL_CLAIM_COST) > 0 
            THEN SUM(e.PAYER_COVERAGE) / SUM(e.TOTAL_CLAIM_COST)
            ELSE 0 
        END::NUMERIC, 4
    ) AS avg_coverage_ratio

FROM encounters e
JOIN payers py ON e.PAYER = py.Id
WHERE e.TOTAL_CLAIM_COST > 0
GROUP BY py.Id, py.NAME, py.OWNERSHIP;


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================