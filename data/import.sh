#!/bin/bash

#update these if you want
DB_NAME="your_database_name"
DB_USER="your_username"
DB_HOST="localhost"
DB_PORT="5432"


psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "postgre isnt working"
    exit 1
fi


import_csv() {
    local table_name=$1
    local csv_file=$2
    
    echo "Importing $table_name..."
    
    if [ ! -f "$csv_file" ]; then
        echo -e "File not found: $csv_file${NC}"
        return 1
    fi
    
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\COPY $table_name FROM '$csv_file' WITH (FORMAT csv, HEADER true, DELIMITER ',');"
    
    if [ $? -eq 0 ]; then
        # Count rows imported
        row_count=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $table_name;")
    else
        echo "Failed to import $table_name${NC}"
        return 1
    fi
}

# Import tables in correct order (respecting dependencies)
echo "importing"

import_csv "patients" "data/patients.csv"
import_csv "organizations" "data/organizations.csv"
import_csv "payers" "data/payers.csv"
import_csv "encounters" "data/encounters.csv"
import_csv "conditions" "data/conditions.csv"
import_csv "procedures" "data/procedures.csv"
import_csv "medications" "data/medications.csv"
import_csv "claims_transactions" "data/claims_transactions.csv"

echo "summary:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"