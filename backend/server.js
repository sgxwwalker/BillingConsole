import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import {
  initDatabase,
  seedDatabase,
  userQueries,
  customerQueries,
  packageQueries,
  packageNoteQueries,
  orderQueries,
  collectionLogQueries,
  shipmentLogQueries,
  shipmentItemQueries,
  notFoundScanQueries,
  roleQueries,
  permissionQueries,
  rolePermissionQueries,
  apiConfigQueries,
  apiSyncLogQueries,
} from './database.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize database
initDatabase();
seedDatabase();

const { WAREHOUSE_API_KEY, WAREHOUSE_BASE_URL } = process.env;

const externalClient = axios.create({
  baseURL: WAREHOUSE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${WAREHOUSE_API_KEY || ''}`,
  },
});

// ==================== USER ENDPOINTS ====================

// Get all users
app.get('/api/users', (req, res) => {
  try {
    const users = userQueries.getAll().map((user) => ({
      ...user,
      customPermissions: user.custom_permissions ? JSON.parse(user.custom_permissions) : null,
    }));
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
app.post('/api/users', (req, res) => {
  try {
    const user = req.body;
    userQueries.create(user);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    userQueries.update(id, user);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    userQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = userQueries.getByEmail(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.active === 0) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        customPermissions: user.custom_permissions ? JSON.parse(user.custom_permissions) : null,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Activate user
app.patch('/api/users/:id/activate', (req, res) => {
  try {
    const { id } = req.params;
    userQueries.activate(id);
    res.json({ success: true, message: 'User activated successfully' });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Deactivate user
app.patch('/api/users/:id/deactivate', (req, res) => {
  try {
    const { id } = req.params;
    userQueries.deactivate(id);
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reset user password
app.patch('/api/users/:id/reset-password', (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    userQueries.updatePassword(id, password);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ==================== CUSTOMER ENDPOINTS ====================

// Get all customers with packages
app.get('/api/customers', (req, res) => {
  try {
    const { showAll } = req.query;
    const customers = customerQueries.getAll();

    const customersWithPackages = customers.map((customer) => {
      // If showAll=true, include archived packages, otherwise only non-archived
      let packages;
      if (showAll === 'true') {
        packages = packageQueries.getAllIncludingArchived().filter(pkg => pkg.customer_id === customer.id);
      } else {
        packages = packageQueries.getByCustomerId(customer.id);
      }

      const packagesWithNotes = packages.map((pkg) => {
        const notes = packageNoteQueries.getByPackageId(pkg.package_id);
        return {
          packageId: pkg.package_id,
          externalPackageId: pkg.external_package_id,
          trackingNumber: pkg.tracking_number,
          status: pkg.status,
          weight: pkg.weight,
          dateUpdated: pkg.date_updated,
          description: pkg.description,
          cost: pkg.cost,
          paymentMethod: pkg.payment_method,
          updatedBy: pkg.updated_by,
          billingStatus: pkg.billing_status,
          amountPaid: pkg.amount_paid,
          freightType: pkg.freight_type,
          notes: notes.map((n) => n.note),
          collected: Boolean(pkg.collected),
          deleted: Boolean(pkg.deleted),
          archived: Boolean(pkg.archived),
        };
      });

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        packages: packagesWithNotes,
      };
    });

    res.json({ success: true, customers: customersWithPackages });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// ==================== PACKAGE ENDPOINTS ====================

// Get all packages
app.get('/api/packages', (req, res) => {
  try {
    const { showAll } = req.query;
    const packages = showAll === 'true' ? packageQueries.getAllIncludingArchived() : packageQueries.getAll();
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Create package
app.post('/api/packages', (req, res) => {
  try {
    const pkg = req.body;
    packageQueries.create(pkg);

    // Add note if provided
    if (pkg.note) {
      packageNoteQueries.create({
        packageId: pkg.packageId,
        note: pkg.note,
        createdBy: pkg.updatedBy || 'System',
      });
    }

    res.json({ success: true, package: pkg });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

// Update package
app.put('/api/packages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = req.body;

    // Get existing package to check for external ID
    const existingPkg = packageQueries.getById(id);

    packageQueries.update(id, pkg);

    // Add note if provided
    if (pkg.note) {
      packageNoteQueries.create({
        packageId: id,
        note: pkg.note,
        createdBy: pkg.updatedBy || 'System',
      });
    }

    // Sync status update to external platform if package has external ID
    if (existingPkg && existingPkg.external_package_id && pkg.status && WAREHOUSE_BASE_URL && WAREHOUSE_API_KEY) {
      try {
        await externalClient.post('/packages/update-status', {
          packageId: existingPkg.external_package_id,
          status: pkg.status,
        });
        console.log(`✅ Synced status update to external platform for package ${id}`);
      } catch (syncError) {
        console.error('Error syncing to external platform:', syncError);
        // Don't fail the whole request if external sync fails
      }
    }

    res.json({ success: true, package: pkg });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// Collect package
app.post('/api/packages/:id/collect', async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod, updatedBy, billingStatus, note } = req.body;

    if (!amountPaid || !paymentMethod) {
      return res.status(400).json({ error: 'amountPaid and paymentMethod are required' });
    }

    // Update package
    packageQueries.markCollected(id, {
      amountPaid,
      paymentMethod,
      billingStatus: billingStatus || 'Closed',
      updatedBy: updatedBy || 'System',
    });

    // Add collection log
    collectionLogQueries.create({
      packageId: id,
      date: new Date().toISOString().split('T')[0],
      amount: amountPaid,
      method: paymentMethod,
      userName: updatedBy || 'System',
      note: note || '',
    });

    // Add note if provided
    if (note) {
      packageNoteQueries.create({
        packageId: id,
        note,
        createdBy: updatedBy || 'System',
      });
    }

    // Push update to external platform
    if (WAREHOUSE_BASE_URL && WAREHOUSE_API_KEY) {
      await externalClient.post('/packages/update', {
        packageId: id,
        status: 'Delivered',
        amountPaid,
        paymentMethod,
      });
    }

    res.json({ success: true, packageId: id });
  } catch (error) {
    console.error('Error collecting package:', error);
    res.status(500).json({ error: 'Failed to collect package' });
  }
});

// Delete package
app.delete('/api/packages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { updatedBy, note } = req.body;

    // Soft delete
    packageQueries.softDelete(id, updatedBy || 'System');

    // Add deletion note
    if (note) {
      packageNoteQueries.create({
        packageId: id,
        note: `Deleted: ${note}`,
        createdBy: updatedBy || 'System',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// ==================== ORDER ENDPOINTS ====================

// Get all orders
app.get('/api/orders', (req, res) => {
  try {
    const orders = orderQueries.getAll().map((order) => ({
      id: order.id,
      date: order.date,
      customerName: order.customer_name,
      description: order.description,
      cost: order.cost,
      status: order.status,
      merchant: order.merchant,
      method: order.method,
      updatedBy: order.updated_by,
    }));
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order
app.post('/api/orders', (req, res) => {
  try {
    const order = req.body;
    orderQueries.create(order);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
app.put('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = req.body;
    orderQueries.update(id, order);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order
app.delete('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    orderQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ==================== COLLECTION LOG ENDPOINTS ====================

// Get collection logs
app.get('/api/collection-logs', (req, res) => {
  try {
    const { date } = req.query;
    const logs = date ? collectionLogQueries.getByDate(date) : collectionLogQueries.getAll();
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching collection logs:', error);
    res.status(500).json({ error: 'Failed to fetch collection logs' });
  }
});

// ==================== LEGACY ENDPOINTS (for backwards compatibility) ====================

app.post('/collect', async (req, res) => {
  const { packageId, amountPaid, paymentMethod } = req.body || {};
  if (!packageId || amountPaid == null || !paymentMethod) {
    return res.status(400).json({ error: 'packageId, amountPaid, and paymentMethod are required' });
  }

  try {
    packageQueries.markCollected(packageId, {
      amountPaid,
      paymentMethod,
      billingStatus: 'Closed',
      updatedBy: 'System',
    });

    if (WAREHOUSE_BASE_URL && WAREHOUSE_API_KEY) {
      await externalClient.post('/packages/update', {
        packageId,
        status: 'Delivered',
        amountPaid,
        paymentMethod,
      });
    }

    res.json({ success: true, packageId });
  } catch (err) {
    console.error('Error in /collect', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to collect package' });
  }
});

app.get('/customer-packages', (req, res) => {
  try {
    const { customerId } = req.query;
    const packages = customerId ? packageQueries.getByCustomerId(customerId) : packageQueries.getAll();
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.get('/search-customer', (req, res) => {
  try {
    const { q } = req.query;
    const customers = customerQueries.getAll();
    const results = customers.filter(
      (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase())
    );
    res.json({ success: true, query: q, results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ==================== EXTERNAL API SYNC ENDPOINTS ====================

// Sync packages from external platform
app.post('/api/external/sync', async (req, res) => {
  try {
    if (!WAREHOUSE_BASE_URL || !WAREHOUSE_API_KEY) {
      return res.status(400).json({ error: 'External API not configured' });
    }

    const { syncedBy } = req.body;

    // Fetch packages from external platform
    const response = await externalClient.get('/packages');
    const externalPackages = response.data.packages || [];

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const extPkg of externalPackages) {
      try {
        // Check if package exists by external ID
        const existingPkg = packageQueries.getByExternalId(extPkg.id);

        if (existingPkg) {
          // Update existing package
          packageQueries.update(existingPkg.package_id, {
            trackingNumber: extPkg.tracking_number,
            status: extPkg.status || 'Processing in Office',
            billingStatus: existingPkg.billing_status,
            weight: extPkg.weight,
            cost: extPkg.cost || 0,
            amountPaid: extPkg.amount_paid || 0,
            paymentMethod: existingPkg.payment_method,
            freightType: extPkg.freight_type || 'Air',
            description: extPkg.description || '',
            dateUpdated: new Date().toISOString().split('T')[0],
            updatedBy: syncedBy || 'External Sync',
            collected: existingPkg.collected,
          });
          updated++;
        } else {
          // Create new package
          packageQueries.create({
            packageId: `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            externalPackageId: extPkg.id,
            customerId: extPkg.customer_id,
            trackingNumber: extPkg.tracking_number,
            status: extPkg.status || 'Processing in Office',
            billingStatus: 'Open',
            weight: extPkg.weight,
            cost: extPkg.cost || 0,
            amountPaid: extPkg.amount_paid || 0,
            paymentMethod: '',
            freightType: extPkg.freight_type || 'Air',
            description: extPkg.description || '',
            dateUpdated: new Date().toISOString().split('T')[0],
            updatedBy: syncedBy || 'External Sync',
            collected: false,
            deleted: false,
            archived: false,
          });

          packageNoteQueries.create({
            packageId: `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            note: 'Package imported from external platform',
            createdBy: syncedBy || 'External Sync',
          });
          created++;
        }
      } catch (pkgError) {
        console.error('Error syncing package:', pkgError);
        errors++;
      }
    }

    // Log the sync
    apiSyncLogQueries.create({
      status: 'success',
      message: `Synced ${externalPackages.length} packages: ${created} created, ${updated} updated, ${errors} errors`,
      syncedBy: syncedBy || 'System',
      recordsCreated: created,
      recordsUpdated: updated,
      errors: errors,
    });

    // Update API config with last sync status
    apiConfigQueries.updateSyncStatus('success', `Synced ${externalPackages.length} packages successfully`);

    res.json({
      success: true,
      summary: {
        total: externalPackages.length,
        created,
        updated,
        errors,
      },
    });
  } catch (error) {
    console.error('Error syncing with external platform:', error);

    // Log the failed sync
    apiSyncLogQueries.create({
      status: 'error',
      message: `Sync failed: ${error.message}`,
      syncedBy: req.body.syncedBy || 'System',
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 1,
    });

    // Update API config with last sync status
    apiConfigQueries.updateSyncStatus('error', error.message);

    res.status(500).json({ error: 'Failed to sync with external platform' });
  }
});

// Push status update to external platform
app.post('/api/external/push-status', async (req, res) => {
  try {
    const { packageId, status } = req.body;

    if (!packageId || !status) {
      return res.status(400).json({ error: 'Package ID and status are required' });
    }

    const pkg = packageQueries.getById(packageId);
    if (!pkg || !pkg.external_package_id) {
      return res.status(404).json({ error: 'Package not found or not linked to external platform' });
    }

    if (WAREHOUSE_BASE_URL && WAREHOUSE_API_KEY) {
      await externalClient.post('/packages/update-status', {
        packageId: pkg.external_package_id,
        status: status,
      });

      res.json({ success: true, message: 'Status updated on external platform' });
    } else {
      res.status(400).json({ error: 'External API not configured' });
    }
  } catch (error) {
    console.error('Error pushing status to external platform:', error);
    res.status(500).json({ error: 'Failed to push status update' });
  }
});

// ==================== SHIPMENT BIN ENDPOINTS ====================

// Get all shipment logs
app.get('/api/shipment-logs', (req, res) => {
  try {
    const logs = shipmentLogQueries.getAll();

    // Add item count to each log
    const logsWithCounts = logs.map(log => {
      const items = shipmentItemQueries.getByLogId(log.id);
      return {
        ...log,
        itemCount: items.length
      };
    });

    res.json({ success: true, logs: logsWithCounts });
  } catch (error) {
    console.error('Error fetching shipment logs:', error);
    res.status(500).json({ error: 'Failed to fetch shipment logs' });
  }
});

// Get shipment log by ID with items
app.get('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const log = shipmentLogQueries.getById(id);
    if (!log) {
      return res.status(404).json({ error: 'Shipment log not found' });
    }
    const items = shipmentItemQueries.getByLogId(id);
    const notFoundScans = notFoundScanQueries.getByLogId(id);
    const notFoundCount = notFoundScans.length;
    res.json({ success: true, log, items, notFoundScans, notFoundCount });
  } catch (error) {
    console.error('Error fetching shipment log:', error);
    res.status(500).json({ error: 'Failed to fetch shipment log' });
  }
});

// Upload CSV shipment log
app.post('/api/shipment-logs/upload', upload.single('file'), (req, res) => {
  try {
    const { shipmentDate, uploadedBy } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV
    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Create shipment log
    const logResult = shipmentLogQueries.create({
      logName: req.file.originalname,
      shipmentDate: shipmentDate || new Date().toISOString().split('T')[0],
      uploadedBy: uploadedBy || 'System',
    });

    const shipmentLogId = logResult.lastInsertRowid;

    // Insert items
    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        shipmentItemQueries.create({
          shipmentLogId,
          packageId: record['Package ID'] || record['package_id'] || record['ID'] || record['id'] || null,
          customerName: record['Customer Name'] || record['customer_name'] || record['User Name'] || record['user_name'] || record['Name'] || record['name'] || '',
          altName: record['Alt Name'] || record['alt_name'] || null,
          trackingNumber: record['Tracking Number'] || record['tracking_number'] || record['Tracking'] || record['tracking'] || '',
          weight: parseFloat(record['Weight'] || record['weight'] || record['Weight (LB)'] || record['weight_lb']) || null,
          status: 'pending',
        });
        successCount++;
      } catch (err) {
        console.error('Error inserting item:', err);
        errorCount++;
      }
    }

    res.json({
      success: true,
      shipmentLogId,
      itemsProcessed: successCount,
      itemsFailed: errorCount,
      totalItems: records.length,
    });
  } catch (error) {
    console.error('Error uploading shipment log:', error);
    res.status(500).json({ error: 'Failed to upload shipment log' });
  }
});

// Scan tracking number
app.post('/api/shipment-logs/scan', (req, res) => {
  try {
    const { trackingNumber, currentLogId, scannedBy } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    // Find all items with this tracking number
    const matchingItems = shipmentItemQueries.getByTracking(trackingNumber);

    if (matchingItems.length === 0) {
      // Log the not found scan
      notFoundScanQueries.create({
        shipmentLogId: currentLogId,
        trackingNumber: trackingNumber,
        scannedBy: scannedBy || 'System',
      });

      return res.json({
        success: true,
        status: 'not_found',
        message: 'Tracking number not found in any shipment log',
      });
    }

    // Check if it's in the current log
    const currentLogItem = matchingItems.find(item => item.shipment_log_id === parseInt(currentLogId));

    if (currentLogItem) {
      // Mark as received in current log
      shipmentItemQueries.markReceived(currentLogItem.id, scannedBy || 'System');

      // DUAL UPDATE: Also update customer package status to "Processing in Office"
      try {
        const customerPackages = packageQueries.getAll();
        const matchingPackage = customerPackages.find(pkg =>
          pkg.tracking_number === trackingNumber && pkg.deleted === 0
        );

        if (matchingPackage) {
          // Update package status to "Processing in Office"
          packageQueries.update(matchingPackage.package_id, {
            trackingNumber: matchingPackage.tracking_number,
            status: 'Processing in Office',
            billingStatus: matchingPackage.billing_status,
            weight: matchingPackage.weight,
            cost: matchingPackage.cost,
            amountPaid: matchingPackage.amount_paid,
            paymentMethod: matchingPackage.payment_method,
            freightType: matchingPackage.freight_type,
            description: matchingPackage.description,
            dateUpdated: new Date().toISOString().split('T')[0],
            updatedBy: scannedBy || 'System',
            collected: matchingPackage.collected,
          });

          // Add note about status update
          packageNoteQueries.create({
            packageId: matchingPackage.package_id,
            note: 'Status updated to "Processing in Office" via shipment bin scan',
            createdBy: scannedBy || 'System',
          });

          console.log(`✅ Dual update: Package ${matchingPackage.package_id} status updated to "Processing in Office"`);
        } else {
          console.log(`ℹ️  No matching package found for tracking number: ${trackingNumber}`);
        }
      } catch (updateError) {
        console.error('Error updating customer package status:', updateError);
        // Don't fail the whole request if package update fails
      }

      return res.json({
        success: true,
        status: 'received',
        message: 'Package marked as received',
        item: currentLogItem,
      });
    }

    // It's in a different log
    const otherLogItem = matchingItems[0];
    const otherLog = shipmentLogQueries.getById(otherLogItem.shipment_log_id);

    return res.json({
      success: true,
      status: 'found_in_other_log',
      message: `Package found in shipment log: ${otherLog.log_name} (${otherLog.shipment_date})`,
      item: otherLogItem,
      log: otherLog,
    });
  } catch (error) {
    console.error('Error scanning tracking number:', error);
    res.status(500).json({ error: 'Failed to scan tracking number' });
  }
});

// Move item to current log
app.post('/api/shipment-logs/move-item', (req, res) => {
  try {
    const { itemId, newLogId } = req.body;

    if (!itemId || !newLogId) {
      return res.status(400).json({ error: 'Item ID and new log ID are required' });
    }

    shipmentItemQueries.moveToLog(itemId, newLogId);

    res.json({
      success: true,
      message: 'Item moved to current shipment log',
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

// Update shipment item
app.put('/api/shipment-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, altName, trackingNumber, packageId, weight } = req.body;

    if (!customerName || !trackingNumber) {
      return res.status(400).json({ error: 'Customer name and tracking number are required' });
    }

    const stmt = db.prepare(`
      UPDATE shipment_items
      SET customer_name = ?, alt_name = ?, tracking_number = ?, package_id = ?, weight = ?
      WHERE id = ?
    `);
    stmt.run(customerName, altName, trackingNumber, packageId, weight, id);

    res.json({ success: true, message: 'Shipment item updated successfully' });
  } catch (error) {
    console.error('Error updating shipment item:', error);
    res.status(500).json({ error: 'Failed to update shipment item' });
  }
});

// Update shipment item status
app.patch('/api/shipment-items/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const stmt = db.prepare('UPDATE shipment_items SET status = ? WHERE id = ?');
    stmt.run(status, id);

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating shipment item status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update shipment log
app.put('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { logName, shipmentDate } = req.body;

    if (!logName || !shipmentDate) {
      return res.status(400).json({ error: 'Log name and shipment date are required' });
    }

    const stmt = db.prepare('UPDATE shipment_logs SET log_name = ?, shipment_date = ? WHERE id = ?');
    stmt.run(logName, shipmentDate, id);

    res.json({ success: true, message: 'Shipment log updated successfully' });
  } catch (error) {
    console.error('Error updating shipment log:', error);
    res.status(500).json({ error: 'Failed to update shipment log' });
  }
});

// Delete shipment log
app.delete('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    shipmentLogQueries.delete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shipment log:', error);
    res.status(500).json({ error: 'Failed to delete shipment log' });
  }
});

// ==================== ROLES ENDPOINTS ====================

// Get all roles
app.get('/api/roles', (req, res) => {
  try {
    const roles = roleQueries.getAll();
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role by ID
app.get('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const role = roleQueries.getById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    const permissions = permissionQueries.getByRoleId(id);
    res.json({ success: true, role, permissions });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

// Create role
app.post('/api/roles', (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const result = roleQueries.create({ name, description, isSystem: false });
    res.json({ success: true, roleId: result.lastInsertRowid, message: 'Role created successfully' });
  } catch (error) {
    console.error('Error creating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
app.put('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const role = roleQueries.getById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.is_system === 1) {
      return res.status(403).json({ error: 'Cannot modify system roles' });
    }

    roleQueries.update(id, { name, description });
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
app.delete('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;

    const role = roleQueries.getById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.is_system === 1) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    roleQueries.delete(id);
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Duplicate role
app.post('/api/roles/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: 'New role name is required' });
    }

    const originalRole = roleQueries.getById(id);
    if (!originalRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Duplicate the role
    const result = roleQueries.duplicate(id, newName);
    const newRoleId = result.lastInsertRowid;

    // Copy permissions from original role to new role
    const originalPermissions = permissionQueries.getByRoleId(id);
    const permissionIds = originalPermissions.map(p => p.id);

    if (permissionIds.length > 0) {
      rolePermissionQueries.assignPermissions(newRoleId, permissionIds);
    }

    res.json({ success: true, roleId: newRoleId, message: 'Role duplicated successfully' });
  } catch (error) {
    console.error('Error duplicating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to duplicate role' });
  }
});

// ==================== PERMISSIONS ENDPOINTS ====================

// Get all permissions
app.get('/api/permissions', (req, res) => {
  try {
    const permissions = permissionQueries.getAll();
    res.json({ success: true, permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Assign permissions to role
app.post('/api/roles/:id/permissions', (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'Permission IDs must be an array' });
    }

    const role = roleQueries.getById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    rolePermissionQueries.assignPermissions(id, permissionIds);
    res.json({ success: true, message: 'Permissions assigned successfully' });
  } catch (error) {
    console.error('Error assigning permissions:', error);
    res.status(500).json({ error: 'Failed to assign permissions' });
  }
});

// ==================== API CONFIGURATION ENDPOINTS ====================

// Get API configuration
app.get('/api/settings/api-config', (req, res) => {
  try {
    let config = apiConfigQueries.get();

    // Don't send password in response (security)
    if (config && config.password) {
      config = { ...config, password: '********' };
    }

    res.json({ success: true, config: config || {} });
  } catch (error) {
    console.error('Error fetching API config:', error);
    res.status(500).json({ error: 'Failed to fetch API configuration' });
  }
});

// Update API configuration
app.put('/api/settings/api-config', (req, res) => {
  try {
    const { baseUrl, apiKey, email, password, timeout, environment } = req.body;

    // Get existing config to preserve password if not provided
    const existingConfig = apiConfigQueries.get();
    const finalPassword = password === '********' && existingConfig
      ? existingConfig.password
      : password;

    apiConfigQueries.upsert({
      baseUrl,
      apiKey,
      email,
      password: finalPassword,
      timeout: timeout || 30000,
      environment: environment || 'production',
      maintenanceMode: existingConfig ? existingConfig.maintenance_mode : 0,
    });

    res.json({ success: true, message: 'API configuration updated successfully' });
  } catch (error) {
    console.error('Error updating API config:', error);
    res.status(500).json({ error: 'Failed to update API configuration' });
  }
});

// Test API connection
app.post('/api/settings/api-config/test', async (req, res) => {
  try {
    const config = apiConfigQueries.get();

    if (!config || !config.base_url) {
      return res.status(400).json({ error: 'API base URL not configured' });
    }

    // Test connection with a simple request
    const testClient = axios.create({
      baseURL: config.base_url,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.api_key && { Authorization: `Bearer ${config.api_key}` }),
      },
    });

    await testClient.get('/health');
    res.json({ success: true, message: 'API connection successful' });
  } catch (error) {
    console.error('API connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'API connection failed',
      message: error.message
    });
  }
});

// Get API sync logs
app.get('/api/settings/sync-logs', (req, res) => {
  try {
    const logs = apiSyncLogQueries.getAll(10);
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// ==================== MAINTENANCE MODE ENDPOINTS ====================

// Toggle maintenance mode
app.patch('/api/settings/maintenance-mode', (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean value' });
    }

    apiConfigQueries.toggleMaintenanceMode(enabled);
    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      maintenanceMode: enabled
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
});

// Get maintenance mode status
app.get('/api/settings/maintenance-mode', (req, res) => {
  try {
    const config = apiConfigQueries.get();
    const maintenanceMode = config ? config.maintenance_mode === 1 : false;
    res.json({ success: true, maintenanceMode });
  } catch (error) {
    console.error('Error fetching maintenance mode:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance mode status' });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${port}`);
  console.log('📊 Database: SQLite (shipping.db)');
  console.log('✅ Ready to accept requests\n');
});
