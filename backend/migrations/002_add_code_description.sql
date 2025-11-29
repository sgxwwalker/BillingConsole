-- Migration: Add code and description columns to shipment_items

-- Add code column (for courier codes)
ALTER TABLE shipment_items ADD COLUMN code TEXT;

-- Add description column
ALTER TABLE shipment_items ADD COLUMN description TEXT;

-- Create index for code column for faster filtering
CREATE INDEX IF NOT EXISTS idx_shipment_items_code ON shipment_items(code);
