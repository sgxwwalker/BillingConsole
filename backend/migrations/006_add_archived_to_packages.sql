-- Migration: Add archived column to packages table

-- Add archived column for package archiving
ALTER TABLE packages ADD COLUMN archived INTEGER DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_packages_archived ON packages(archived);
