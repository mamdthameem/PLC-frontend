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

-- Master auth tables (used by PlcApi AuthController)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    connection_string TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user',
    tenant_id VARCHAR(100) NULL,
    subscription_status VARCHAR(30) NOT NULL DEFAULT 'active',
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    valid_until_utc TIMESTAMP NULL,
    created_at_utc TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- Seed base tenant
INSERT INTO tenants (id, name, connection_string)
VALUES ('customer-1', 'Default Customer', '')
ON CONFLICT (id) DO NOTHING;

-- Seed default login users
-- admin / admin123
INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, subscription_status, is_approved)
VALUES (
    'admin',
    'admin@plc.local',
    'System Admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'admin',
    'all',
    'active',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- user1 / user123
INSERT INTO users (username, email, full_name, password_hash, role, tenant_id, subscription_status, is_approved, valid_until_utc)
VALUES (
    'user1',
    'user1@plc.local',
    'Default User',
    'e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446',
    'user',
    'customer-1',
    'active',
    TRUE,
    NOW() + INTERVAL '30 days'
)
ON CONFLICT (username) DO NOTHING;

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'plc_values'
ORDER BY ordinal_position;

