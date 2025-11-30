import db from './database.js';

/**
 * Run all database migrations
 */
export function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Add billing columns to shipment_items table (Migration 001)
    addBillingColumnsToShipmentItems();

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
