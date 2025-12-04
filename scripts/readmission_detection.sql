-- WITH last_discharge AS (
--     SELECT MAX(e.stop) AS last_discharge_at
--     FROM encounters e
--     WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
--     AND e.encounterclass != 'wellness'
-- )

-- Just to Check all Encounters by a Patient
SELECT e.id AS encounter_id, 
        e.start AS encounter_start, 
        e.stop AS encounter_end, 
        e.encounterclass AS encounter_class, 
        e.organization 
FROM encounters AS e
WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
ORDER BY encounter_start;


-- Filter all encounters before a certain date from today (ex. ignore all encounters
-- before a year from today)
WITH filtered AS (
    SELECT *
    FROM encounters e
    WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
      AND e.encounterclass != 'wellness'
      AND e.start >= NOW() - INTERVAL '10 years'
    ORDER BY e.start
),

-- For each encounter, join on all encounters that fall within a 30 day window of that encounter
-- produce a list of encounter ids for those encounters.
w AS (
    SELECT
        s.id   AS index_encounter_id,
        s.start AS window_start,
        MAX(e.start) AS window_end,
        COUNT(*) AS encounter_count,
        COUNT(*) - 1 AS readmission_count,
        ARRAY_AGG(e.id ORDER BY e.start) AS encounter_ids
    FROM filtered s
    JOIN filtered e
      ON e.start >= s.start
     AND e.start <  s.start + INTERVAL '2 years'
    GROUP BY s.id, s.start
),

-- If one list of encounter id fully exist in another list (subset) ignore
max_windows AS (
    SELECT w1.*
    FROM w AS w1
    WHERE NOT EXISTS (
        SELECT 1
        FROM w AS w2
        -- If the end dates are the same and window 1 starts later than window 2
        WHERE w2.window_end = w1.window_end
          AND (
                -- w2 is strictly "better" than w1
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
    encounter_count,
    readmission_count,
    encounter_ids
FROM max_windows
WHERE encounter_count > 1
ORDER BY window_start;
