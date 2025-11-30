import db from './database.js';

/**
 * Run all database migrations
 */
export function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Add billing columns to shipment_items table (Migration 001)
    addBillingColumnsToShipmentItems();

    // Add currency column to orders table (Migration 002)
    addCurrencyColumnToOrders();

    // Add user profile columns (Migration 003)
    addUserProfileColumns();

    // Add role settings table (Migration 004)
    addRoleSettingsTable();

    console.log('All migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

/**
 * Migration 001: Add billing columns to shipment_items table
 */
function addBillingColumnsToShipmentItems() {
  try {
    // Check if billing columns already exist
    const tableInfo = db.prepare("PRAGMA table_info(shipment_items)").all();
    const columnNames = tableInfo.map(col => col.name);

    const billingColumns = [
      'custom_fee',
      'processing_fee',
      'package_cost',
      'late_fee',
      'bill_date',
      'billing_status',
      'payment_method',
      'amount_paid',
      'billing_notes',
      'billed_by',
      'collected_by',
      'collection_date',
      'date_updated',
      'updated_by'
    ];

    let addedColumns = [];

    for (const column of billingColumns) {
      if (!columnNames.includes(column)) {
        let alterSQL = '';

        switch (column) {
          case 'custom_fee':
          case 'processing_fee':
          case 'package_cost':
          case 'late_fee':
          case 'amount_paid':
            alterSQL = `ALTER TABLE shipment_items ADD COLUMN ${column} REAL DEFAULT 0`;
            break;
          case 'bill_date':
          case 'collection_date':
          case 'date_updated':
            alterSQL = `ALTER TABLE shipment_items ADD COLUMN ${column} DATETIME`;
            break;
          case 'billing_status':
            alterSQL = `ALTER TABLE shipment_items ADD COLUMN ${column} TEXT DEFAULT 'unbilled'`;
            break;
          case 'payment_method':
          case 'billing_notes':
          case 'billed_by':
          case 'collected_by':
          case 'updated_by':
            alterSQL = `ALTER TABLE shipment_items ADD COLUMN ${column} TEXT`;
            break;
        }

        db.exec(alterSQL);
        addedColumns.push(column);
      }
    }

    if (addedColumns.length > 0) {
      console.log(`  Added ${addedColumns.length} billing columns to shipment_items:`, addedColumns.join(', '));
    } else {
      console.log('  Billing columns already exist in shipment_items');
    }
  } catch (error) {
    console.error('  Error adding billing columns:', error.message);
  }
}

/**
 * Migration 002: Add currency column to orders table
 */
function addCurrencyColumnToOrders() {
  try {
    // Check if currency column already exists
    const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
    const columnNames = tableInfo.map(col => col.name);

    if (!columnNames.includes('currency')) {
      db.exec(`ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'JMD'`);
      console.log('  Added currency column to orders table');
    } else {
      console.log('  Currency column already exists in orders');
    }
  } catch (error) {
    console.error('  Error adding currency column:', error.message);
  }
}

/**
 * Migration 003: Add user profile columns to users table
 */
function addUserProfileColumns() {
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columnNames = tableInfo.map(col => col.name);

    const profileColumns = ['phone', 'job_title', 'department'];
    let addedColumns = [];

    for (const column of profileColumns) {
      if (!columnNames.includes(column)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`);
        addedColumns.push(column);
      }
    }

    if (addedColumns.length > 0) {
      console.log(`  Added ${addedColumns.length} profile columns to users:`, addedColumns.join(', '));
    } else {
      console.log('  Profile columns already exist in users');
    }
  } catch (error) {
    console.error('  Error adding profile columns:', error.message);
  }
}

/**
 * Migration 004: Add role_settings table for storing role permissions
 */
function addRoleSettingsTable() {
  try {
    // Check if role_settings table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='role_settings'").get();

    if (!tableExists) {
      // Create the table
      db.exec(`
        CREATE TABLE role_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          permissions TEXT NOT NULL DEFAULT '{}',
          created_at DATETIME DEFAULT (datetime('now')),
          updated_at DATETIME DEFAULT (datetime('now'))
        )
      `);

      // Insert default role settings
      const defaultPermissions = {
        full_control: {
          displayName: 'Administrator',
          permissions: {
            packageManagement: { read: true, write: true, create: true },
            customerManagement: { read: true, write: true, create: true },
            orderManagement: { read: true, write: true, create: true },
            collectionManagement: { read: true, write: true, create: true },
            shipmentBinManagement: { read: true, write: true, create: true },
            dashboardReporting: { read: true, write: true, create: true },
            apiConfiguration: { read: true, write: true, create: true },
            settingsManagement: { read: true, write: true, create: true },
            userManagement: { read: true, write: true, create: true }
          }
        },
        editor: {
          displayName: 'Manager',
          permissions: {
            packageManagement: { read: true, write: true, create: true },
            customerManagement: { read: true, write: true, create: true },
            orderManagement: { read: true, write: true, create: true },
            collectionManagement: { read: true, write: true, create: true },
            shipmentBinManagement: { read: true, write: true, create: true },
            dashboardReporting: { read: true, write: true, create: true },
            apiConfiguration: { read: true, write: false, create: false },
            settingsManagement: { read: true, write: false, create: false },
            userManagement: { read: true, write: true, create: true }
          }
        },
        view_only: {
          displayName: 'Users',
          permissions: {
            packageManagement: { read: true, write: true, create: false },
            customerManagement: { read: true, write: true, create: false },
            orderManagement: { read: true, write: false, create: false },
            collectionManagement: { read: true, write: false, create: false },
            shipmentBinManagement: { read: true, write: false, create: false },
            dashboardReporting: { read: true, write: false, create: false },
            apiConfiguration: { read: true, write: false, create: false },
            settingsManagement: { read: true, write: false, create: false },
            userManagement: { read: true, write: false, create: false }
          }
        }
      };

      const insertStmt = db.prepare(`
        INSERT INTO role_settings (role_name, display_name, permissions)
        VALUES (?, ?, ?)
      `);

      for (const [roleName, roleData] of Object.entries(defaultPermissions)) {
        insertStmt.run(roleName, roleData.displayName, JSON.stringify(roleData.permissions));
      }

      console.log('  Created role_settings table with default permissions');
    } else {
      console.log('  role_settings table already exists');
    }
  } catch (error) {
    console.error('  Error creating role_settings table:', error.message);
  }
}
