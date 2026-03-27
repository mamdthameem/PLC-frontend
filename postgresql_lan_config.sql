-- PostgreSQL Configuration SQL Commands
-- Run these on Laptop A (Database Server) after updating postgresql.conf and pg_hba.conf

-- Verify listen_addresses setting
SHOW listen_addresses;
-- Should return: *

-- Verify database exists
SELECT datname FROM pg_database WHERE datname = 'plc_data';

-- Create database if it doesn't exist
CREATE DATABASE plc_data;

-- Connect to plc_data database
\c plc_data

-- Verify table exists
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'plc_values';

-- Check current connections
SELECT datname, usename, client_addr, state 
FROM pg_stat_activity 
WHERE datname = 'plc_data';

-- Verify pg_hba.conf settings (requires superuser)
SELECT * FROM pg_hba_file_rules WHERE address = '172.20.20.0/24';
