SELECT
    e.id AS encounter_id,
    e.start AS encounter_start,
    e.stop AS encounter_end,
    e.encounterclass,
    o.id AS organization_id,
    o.name AS organization_name,
    o.address,
    o.city,
    o.state
FROM encounters e
JOIN organizations o
    ON e.organization = o.id
WHERE e.patient = 'd0e55282-7306-c3db-8f3b-c1aae2762227'
ORDER BY e.start;

