import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const dbPath = join(__dirname, 'shipping.db');
const db = new Database(dbPath, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDatabase() {
  try {
    // Read and execute schema
    const schemaSQL = readFileSync(join(__dirname, 'schema-sqlite.sql'), 'utf8');

    // Execute schema directly (already SQLite compatible)
    db.exec(schemaSQL);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Seed database with initial data
export function seedDatabase() {
  try {
    // Check if already seeded
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count > 0) {
      console.log('ℹ️  Database already seeded');

      // Seed permissions even if users exist (for upgrades)
      seedPermissions();
      return;
    }

    const seedSQL = readFileSync(join(__dirname, 'seed.sql'), 'utf8');

    // Convert PostgreSQL syntax to SQLite
    let sqliteSQL = seedSQL
      .replace(/ON CONFLICT \([^)]+\) DO NOTHING/g, 'ON CONFLICT DO NOTHING')
      .replace(/INTERVAL '\d+ day'/g, "'-1 day'")
      .replace(/CURRENT_DATE - INTERVAL '[^']+'/g, "date('now', '-1 day')")
      .replace(/CURRENT_DATE/g, "date('now')");

    try {
      db.exec(sqliteSQL);
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint failed')) {
        console.error('Error executing seed:', err.message);
      }
    }

    console.log('✅ Database seeded with initial data');

    // Seed permissions and roles
    seedPermissions();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

// Seed permissions and roles
function seedPermissions() {
  try {
    // Check if permissions already seeded
    const permCount = db.prepare('SELECT COUNT(*) as count FROM permissions').get();
    if (permCount.count > 0) {
      console.log('ℹ️  Permissions already seeded');
      return;
    }

    const permissionsSeedSQL = readFileSync(join(__dirname, 'seed-permissions.sql'), 'utf8');

    // Convert PostgreSQL syntax to SQLite
    let sqliteSQL = permissionsSeedSQL
      .replace(/ON CONFLICT \([^)]+\) DO NOTHING/g, 'ON CONFLICT DO NOTHING');

    try {
      db.exec(sqliteSQL);
    } catch (err) {
      if (!err.message.includes('UNIQUE constraint failed')) {
        console.error('Error executing permissions seed:', err.message);
      }
    }

    console.log('✅ Permissions and roles seeded');
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
  }
}

// User queries
export const userQueries = {
  getAll: () => db.prepare('SELECT * FROM users ORDER BY name').all(),

  getById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),

  getByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),

  create: (user) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password, photo, location, role, custom_permissions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      user.id,
      user.name,
      user.email,
      user.password,
      user.photo || '',
      user.location || '',
      user.role || 'view_only',
      user.customPermissions ? JSON.stringify(user.customPermissions) : null
    );
  },

  update: (id, user) => {
    const stmt = db.prepare(`
      UPDATE users
      SET name = ?, email = ?, photo = ?, location = ?, role = ?, custom_permissions = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(
      user.name,
      user.email,
      user.photo || '',
      user.location || '',
      user.role,
      user.customPermissions ? JSON.stringify(user.customPermissions) : null,
      id
    );
  },

  updatePassword: (id, password) => {
    const stmt = db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?');
    return stmt.run(password, id);
  },

  activate: (id) => {
    const stmt = db.prepare('UPDATE users SET active = 1, updated_at = datetime(\'now\') WHERE id = ?');
    return stmt.run(id);
  },

  deactivate: (id) => {
    const stmt = db.prepare('UPDATE users SET active = 0, updated_at = datetime(\'now\') WHERE id = ?');
    return stmt.run(id);
  },

  delete: (id) => db.prepare('DELETE FROM users WHERE id = ?').run(id),
};

// Customer queries
export const customerQueries = {
  getAll: () => db.prepare('SELECT * FROM customers ORDER BY name').all(),

  getById: (id) => db.prepare('SELECT * FROM customers WHERE id = ?').get(id),

  create: (customer) => {
    const stmt = db.prepare(`
      INSERT INTO customers (id, name, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(customer.id, customer.name, customer.email, customer.phone, customer.address);
  },

  update: (id, customer) => {
    const stmt = db.prepare(`
      UPDATE customers
      SET name = ?, email = ?, phone = ?, address = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(customer.name, customer.email, customer.phone, customer.address, id);
  },

  delete: (id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id),
};

// Package queries
export const packageQueries = {
  getAll: () => db.prepare('SELECT * FROM packages WHERE deleted = 0 AND archived = 0 ORDER BY date_updated DESC').all(),

  getByCustomerId: (customerId) =>
    db.prepare('SELECT * FROM packages WHERE customer_id = ? AND deleted = 0 AND archived = 0 ORDER BY date_updated DESC').all(customerId),

  getById: (packageId) => db.prepare('SELECT * FROM packages WHERE package_id = ?').get(packageId),

  getReadyPackages: () =>
    db.prepare('SELECT * FROM packages WHERE status = ? AND deleted = 0 AND collected = 0').all('Ready for Pickup'),

  getAllIncludingArchived: () =>
    db.prepare('SELECT * FROM packages WHERE deleted = 0 ORDER BY date_updated DESC').all(),

  getByExternalId: (externalId) =>
    db.prepare('SELECT * FROM packages WHERE external_package_id = ?').get(externalId),

  create: (pkg) => {
    const stmt = db.prepare(`
      INSERT INTO packages (
        package_id, external_package_id, customer_id, tracking_number, status, billing_status,
        weight, cost, amount_paid, payment_method, freight_type, description, date_received,
        date_updated, updated_by, collected, deleted, archived,
        alt_name, reason, seller, length, width, height, cubic_feet, location,
        invoice_url, package_image_url, pre_alert, email_sent, paid, warehouse_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      pkg.packageId,
      pkg.externalPackageId || null,
      pkg.customerId,
      pkg.trackingNumber,
      pkg.status,
      pkg.billingStatus || 'Open',
      pkg.weight,
      pkg.cost,
      pkg.amountPaid || 0,
      pkg.paymentMethod || '',
      pkg.freightType || 'Air',
      pkg.description,
      pkg.dateReceived || null,
      pkg.dateUpdated || new Date().toISOString().split('T')[0],
      pkg.updatedBy || '',
      pkg.collected ? 1 : 0,
      pkg.deleted ? 1 : 0,
      pkg.archived ? 1 : 0,
      pkg.altName || null,
      pkg.reason || null,
      pkg.seller || null,
      pkg.length || 0,
      pkg.width || 0,
      pkg.height || 0,
      pkg.cubicFeet || 0,
      pkg.location || null,
      pkg.invoiceUrl || null,
      pkg.packageImageUrl || null,
      pkg.preAlert ? 1 : 0,
      pkg.emailSent ? 1 : 0,
      pkg.paid ? 1 : 0,
      pkg.warehouseDate || null
    );
  },

  update: (packageId, pkg) => {
    const stmt = db.prepare(`
      UPDATE packages
      SET tracking_number = ?, status = ?, billing_status = ?, weight = ?, cost = ?,
          amount_paid = ?, payment_method = ?, freight_type = ?, description = ?,
          date_updated = ?, updated_by = ?, collected = ?,
          alt_name = ?, reason = ?, seller = ?, length = ?, width = ?, height = ?,
          cubic_feet = ?, location = ?, invoice_url = ?, package_image_url = ?,
          pre_alert = ?, email_sent = ?, paid = ?, warehouse_date = ?, archived = ?
      WHERE package_id = ?
    `);
    return stmt.run(
      pkg.trackingNumber,
      pkg.status,
      pkg.billingStatus,
      pkg.weight,
      pkg.cost,
      pkg.amountPaid,
      pkg.paymentMethod,
      pkg.freightType,
      pkg.description,
      pkg.dateUpdated,
      pkg.updatedBy,
      pkg.collected ? 1 : 0,
      pkg.altName || null,
      pkg.reason || null,
      pkg.seller || null,
      pkg.length || 0,
      pkg.width || 0,
      pkg.height || 0,
      pkg.cubicFeet || 0,
      pkg.location || null,
      pkg.invoiceUrl || null,
      pkg.packageImageUrl || null,
      pkg.preAlert ? 1 : 0,
      pkg.emailSent ? 1 : 0,
      pkg.paid ? 1 : 0,
      pkg.warehouseDate || null,
      pkg.archived ? 1 : 0,
      packageId
    );
  },

  markCollected: (packageId, data) => {
    const stmt = db.prepare(`
      UPDATE packages
      SET collected = 1, status = 'Delivered', archived = 1, payment_method = ?, amount_paid = ?,
          billing_status = ?, updated_by = ?, date_updated = date('now')
      WHERE package_id = ?
    `);
    return stmt.run(data.paymentMethod, data.amountPaid, data.billingStatus, data.updatedBy, packageId);
  },

  softDelete: (packageId, updatedBy) => {
    const stmt = db.prepare('UPDATE packages SET deleted = 1, updated_by = ? WHERE package_id = ?');
    return stmt.run(updatedBy, packageId);
  },

  delete: (packageId) => db.prepare('DELETE FROM packages WHERE package_id = ?').run(packageId),
};

// Package notes queries
export const packageNoteQueries = {
  getByPackageId: (packageId) =>
    db.prepare('SELECT * FROM package_notes WHERE package_id = ? ORDER BY created_at ASC').all(packageId),

  create: (note) => {
    const stmt = db.prepare(`
      INSERT INTO package_notes (package_id, note, created_by)
      VALUES (?, ?, ?)
    `);
    return stmt.run(note.packageId, note.note, note.createdBy);
  },
};

// Order queries
export const orderQueries = {
  getAll: () => db.prepare('SELECT * FROM orders ORDER BY date DESC').all(),

  getById: (id) => db.prepare('SELECT * FROM orders WHERE id = ?').get(id),

  create: (order) => {
    const stmt = db.prepare(`
      INSERT INTO orders (id, date, customer_name, description, cost, status, merchant, method, currency, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      order.id,
      order.date,
      order.customerName,
      order.description,
      order.cost,
      order.status,
      order.merchant,
      order.method,
      order.currency || 'JMD',
      order.updatedBy
    );
  },

  update: (id, order) => {
    const stmt = db.prepare(`
      UPDATE orders
      SET date = ?, customer_name = ?, description = ?, cost = ?, status = ?,
          merchant = ?, method = ?, currency = ?, updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(
      order.date,
      order.customerName,
      order.description,
      order.cost,
      order.status,
      order.merchant,
      order.method,
      order.currency || 'JMD',
      order.updatedBy,
      id
    );
  },

  delete: (id) => db.prepare('DELETE FROM orders WHERE id = ?').run(id),
};

// Collection log queries
export const collectionLogQueries = {
  getAll: () => db.prepare('SELECT * FROM collection_logs ORDER BY date DESC').all(),

  getByDate: (date) => db.prepare('SELECT * FROM collection_logs WHERE date = ?').all(date),

  create: (log) => {
    const stmt = db.prepare(`
      INSERT INTO collection_logs (package_id, date, amount, method, user_name, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(log.packageId, log.date, log.amount, log.method, log.userName, log.note);
  },
};

// Shipment log queries
export const shipmentLogQueries = {
  getAll: () => db.prepare('SELECT * FROM shipment_logs ORDER BY shipment_date DESC').all(),

  getById: (id) => db.prepare('SELECT * FROM shipment_logs WHERE id = ?').get(id),

  getByDate: (date) => db.prepare('SELECT * FROM shipment_logs WHERE shipment_date = ?').all(date),

  create: (log) => {
    const stmt = db.prepare(`
      INSERT INTO shipment_logs (log_name, shipment_date, cargo_type, uploaded_by)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(log.logName, log.shipmentDate, log.cargoType || 'Air Cargo', log.uploadedBy);
  },

  delete: (id) => db.prepare('DELETE FROM shipment_logs WHERE id = ?').run(id),
};

// Shipment item queries
export const shipmentItemQueries = {
  getAll: () => db.prepare('SELECT * FROM shipment_items ORDER BY created_at DESC').all(),

  getByLogId: (logId) => db.prepare('SELECT * FROM shipment_items WHERE shipment_log_id = ? ORDER BY customer_name').all(logId),

  getByTracking: (tracking) => db.prepare('SELECT * FROM shipment_items WHERE tracking_number = ? ORDER BY created_at DESC').all(tracking),

  getPending: (logId) => db.prepare('SELECT * FROM shipment_items WHERE shipment_log_id = ? AND status = ? ORDER BY customer_name').all(logId, 'pending'),

  getReceived: (logId) => db.prepare('SELECT * FROM shipment_items WHERE shipment_log_id = ? AND status = ? ORDER BY scanned_at DESC').all(logId, 'received'),

  create: (item) => {
    const stmt = db.prepare(`
      INSERT INTO shipment_items (shipment_log_id, package_id, code, customer_name, alt_name, tracking_number, weight, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      item.shipmentLogId,
      item.packageId || null,
      item.code || null,
      item.customerName,
      item.altName || null,
      item.trackingNumber,
      item.weight || null,
      item.description || null,
      item.status || 'pending'
    );
  },

  markReceived: (id, scannedBy) => {
    const stmt = db.prepare(`
      UPDATE shipment_items
      SET status = 'received', scanned_at = datetime('now'), scanned_by = ?
      WHERE id = ?
    `);
    return stmt.run(scannedBy, id);
  },

  moveToLog: (id, newLogId) => {
    const stmt = db.prepare(`
      UPDATE shipment_items
      SET shipment_log_id = ?, status = 'pending', scanned_at = NULL, scanned_by = NULL
      WHERE id = ?
    `);
    return stmt.run(newLogId, id);
  },

  delete: (id) => db.prepare('DELETE FROM shipment_items WHERE id = ?').run(id),
};

// Not found scans queries
export const notFoundScanQueries = {
  getAll: () => db.prepare('SELECT * FROM not_found_scans ORDER BY scanned_at DESC').all(),

  getByLogId: (logId) => db.prepare('SELECT * FROM not_found_scans WHERE shipment_log_id = ? ORDER BY scanned_at DESC').all(logId),

  countByLogId: (logId) => {
    const result = db.prepare('SELECT COUNT(*) as count FROM not_found_scans WHERE shipment_log_id = ?').get(logId);
    return result.count;
  },

  create: (scan) => {
    const stmt = db.prepare(`
      INSERT INTO not_found_scans (shipment_log_id, tracking_number, scanned_by)
      VALUES (?, ?, ?)
    `);
    return stmt.run(scan.shipmentLogId, scan.trackingNumber, scan.scannedBy);
  },

  delete: (id) => db.prepare('DELETE FROM not_found_scans WHERE id = ?').run(id),
};

// Roles queries
export const roleQueries = {
  getAll: () => db.prepare('SELECT * FROM roles ORDER BY name').all(),

  getById: (id) => db.prepare('SELECT * FROM roles WHERE id = ?').get(id),

  getByName: (name) => db.prepare('SELECT * FROM roles WHERE name = ?').get(name),

  create: (role) => {
    const stmt = db.prepare(`
      INSERT INTO roles (name, description, is_system)
      VALUES (?, ?, ?)
    `);
    return stmt.run(role.name, role.description || null, role.isSystem ? 1 : 0);
  },

  update: (id, role) => {
    const stmt = db.prepare(`
      UPDATE roles
      SET name = ?, description = ?, updated_at = datetime('now')
      WHERE id = ? AND is_system = 0
    `);
    return stmt.run(role.name, role.description || null, id);
  },

  delete: (id) => db.prepare('DELETE FROM roles WHERE id = ? AND is_system = 0').run(id),

  duplicate: (id, newName) => {
    const stmt = db.prepare(`
      INSERT INTO roles (name, description, is_system)
      SELECT ?, description, 0
      FROM roles WHERE id = ?
    `);
    return stmt.run(newName, id);
  },
};

// Permissions queries
export const permissionQueries = {
  getAll: () => db.prepare('SELECT * FROM permissions ORDER BY category, name').all(),

  getById: (id) => db.prepare('SELECT * FROM permissions WHERE id = ?').get(id),

  getByRoleId: (roleId) => {
    const stmt = db.prepare(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.category, p.name
    `);
    return stmt.all(roleId);
  },
};

// Role permissions queries
export const rolePermissionQueries = {
  getByRoleId: (roleId) => db.prepare('SELECT * FROM role_permissions WHERE role_id = ?').all(roleId),

  assignPermissions: (roleId, permissionIds) => {
    // First, clear existing permissions for this role
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);

    // Then, insert new permissions
    const stmt = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    const insertMany = db.transaction((roleId, permissionIds) => {
      for (const permissionId of permissionIds) {
        stmt.run(roleId, permissionId);
      }
    });
    insertMany(roleId, permissionIds);
  },

  removePermission: (roleId, permissionId) => {
    const stmt = db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?');
    return stmt.run(roleId, permissionId);
  },
};

// API config queries
export const apiConfigQueries = {
  get: () => db.prepare('SELECT * FROM api_config WHERE id = 1').get(),

  upsert: (config) => {
    const stmt = db.prepare(`
      INSERT INTO api_config (
        id, base_url, api_key, email, password, user_id, timeout, environment,
        maintenance_mode, updated_at
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        base_url = excluded.base_url,
        api_key = excluded.api_key,
        email = excluded.email,
        password = excluded.password,
        user_id = excluded.user_id,
        timeout = excluded.timeout,
        environment = excluded.environment,
        maintenance_mode = excluded.maintenance_mode,
        updated_at = datetime('now')
    `);
    return stmt.run(
      config.baseUrl || null,
      config.apiKey || null,
      config.email || null,
      config.password || null,
      config.userId || null,
      config.timeout || 30000,
      config.environment || 'production',
      config.maintenanceMode ? 1 : 0
    );
  },

  updateSyncStatus: (status, message) => {
    const stmt = db.prepare(`
      UPDATE api_config
      SET last_sync_at = datetime('now'),
          last_sync_status = ?,
          updated_at = datetime('now')
      WHERE id = 1
    `);
    return stmt.run(status);
  },

  toggleMaintenanceMode: (enabled) => {
    const stmt = db.prepare(`
      UPDATE api_config
      SET maintenance_mode = ?, updated_at = datetime('now')
      WHERE id = 1
    `);
    return stmt.run(enabled ? 1 : 0);
  },
};

// API sync logs queries
export const apiSyncLogQueries = {
  getAll: (limit = 10) => db.prepare('SELECT * FROM api_sync_logs ORDER BY created_at DESC LIMIT ?').all(limit),

  create: (log) => {
    const stmt = db.prepare(`
      INSERT INTO api_sync_logs (status, message, synced_by, records_created, records_updated, errors)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      log.status,
      log.message || null,
      log.syncedBy || null,
      log.recordsCreated || 0,
      log.recordsUpdated || 0,
      log.errors || 0
    );
  },
};

export default db;
