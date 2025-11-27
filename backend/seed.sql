-- Seed data for SG Xpress Shipping Database

-- Insert Users/Employees
INSERT INTO users (id, name, email, password, role, custom_permissions) VALUES
('emp-0', 'Warren Walker', 'warren@sgxpress.com', 'admin123', 'full_control', NULL),
('emp-1', 'Jordan Lee', 'jordan@sgxpress.com', 'pass123', 'full_control', NULL),
('emp-2', 'Nina Patel', 'nina@sgxpress.com', 'pass123', 'editor', NULL),
('emp-3', 'Carlos Martinez', 'carlos@sgxpress.com', 'pass123', 'view_only', NULL),
('emp-4', 'Amara Jones', 'amara@sgxpress.com', 'pass123', 'view_only', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Customers
INSERT INTO customers (id, name, email, phone) VALUES
('C-1201', 'Amelia Brown', 'amelia.brown@email.com', '+1-555-0101'),
('C-1202', 'Elias Carter', 'elias.carter@email.com', '+1-555-0102'),
('C-1203', 'Priya Desai', 'priya.desai@email.com', '+1-555-0103'),
('C-1204', 'Marcus Reed', 'marcus.reed@email.com', '+1-555-0104')
ON CONFLICT (id) DO NOTHING;

-- Insert Packages for Amelia Brown (C-1201)
INSERT INTO packages (package_id, external_package_id, customer_id, tracking_number, status, billing_status, weight, cost, freight_type, description, date_updated, collected, deleted, archived) VALUES
('PKG-1001', NULL, 'C-1201', 'TRK-993240', 'Ready for Pickup', 'Open', 9.3, 128.40, 'Air', 'Audio equipment', CURRENT_DATE, FALSE, FALSE, FALSE),
('PKG-1002', NULL, 'C-1201', 'TRK-993241', 'Processing at Customs', 'Open', 21.6, 312.00, 'Sea', 'Household goods', CURRENT_DATE - INTERVAL '1 day', FALSE, FALSE, FALSE)
ON CONFLICT (package_id) DO NOTHING;

-- Insert note for PKG-1001
INSERT INTO package_notes (package_id, note, created_by) VALUES
('PKG-1001', 'Cleared by billing', 'System')
ON CONFLICT DO NOTHING;

-- Insert Packages for Elias Carter (C-1202)
INSERT INTO packages (package_id, external_package_id, customer_id, tracking_number, status, billing_status, weight, cost, freight_type, description, date_updated, collected, deleted, archived) VALUES
('PKG-2031', NULL, 'C-1202', 'TRK-778340', 'Ready for Pickup', 'Open', 5.3, 78.50, 'Air', 'Clothing samples', CURRENT_DATE - INTERVAL '1 day', FALSE, FALSE, FALSE),
('PKG-2032', NULL, 'C-1202', 'TRK-778341', 'Ready for Pickup', 'Open', 13.9, 156.75, 'Sea', 'Home decor', CURRENT_DATE - INTERVAL '2 days', FALSE, FALSE, FALSE)
ON CONFLICT (package_id) DO NOTHING;

-- Insert note for PKG-2031
INSERT INTO package_notes (package_id, note, created_by) VALUES
('PKG-2031', 'Fragile', 'System')
ON CONFLICT DO NOTHING;

-- Insert Packages for Priya Desai (C-1203)
INSERT INTO packages (package_id, external_package_id, customer_id, tracking_number, status, billing_status, weight, cost, freight_type, description, date_updated, collected, deleted, archived) VALUES
('PKG-3110', NULL, 'C-1203', 'TRK-449990', 'Processing in Office', 'Open', 7.7, 210.00, 'Air', 'Laptop accessories', CURRENT_DATE, FALSE, FALSE, FALSE),
('PKG-3111', NULL, 'C-1203', 'TRK-449991', 'Ready for Pickup', 'Open', 26.4, 520.00, 'Sea', 'Furniture piece', CURRENT_DATE - INTERVAL '1 day', FALSE, FALSE, FALSE)
ON CONFLICT (package_id) DO NOTHING;

-- Insert note for PKG-3110
INSERT INTO package_notes (package_id, note, created_by) VALUES
('PKG-3110', 'Awaiting invoice approval', 'System')
ON CONFLICT DO NOTHING;

-- Insert Packages for Marcus Reed (C-1204)
INSERT INTO packages (package_id, external_package_id, customer_id, tracking_number, status, billing_status, weight, cost, freight_type, description, date_updated, collected, deleted, archived) VALUES
('PKG-4110', NULL, 'C-1204', 'TRK-559001', 'Ready for Pickup', 'Open', 3.1, 25.00, 'Air', 'Documents', CURRENT_DATE - INTERVAL '2 days', FALSE, FALSE, FALSE),
('PKG-4111', NULL, 'C-1204', 'TRK-559002', 'In Transit', 'Open', 33.1, 340.00, 'Sea', 'Gym equipment', CURRENT_DATE - INTERVAL '3 days', FALSE, FALSE, FALSE)
ON CONFLICT (package_id) DO NOTHING;

-- Insert note for PKG-4110
INSERT INTO package_notes (package_id, note, created_by) VALUES
('PKG-4110', 'Handle with care', 'System')
ON CONFLICT DO NOTHING;

-- Insert Sample Orders
INSERT INTO orders (id, date, customer_name, description, cost, status, merchant, method) VALUES
('ORD-1001', CURRENT_DATE, 'Liam Chen', 'Electronics accessories', 240.50, 'Ordered', 'TechSupply', 'Credit Card'),
('ORD-1002', CURRENT_DATE - INTERVAL '1 day', 'Sara Mills', 'Home goods', 180.00, 'Received', 'HomeNest', 'Credit Card')
ON CONFLICT (id) DO NOTHING;
