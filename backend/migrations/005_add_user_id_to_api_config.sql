-- Migration: Add user_id column to api_config table

-- Add user_id column for Courier Depot API integration
ALTER TABLE api_config ADD COLUMN user_id TEXT;

-- Set default value for existing records
UPDATE api_config SET user_id = '970' WHERE id = 1;
