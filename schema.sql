-- ============================================================================
-- Medical Database Schema for CS554 Project
-- Updated with: providers table, primary keys, foreign keys, readmission indexes
-- ============================================================================

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
-- BASE TABLES (No Foreign Key Dependencies)
-- ============================================================================

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

-- ============================================================================
-- PROVIDERS TABLE (NEW - Critical Addition)
-- Links to organizations, referenced by encounters and claims
-- ============================================================================

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
-- ENCOUNTERS TABLE (Central table linking patients to care events)
-- ============================================================================

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

-- NEW: Critical index for readmission detection (discharge date)
CREATE INDEX idx_patient_discharge ON encounters(PATIENT, STOP);

-- NEW: Composite index for inpatient/emergency readmission queries
CREATE INDEX idx_readmission_analysis ON encounters(PATIENT, ENCOUNTERCLASS, START, STOP);

-- ============================================================================
-- CONDITIONS TABLE (Patient diagnoses - SNOMED CT codes)
-- Added: SERIAL PRIMARY KEY for unique identification
-- ============================================================================

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

-- ============================================================================
-- PROCEDURES TABLE (Medical procedures performed)
-- Added: SERIAL PRIMARY KEY for unique identification
-- ============================================================================

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

-- ============================================================================
-- MEDICATIONS TABLE (Prescribed medications)
-- Added: SERIAL PRIMARY KEY for unique identification
-- ============================================================================

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
-- CLAIMS_TRANSACTIONS TABLE (Billing and insurance claims)
-- Added: Foreign key constraints for referential integrity
-- ============================================================================

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
CREATE INDEX idx_claims_provider ON claims_transactions(PROVIDERID);

-- NEW: Index for outstanding claims (denial analysis)
CREATE INDEX idx_claims_outstanding ON claims_transactions(OUTSTANDING) WHERE OUTSTANDING > 0;
