-- SG Xpress Shipping Database Schema (SQLite)

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Users/Employees Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    photo TEXT,
    location TEXT,
    role TEXT NOT NULL DEFAULT 'view_only',
    role_id INTEGER,
    custom_permissions TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT UNIQUE NOT NULL,
    external_package_id TEXT,
    customer_id TEXT NOT NULL,
    tracking_number TEXT,
    status TEXT NOT NULL DEFAULT 'Processing in Office',
    billing_status TEXT NOT NULL DEFAULT 'Open',
    weight REAL,
    cost REAL NOT NULL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    payment_method TEXT,
    freight_type TEXT DEFAULT 'Air',
    description TEXT,
    date_received DATE,
    date_updated DATE NOT NULL,
    updated_by TEXT,
    collected INTEGER DEFAULT 0,
    deleted INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Package Notes Table
CREATE TABLE IF NOT EXISTS package_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    customer_name TEXT NOT NULL,
    description TEXT,
    cost REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Ordered',
    merchant TEXT,
    method TEXT DEFAULT 'Credit Card',
    updated_by TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- Collection Log Table
CREATE TABLE IF NOT EXISTS collection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    package_id TEXT NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    user_name TEXT,
    note TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE
);

-- API Configuration Table
CREATE TABLE IF NOT EXISTS api_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    base_url TEXT,
    api_key TEXT,
    email TEXT,
    password TEXT,
    timeout INTEGER DEFAULT 30000,
    environment TEXT DEFAULT 'production',
    maintenance_mode INTEGER DEFAULT 0,
    last_sync_at DATETIME,
    last_sync_status TEXT,
    path TEXT,
    method TEXT DEFAULT 'GET',
    payload TEXT,
    updated_at DATETIME DEFAULT (datetime('now'))
);

-- API Sync Logs Table
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

-- Shipment Logs Table (uploaded Google Sheets)
CREATE TABLE IF NOT EXISTS shipment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_name TEXT NOT NULL,
    shipment_date DATE NOT NULL,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

-- Shipment Items Table (items from uploaded sheets)
CREATE TABLE IF NOT EXISTS shipment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_log_id INTEGER NOT NULL,
    package_id TEXT,
    customer_name TEXT NOT NULL,
    alt_name TEXT,
    tracking_number TEXT NOT NULL,
    weight REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    scanned_at DATETIME,
    scanned_by TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_log_id) REFERENCES shipment_logs(id) ON DELETE CASCADE
);

-- Not Found Scans Table (tracking numbers scanned but not found)
CREATE TABLE IF NOT EXISTS not_found_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipment_log_id INTEGER NOT NULL,
    tracking_number TEXT NOT NULL,
    scanned_by TEXT,
    scanned_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (shipment_log_id) REFERENCES shipment_logs(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_billing_status ON packages(billing_status);
CREATE INDEX IF NOT EXISTS idx_packages_date_updated ON packages(date_updated);
CREATE INDEX IF NOT EXISTS idx_packages_deleted ON packages(deleted);
CREATE INDEX IF NOT EXISTS idx_packages_archived ON packages(archived);
CREATE INDEX IF NOT EXISTS idx_packages_external_id ON packages(external_package_id);
CREATE INDEX IF NOT EXISTS idx_packages_tracking ON packages(tracking_number);
CREATE INDEX IF NOT EXISTS idx_package_notes_package_id ON package_notes(package_id);
CREATE INDEX IF NOT EXISTS idx_collection_logs_date ON collection_logs(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_shipment_items_tracking ON shipment_items(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_items_status ON shipment_items(status);
CREATE INDEX IF NOT EXISTS idx_shipment_logs_date ON shipment_logs(shipment_date);
CREATE INDEX IF NOT EXISTS idx_not_found_scans_log ON not_found_scans(shipment_log_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
