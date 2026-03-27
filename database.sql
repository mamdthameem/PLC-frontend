CREATE TABLE IF NOT EXISTS public.plc_values (
    id BIGSERIAL PRIMARY KEY,
    address VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    direction VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO plc_values (address, value, direction)
VALUES
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
('last_refill_time', NOW(), 'Read'),
('maintenance_popup', 'FALSE', 'Read'),
('motor_amps', '18.6', 'Read'),
('consumable_spare_life', '120', 'Write'),
('rework_flag', 'FALSE', 'Read');
ALTER USER postgres WITH PASSWORD 'sridhar@2006'
