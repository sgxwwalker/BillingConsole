-- Migration: Add Courier Depot API fields to packages table
-- This migration adds fields returned by Courier Depot API that were missing in the local schema

-- Alternative customer name
ALTER TABLE packages ADD COLUMN alt_name TEXT;

-- Reason/notes field
ALTER TABLE packages ADD COLUMN reason TEXT;

-- Seller information
ALTER TABLE packages ADD COLUMN seller TEXT;

-- Package dimensions
ALTER TABLE packages ADD COLUMN length REAL DEFAULT 0;
ALTER TABLE packages ADD COLUMN width REAL DEFAULT 0;
ALTER TABLE packages ADD COLUMN height REAL DEFAULT 0;
ALTER TABLE packages ADD COLUMN cubic_feet REAL DEFAULT 0;

-- Location tracking
ALTER TABLE packages ADD COLUMN location TEXT;

-- Document URLs
ALTER TABLE packages ADD COLUMN invoice_url TEXT;
ALTER TABLE packages ADD COLUMN package_image_url TEXT;

-- Status flags
ALTER TABLE packages ADD COLUMN pre_alert INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN email_sent INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN paid INTEGER DEFAULT 0;

-- Warehouse date
ALTER TABLE packages ADD COLUMN warehouse_date DATE;

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_packages_location ON packages(location);
CREATE INDEX IF NOT EXISTS idx_packages_paid ON packages(paid);
CREATE INDEX IF NOT EXISTS idx_packages_warehouse_date ON packages(warehouse_date);
CREATE INDEX IF NOT EXISTS idx_packages_pre_alert ON packages(pre_alert);
