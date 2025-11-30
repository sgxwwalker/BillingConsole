-- Migration: Add user profile fields
-- Date: 2025-11-29

-- Add phone column to users table
ALTER TABLE users ADD COLUMN phone TEXT;

-- Add job_title column to users table
ALTER TABLE users ADD COLUMN job_title TEXT;

-- Add department column to users table
ALTER TABLE users ADD COLUMN department TEXT;
