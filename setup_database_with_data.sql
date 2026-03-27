-- Setup database with your actual table structure and sample data
-- Based on your database.sql file

-- Create table with your exact structure
CREATE TABLE IF NOT EXISTS public.plc_values (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plc_values_address ON plc_values(address);
CREATE INDEX IF NOT EXISTS idx_plc_values_timestamp ON plc_values(timestamp);
CREATE INDEX IF NOT EXISTS idx_plc_values_address_timestamp ON plc_values(address, timestamp DESC);

-- Insert sample data (only if table is empty)
INSERT INTO plc_values (address, value, direction)
SELECT * FROM (VALUES
    ('machine_status', 'TRUE', 'Read'),
    ('machine_utility', '82.5', 'Read'),
    ('production_quantity', '1250', 'Read'),
    ('energy_consumption', '48.7', 'Read'),
    ('energy_per_casting', '0.92', 'Read'),
    ('total_blast_time', '3600', 'Read'),
    ('effective_shots_usage', '0.88', 'Read'),
    ('avg_shot_refill_time', '15', 'Read'),
    ('chamber_utilisation_p2', '75.4', 'Read'),
    ('cycle_count', '245', 'Read'),
    ('last_refill_time', NOW()::text, 'Read'),
    ('maintenance_popup', 'FALSE', 'Read'),
    ('motor_amps', '18.6', 'Read'),
    ('consumable_spare_life', '120', 'Write'),
    ('rework_flag', 'FALSE', 'Read')
) AS v(address, value, direction)
WHERE NOT EXISTS (SELECT 1 FROM plc_values WHERE plc_values.address = v.address AND plc_values.direction = v.direction);

-- Verify data
SELECT COUNT(*) as total_records FROM plc_values;
SELECT address, value, direction, timestamp FROM plc_values ORDER BY timestamp DESC LIMIT 15;
