-- Database Setup Script for PLC Gateway
-- Run this script to create the database and required tables

-- Create database (run as postgres user if database doesn't exist)
-- CREATE DATABASE plc_data;
-- \c plc_data;

-- Create the plc_values table if it doesn't exist
CREATE TABLE IF NOT EXISTS plc_values (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    value TEXT,
    direction VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plc_values_address ON plc_values(address);
CREATE INDEX IF NOT EXISTS idx_plc_values_timestamp ON plc_values(timestamp);
CREATE INDEX IF NOT EXISTS idx_plc_values_address_timestamp ON plc_values(address, timestamp DESC);

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'plc_values'
ORDER BY ordinal_position;

