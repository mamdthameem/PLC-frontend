-- SQL queries to view stored PLC data

-- View all PLC values (latest first)
SELECT 
    id,
    address,
    value,
    direction,
    timestamp
FROM plc_values
ORDER BY timestamp DESC
LIMIT 100;

-- View data for a specific address (e.g., "DB1.DBW0")
SELECT 
    id,
    address,
    value,
    direction,
    timestamp
FROM plc_values
WHERE address = 'DB1.DBW0'
ORDER BY timestamp DESC
LIMIT 50;

-- View latest value for each address
SELECT DISTINCT ON (address)
    address,
    value,
    direction,
    timestamp
FROM plc_values
ORDER BY address, timestamp DESC;

-- Count records per address
SELECT 
    address,
    COUNT(*) as record_count,
    MIN(timestamp) as first_record,
    MAX(timestamp) as last_record
FROM plc_values
GROUP BY address
ORDER BY address;

-- View data from the last hour
SELECT 
    address,
    value,
    direction,
    timestamp
FROM plc_values
WHERE timestamp >= NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

