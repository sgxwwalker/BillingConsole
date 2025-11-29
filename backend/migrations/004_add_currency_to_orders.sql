-- Migration: Add currency column to orders table

-- Add currency column (JMD or USD)
ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'JMD';

-- Update existing records to have JMD as default
UPDATE orders SET currency = 'JMD' WHERE currency IS NULL;
