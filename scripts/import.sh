#!/bin/bash

# ============================================================================
# Medical Database Import Script
# Imports CSV data into PostgreSQL tables in dependency order
# ============================================================================

# Update these with your database credentials
DB_NAME="your_database_name"
DB_USER="your_username"
DB_HOST="localhost"
DB_PORT="5432"

# Test database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "PostgreSQL connection failed. Check your credentials and ensure the database is running."
    exit 1
fi

# Standard import function (for tables where CSV columns match table columns)
import_csv() {
    local table_name=$1
    local csv_file=$2
    
    echo "Importing $table_name..."
    
    if [ ! -f "$csv_file" ]; then
        echo "File not found: $csv_file"
        return 1
    fi
    
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\COPY $table_name FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER ',');"
    
    if [ $? -eq 0 ]; then
        row_count=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table_name;")
        echo "  -> Imported $row_count rows"
    else
        echo "Failed to import $table_name"
        return 1
    fi
}

# Import function for tables with SERIAL primary key (CSV doesn't include id column)
import_csv_with_columns() {
    local table_name=$1
    local csv_file=$2
    local columns=$3
    
    echo "Importing $table_name..."
    
    if [ ! -f "$csv_file" ]; then
        echo "File not found: $csv_file"
        return 1
    fi
    
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\COPY $table_name($columns) FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER ',');"
    
    if [ $? -eq 0 ]; then
        row_count=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table_name;")
        echo "  -> Imported $row_count rows"
    else
        echo "Failed to import $table_name"
        return 1
    fi
}

# ============================================================================
# Import tables in dependency order
# Order matters due to foreign key constraints!
# ============================================================================

echo "=============================================="
echo "Starting data import..."
echo "=============================================="

# 1. Base tables (no foreign key dependencies)
import_csv "patients" "data/patients.csv"
import_csv "organizations" "data/organizations.csv"
import_csv "payers" "data/payers.csv"

# 2. Providers (depends on organizations)
import_csv "providers" "data/providers.csv"

# 3. Encounters (depends on patients, organizations, providers, payers)
import_csv "encounters" "data/encounters.csv"

# 4. Tables with SERIAL primary keys - must specify columns since CSV doesn't have 'id'
import_csv_with_columns "conditions" "data/conditions.csv" \
    "START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION"

import_csv_with_columns "procedures" "data/procedures.csv" \
    "START,STOP,PATIENT,ENCOUNTER,SYSTEM,CODE,DESCRIPTION,BASE_COST,REASONCODE,REASONDESCRIPTION"

import_csv_with_columns "medications" "data/medications.csv" \
    "START,STOP,PATIENT,PAYER,ENCOUNTER,CODE,DESCRIPTION,BASE_COST,PAYER_COVERAGE,DISPENSES,TOTALCOST,REASONCODE,REASONDESCRIPTION"

# 5. Claims transactions (depends on patients, organizations, encounters, providers)
import_csv "claims_transactions" "data/claims_transactions.csv"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "=============================================="
echo "Import Summary"
echo "=============================================="
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') AS columns
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

echo ""
echo "Row counts per table:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 'patients' as table_name, COUNT(*) as row_count FROM patients
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL SELECT 'payers', COUNT(*) FROM payers
UNION ALL SELECT 'providers', COUNT(*) FROM providers
UNION ALL SELECT 'encounters', COUNT(*) FROM encounters
UNION ALL SELECT 'conditions', COUNT(*) FROM conditions
UNION ALL SELECT 'procedures', COUNT(*) FROM procedures
UNION ALL SELECT 'medications', COUNT(*) FROM medications
UNION ALL SELECT 'claims_transactions', COUNT(*) FROM claims_transactions
ORDER BY table_name;
"

echo ""
echo "Import complete!"
