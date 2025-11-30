-- Migration: Add default_permissions column to store role permission settings
-- Date: 2025-11-30

-- Create role_settings table to store default permissions for each role type
CREATE TABLE IF NOT EXISTS role_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Insert default role settings
INSERT OR IGNORE INTO role_settings (role_name, display_name, permissions) VALUES
('full_control', 'Administrator', '{"packageManagement":{"read":true,"write":true,"create":true},"customerManagement":{"read":true,"write":true,"create":true},"orderManagement":{"read":true,"write":true,"create":true},"collectionManagement":{"read":true,"write":true,"create":true},"shipmentBinManagement":{"read":true,"write":true,"create":true},"dashboardReporting":{"read":true,"write":true,"create":true},"apiConfiguration":{"read":true,"write":true,"create":true},"settingsManagement":{"read":true,"write":true,"create":true},"userManagement":{"read":true,"write":true,"create":true}}'),
('editor', 'Manager', '{"packageManagement":{"read":true,"write":true,"create":true},"customerManagement":{"read":true,"write":true,"create":true},"orderManagement":{"read":true,"write":true,"create":true},"collectionManagement":{"read":true,"write":true,"create":true},"shipmentBinManagement":{"read":true,"write":true,"create":true},"dashboardReporting":{"read":true,"write":true,"create":true},"apiConfiguration":{"read":true,"write":false,"create":false},"settingsManagement":{"read":true,"write":false,"create":false},"userManagement":{"read":true,"write":true,"create":true}}'),
('view_only', 'Users', '{"packageManagement":{"read":true,"write":true,"create":false},"customerManagement":{"read":true,"write":true,"create":false},"orderManagement":{"read":true,"write":false,"create":false},"collectionManagement":{"read":true,"write":false,"create":false},"shipmentBinManagement":{"read":true,"write":false,"create":false},"dashboardReporting":{"read":true,"write":false,"create":false},"apiConfiguration":{"read":true,"write":false,"create":false},"settingsManagement":{"read":true,"write":false,"create":false},"userManagement":{"read":true,"write":false,"create":false}}');
