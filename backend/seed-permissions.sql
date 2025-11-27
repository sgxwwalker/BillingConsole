-- Seed Roles and Permissions
-- This file seeds the initial roles and permissions for the system

-- Insert System Permissions
INSERT INTO permissions (name, description, category) VALUES
-- Dashboard Permissions
('view_dashboard', 'View the main dashboard', 'Dashboard'),
('view_statistics', 'View statistics and analytics', 'Dashboard'),

-- Billing Permissions
('view_billing', 'View billing information', 'Billing'),
('manage_billing', 'Manage billing and payment records', 'Billing'),
('collect_payments', 'Collect payments from customers', 'Billing'),
('view_collection_logs', 'View collection logs', 'Billing'),

-- Orders Permissions
('view_orders', 'View orders', 'Orders'),
('manage_orders', 'Create, update, and delete orders', 'Orders'),
('approve_orders', 'Approve pending orders', 'Orders'),

-- Packages Permissions
('view_packages', 'View package information', 'Packages'),
('manage_packages', 'Create, update, and delete packages', 'Packages'),
('scan_packages', 'Scan packages in shipment bin', 'Packages'),
('mark_packages_collected', 'Mark packages as collected', 'Packages'),

-- Customers Permissions
('view_customers', 'View customer information', 'Customers'),
('manage_customers', 'Create, update, and delete customers', 'Customers'),

-- Shipment Permissions
('view_shipments', 'View shipment logs', 'Shipments'),
('manage_shipments', 'Upload and manage shipment logs', 'Shipments'),
('edit_shipment_items', 'Edit shipment items', 'Shipments'),

-- User Management Permissions
('view_users', 'View user list', 'Users'),
('manage_users', 'Create, update, and delete users', 'Users'),
('activate_users', 'Activate or deactivate users', 'Users'),
('reset_passwords', 'Reset user passwords', 'Users'),

-- Role Management Permissions
('view_roles', 'View roles', 'Roles'),
('manage_roles', 'Create, update, and delete roles', 'Roles'),
('assign_permissions', 'Assign permissions to roles', 'Roles'),

-- Settings Permissions
('view_settings', 'View system settings', 'Settings'),
('manage_settings', 'Manage system settings', 'Settings'),
('manage_api_config', 'Manage external API configuration', 'Settings'),
('toggle_maintenance_mode', 'Enable/disable maintenance mode', 'Settings'),

-- Reports Permissions
('view_reports', 'View reports', 'Reports'),
('export_reports', 'Export reports to CSV/Excel', 'Reports'),

-- Admin Panel Permission
('access_admin_panel', 'Access admin and settings panel', 'Admin')
ON CONFLICT (name) DO NOTHING;

-- Insert System Roles
INSERT INTO roles (name, description, is_system) VALUES
('full_control', 'Full system access with all permissions', 1),
('editor', 'Can manage packages, orders, and billing', 1),
('view_only', 'Read-only access to view data', 1),
('custom', 'Custom role with specific permissions', 0)
ON CONFLICT (name) DO NOTHING;

-- Assign Permissions to full_control role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'full_control'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign Permissions to editor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'editor'
AND p.name IN (
    'view_dashboard',
    'view_statistics',
    'view_billing',
    'manage_billing',
    'collect_payments',
    'view_collection_logs',
    'view_orders',
    'manage_orders',
    'view_packages',
    'manage_packages',
    'scan_packages',
    'mark_packages_collected',
    'view_customers',
    'manage_customers',
    'view_shipments',
    'manage_shipments',
    'edit_shipment_items',
    'view_reports'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign Permissions to view_only role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'view_only'
AND p.name IN (
    'view_dashboard',
    'view_statistics',
    'view_billing',
    'view_orders',
    'view_packages',
    'view_customers',
    'view_shipments',
    'view_reports'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Update existing users to link to the new role_id
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role)
WHERE role_id IS NULL;
