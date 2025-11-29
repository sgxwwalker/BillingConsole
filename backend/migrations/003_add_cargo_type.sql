-- Migration: Add cargo_type column to shipment_logs

-- Add cargo_type column (for Air Cargo, Ocean Cargo, China Cargo)
ALTER TABLE shipment_logs ADD COLUMN cargo_type TEXT DEFAULT 'Air Cargo';
