-- SQL script to create the plc_values table in PostgreSQL
-- This table stores PLC data read from the gateway

CREATE TABLE IF NOT EXISTS plc_values (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    value TEXT,
    direction VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create an index on address for faster queries
CREATE INDEX IF NOT EXISTS idx_plc_values_address ON plc_values(address);

-- Create an index on timestamp for faster time-based queries
CREATE INDEX IF NOT EXISTS idx_plc_values_timestamp ON plc_values(timestamp);

-- Optional: Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_plc_values_address_timestamp ON plc_values(address, timestamp DESC);

