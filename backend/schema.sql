-- SG Xpress Shipping Database Schema
-- PostgreSQL/SQLite compatible schema for shipping dashboard

-- Users/Employees Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    photo TEXT,
    location VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'view_only',
    custom_permissions TEXT, -- JSON string for custom permissions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    tracking_number VARCHAR(100),
    status VARCHAR(100) NOT NULL DEFAULT 'Processing in Office',
    billing_status VARCHAR(50) NOT NULL DEFAULT 'Open',
    weight DECIMAL(10, 2),
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    freight_type VARCHAR(20) DEFAULT 'Air',
    description TEXT,
    date_received DATE,
    date_updated DATE NOT NULL,
    updated_by VARCHAR(255),
    collected BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Package Notes Table
CREATE TABLE IF NOT EXISTS package_notes (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Ordered',
    merchant VARCHAR(255),
    method VARCHAR(50) DEFAULT 'Credit Card',
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection Log Table
CREATE TABLE IF NOT EXISTS collection_logs (
    id SERIAL PRIMARY KEY,
    package_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    user_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(package_id) ON DELETE CASCADE
);

-- API Configuration Table
CREATE TABLE IF NOT EXISTS api_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    base_url TEXT,
    api_key TEXT,
    path VARCHAR(255),
    method VARCHAR(10) DEFAULT 'GET',
    payload TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (id = 1) -- Only one config row
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_billing_status ON packages(billing_status);
CREATE INDEX IF NOT EXISTS idx_packages_date_updated ON packages(date_updated);
CREATE INDEX IF NOT EXISTS idx_packages_deleted ON packages(deleted);
CREATE INDEX IF NOT EXISTS idx_package_notes_package_id ON package_notes(package_id);
CREATE INDEX IF NOT EXISTS idx_collection_logs_date ON collection_logs(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Triggers for updated_at timestamp (PostgreSQL)
-- For SQLite, these would need to be handled in the application layer

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_config_updated_at BEFORE UPDATE ON api_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
