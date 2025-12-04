WITH last_discharge AS (
    SELECT MAX(e.stop) AS last_discharge_at
    FROM encounters e
    WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
    AND e.encounterclass != 'wellness'
)

SELECT *
FROM last_discharge;

WITH last_discharge AS (
    SELECT MAX(e.stop) AS last_discharge_at
    FROM encounters e
    WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
    AND e.encounterclass != 'wellness'
)

SELECT ld.last_discharge_at, p.start, p.stop, p.patient, p. encounter, p.procedure_id, p.reasondescription
FROM procedures p
JOIN encounters e
  ON p.encounter = e.id
CROSS JOIN last_discharge ld
WHERE e.patient = '87d753f1-4bf3-a91c-b069-600089df9e24'
  AND p.stop >= ld.last_discharge_at + INTERVAL '0 days'
--   AND p.stop <  ld.last_discharge_at + INTERVAL '30 days'
  AND e.encounterclass = 'wellness';

