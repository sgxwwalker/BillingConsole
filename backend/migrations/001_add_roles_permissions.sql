-- Migration: Add roles, permissions, and updated schema

-- Add new columns to users table
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1;

-- Add new columns to packages table
ALTER TABLE packages ADD COLUMN archived INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN external_package_id TEXT;

-- Add new columns to api_config table
ALTER TABLE api_config ADD COLUMN email TEXT;
ALTER TABLE api_config ADD COLUMN password TEXT;
ALTER TABLE api_config ADD COLUMN timeout INTEGER DEFAULT 30000;
ALTER TABLE api_config ADD COLUMN environment TEXT DEFAULT 'production';
ALTER TABLE api_config ADD COLUMN maintenance_mode INTEGER DEFAULT 0;
ALTER TABLE api_config ADD COLUMN last_sync_at DATETIME;
ALTER TABLE api_config ADD COLUMN last_sync_status TEXT;

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Create api_sync_logs table
CREATE TABLE IF NOT EXISTS api_sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL,
    message TEXT,
    synced_by TEXT,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_packages_archived ON packages(archived);
CREATE INDEX IF NOT EXISTS idx_packages_external_id ON packages(external_package_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
