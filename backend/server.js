import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import axios from 'axios';
import https from 'https';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import db, {
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
  roleSettingsQueries,
  apiConfigQueries,
  apiSyncLogQueries,
  deliveryRequestQueries,
} from './database.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const BCRYPT_SALT_ROUNDS = 12;
const isProduction = process.env.NODE_ENV === 'production';

// ==================== LOGGING UTILITY ====================

// Conditional logging - reduced output in production
const logger = {
  info: (...args) => !isProduction && console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => !isProduction && console.log('[DEBUG]', ...args),
  audit: (...args) => console.log('[AUDIT]', ...args), // Always log audit events
};

// ==================== RESPONSE HELPERS ====================

/**
 * Standard success response
 * @param {Response} res - Express response object
 * @param {Object} data - Data to return (spread at root level for backward compatibility)
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default 200)
 */
const sendSuccess = (res, data = {}, message = '', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data, // Spread data at root level for backward compatibility
  });
};

/**
 * Standard error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default 500)
 * @param {Object} error - Optional error details
 */
const sendError = (res, message, statusCode = 500, error = null) => {
  const response = {
    success: false,
    message,
    error: error || { code: statusCode },
  };
  return res.status(statusCode).json(response);
};

// ==================== IN-MEMORY CACHE ====================

const cache = {
  customers: { data: null, timestamp: 0, ttl: 60000 }, // 1 minute TTL
  roleSettings: { data: null, timestamp: 0, ttl: 300000 }, // 5 minutes TTL

  isValid(key) {
    const entry = this[key];
    return entry && entry.data && (Date.now() - entry.timestamp) < entry.ttl;
  },

  get(key) {
    return this.isValid(key) ? this[key].data : null;
  },

  set(key, data) {
    if (this[key]) {
      this[key].data = data;
      this[key].timestamp = Date.now();
    }
  },

  invalidate(key) {
    if (this[key]) {
      this[key].data = null;
      this[key].timestamp = 0;
    }
  },

  invalidateAll() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'object' && this[key].data !== undefined) {
        this[key].data = null;
        this[key].timestamp = 0;
      }
    });
  }
};

// ==================== SECURITY MIDDLEWARE ====================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: isProduction ? process.env.ALLOWED_ORIGINS?.split(',') : true,
  credentials: true,
}));

// Rate limiting - general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - password reset (stricter)
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: { error: 'Too many password reset attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api/', generalLimiter);

// Gzip compression for responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '10mb' }));

// ==================== INPUT VALIDATION SCHEMAS ====================

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  photo: z.string().optional(),
  location: z.string().optional(),
  role: z.enum(['full_control', 'editor', 'view_only']).optional(),
  customPermissions: z.record(z.any()).optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const passwordResetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Validation middleware factory
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Validation failed', 400, {
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

// ==================== AUDIT LOGGING ====================

const auditLog = (action, userId, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId,
    ...details,
    ip: details.ip || 'unknown',
  };

  // Always log audit events (security-critical)
  logger.audit(JSON.stringify(logEntry));

  // Store in database for audit trail
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (action, user_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(action, userId, JSON.stringify(details), details.ip || 'unknown');
  } catch (error) {
    // Audit table might not exist yet - log to console only
    logger.warn('Audit DB write failed:', error.message);
  }
};

// ==================== PASSWORD HASHING UTILITIES ====================

const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

const verifyPassword = async (password, hash) => {
  // Handle legacy plaintext passwords during migration
  if (!hash.startsWith('$2')) {
    // Legacy plaintext password - verify directly and suggest migration
    return password === hash;
  }
  return bcrypt.compare(password, hash);
};

const isLegacyPassword = (hash) => {
  return !hash.startsWith('$2');
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Configure multer for profile photo uploads
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

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
    sendSuccess(res, { users }, 'Users fetched successfully');
  } catch (error) {
    logger.error('fetching users:', error);
    sendError(res, 'Failed to fetch users', 500);
  }
});

// Create user - with bcrypt password hashing
app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Hash password if provided
    if (user.password) {
      user.password = await hashPassword(user.password);
    }

    userQueries.create(user);
    auditLog('USER_CREATED', user.id, { email: user.email, role: user.role, ip: clientIp });

    // Don't expose password hash in response
    const { password: _, ...userWithoutPassword } = user;
    sendSuccess(res, { user: userWithoutPassword }, 'User created successfully', 201);
  } catch (error) {
    logger.error('creating user:', error);
    sendError(res, 'Failed to create user', 500);
  }
});

// Update user - with audit logging
app.put('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    userQueries.update(id, user);
    auditLog('USER_UPDATED', id, { email: user.email, role: user.role, ip: clientIp });

    sendSuccess(res, { user }, 'User updated successfully');
  } catch (error) {
    logger.error('updating user:', error);
    sendError(res, 'Failed to update user', 500);
  }
});

// Delete user - with audit logging
app.delete('/api/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Get user info before deletion for audit
    const user = userQueries.getById(id);
    userQueries.delete(id);

    auditLog('USER_DELETED', id, { email: user?.email, ip: clientIp });
    sendSuccess(res, {}, 'User deleted successfully');
  } catch (error) {
    logger.error('deleting user:', error);
    sendError(res, 'Failed to delete user', 500);
  }
});

// Update user profile (with photo upload)
app.put('/api/users/:id/profile', profilePhotoUpload.single('photo'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, job_title, department, photo_url } = req.body;

    // Get current user to check for existing photo
    const currentUser = userQueries.getById(id);
    if (!currentUser) {
      return sendError(res, 'User not found', 404);
    }

    // Determine photo URL
    let photoUrl = currentUser.photo;
    if (req.file) {
      // New photo uploaded - delete old file if it exists and is a local file
      if (currentUser.photo && currentUser.photo.startsWith('/uploads/')) {
        const oldPhotoPath = path.join(__dirname, currentUser.photo);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      photoUrl = `/uploads/profile-photos/${req.file.filename}`;
    } else if (photo_url !== undefined) {
      photoUrl = photo_url || null;
    }

    // Update user profile
    userQueries.updateProfile(id, {
      name,
      email,
      phone: phone || null,
      job_title: job_title || null,
      department: department || null,
      photo: photoUrl
    });

    // Get updated user
    const updatedUser = userQueries.getById(id);

    sendSuccess(res, {
      user: {
        ...updatedUser,
        customPermissions: updatedUser.custom_permissions ? JSON.parse(updatedUser.custom_permissions) : null,
      }
    }, 'Profile updated successfully');
  } catch (error) {
    logger.error('updating profile:', error);
    sendError(res, 'Failed to update profile', 500);
  }
});

// Change user password - with validation and bcrypt
app.post('/api/users/:id/change-password', passwordLimiter, validate(passwordChangeSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Get current user
    const user = userQueries.getById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Verify current password
    const passwordValid = await verifyPassword(currentPassword, user.password);
    if (!passwordValid) {
      auditLog('PASSWORD_CHANGE_FAILED', id, { reason: 'Invalid current password', ip: clientIp });
      return sendError(res, 'Current password is incorrect', 400);
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    userQueries.updatePassword(id, hashedPassword);

    auditLog('PASSWORD_CHANGED', id, { ip: clientIp });
    sendSuccess(res, {}, 'Password changed successfully');
  } catch (error) {
    logger.error('changing password:', error);
    sendError(res, 'Failed to change password', 500);
  }
});

// Login endpoint - with rate limiting and validation
app.post('/api/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const user = userQueries.getByEmail(email);

    if (!user) {
      auditLog('LOGIN_FAILED', null, { email, reason: 'User not found', ip: clientIp });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Verify password (supports both bcrypt hashed and legacy plaintext)
    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      auditLog('LOGIN_FAILED', user.id, { email, reason: 'Invalid password', ip: clientIp });
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (user.active === 0) {
      auditLog('LOGIN_BLOCKED', user.id, { email, reason: 'Account deactivated', ip: clientIp });
      return sendError(res, 'Account is deactivated. Please contact an administrator.', 403);
    }

    // If using legacy plaintext password, hash it now (migration)
    if (isLegacyPassword(user.password)) {
      const hashedPassword = await hashPassword(password);
      userQueries.updatePassword(user.id, hashedPassword);
      logger.info(`Migrated password to bcrypt for user: ${user.email}`);
    }

    auditLog('LOGIN_SUCCESS', user.id, { email, ip: clientIp });

    // Don't expose password hash in response
    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, {
      user: {
        ...userWithoutPassword,
        customPermissions: user.custom_permissions ? JSON.parse(user.custom_permissions) : null,
      },
    }, 'Login successful');
  } catch (error) {
    logger.error('during login:', error);
    sendError(res, 'Login failed', 500);
  }
});

// Activate user
app.patch('/api/users/:id/activate', (req, res) => {
  try {
    const { id } = req.params;
    userQueries.activate(id);
    sendSuccess(res, {}, 'User activated successfully');
  } catch (error) {
    logger.error('activating user:', error);
    sendError(res, 'Failed to activate user', 500);
  }
});

// Deactivate user
app.patch('/api/users/:id/deactivate', (req, res) => {
  try {
    const { id } = req.params;
    userQueries.deactivate(id);
    sendSuccess(res, {}, 'User deactivated successfully');
  } catch (error) {
    logger.error('deactivating user:', error);
    sendError(res, 'Failed to deactivate user', 500);
  }
});

// Reset user password (admin action) - with validation and bcrypt
app.patch('/api/users/:id/reset-password', passwordLimiter, validate(passwordResetSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Hash and update password
    const hashedPassword = await hashPassword(password);
    userQueries.updatePassword(id, hashedPassword);

    auditLog('PASSWORD_RESET_BY_ADMIN', id, { ip: clientIp });
    sendSuccess(res, {}, 'Password reset successfully');
  } catch (error) {
    logger.error('resetting password:', error);
    sendError(res, 'Failed to reset password', 500);
  }
});

// ==================== CUSTOMER ENDPOINTS ====================

// Helper function to build customers with packages
const buildCustomersWithPackages = (showAll) => {
  const customers = customerQueries.getAll();

  return customers.map((customer) => {
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
        altName: pkg.alt_name,
        reason: pkg.reason,
        seller: pkg.seller,
        length: pkg.length,
        width: pkg.width,
        height: pkg.height,
        cubicFeet: pkg.cubic_feet,
        location: pkg.location,
        invoiceUrl: pkg.invoice_url,
        packageImageUrl: pkg.package_image_url,
        preAlert: Boolean(pkg.pre_alert),
        emailSent: Boolean(pkg.email_sent),
        paid: Boolean(pkg.paid),
        warehouseDate: pkg.warehouse_date,
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
};

// Get all customers with packages (with caching)
app.get('/api/customers', (req, res) => {
  try {
    const { showAll } = req.query;
    const cacheKey = showAll === 'true' ? 'customers_all' : 'customers';

    // Check cache first (only for non-showAll requests which are most common)
    if (showAll !== 'true') {
      const cachedData = cache.get('customers');
      if (cachedData) {
        logger.debug('Serving customers from cache');
        return sendSuccess(res, { customers: cachedData }, 'Customers fetched from cache');
      }
    }

    const customersWithPackages = buildCustomersWithPackages(showAll);

    // Cache the result (only for default view)
    if (showAll !== 'true') {
      cache.set('customers', customersWithPackages);
      logger.debug('Cached customers data');
    }

    sendSuccess(res, { customers: customersWithPackages }, 'Customers fetched successfully');
  } catch (error) {
    logger.error('Error fetching customers:', error);
    sendError(res, 'Failed to fetch customers', 500);
  }
});

// Create customer
app.post('/api/customers', (req, res) => {
  try {
    const customer = req.body;
    customerQueries.create(customer);
    cache.invalidate('customers'); // Invalidate cache
    sendSuccess(res, { customer }, 'Customer created successfully', 201);
  } catch (error) {
    logger.error('Error creating customer:', error);
    sendError(res, 'Failed to create customer', 500);
  }
});

// ==================== PACKAGE ENDPOINTS ====================

// Get all packages
app.get('/api/packages', (req, res) => {
  try {
    const { showAll } = req.query;
    const packages = showAll === 'true' ? packageQueries.getAllIncludingArchived() : packageQueries.getAll();
    sendSuccess(res, { packages }, 'Packages fetched successfully');
  } catch (error) {
    logger.error('fetching packages:', error);
    sendError(res, 'Failed to fetch packages', 500);
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

    cache.invalidate('customers'); // Invalidate cache
    sendSuccess(res, { package: pkg }, 'Package created successfully', 201);
  } catch (error) {
    logger.error('creating package:', error);
    sendError(res, 'Failed to create package', 500);
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
        logger.info(`Synced status update to external platform for package ${id}`);
      } catch (syncError) {
        logger.error('syncing to external platform:', syncError);
        // Don't fail the whole request if external sync fails
      }
    }

    cache.invalidate('customers'); // Invalidate cache
    sendSuccess(res, { package: pkg }, 'Package updated successfully');
  } catch (error) {
    logger.error('updating package:', error);
    sendError(res, 'Failed to update package', 500);
  }
});

// Collect package
app.post('/api/packages/:id/collect', async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod, updatedBy, billingStatus, note } = req.body;

    if (!amountPaid || !paymentMethod) {
      return sendError(res, 'amountPaid and paymentMethod are required', 400);
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

    cache.invalidate('customers'); // Invalidate cache
    sendSuccess(res, { packageId: id }, 'Package collected successfully');
  } catch (error) {
    logger.error('collecting package:', error);
    sendError(res, 'Failed to collect package', 500);
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

    cache.invalidate('customers'); // Invalidate cache

    sendSuccess(res, {}, 'Package deleted successfully');
  } catch (error) {
    logger.error('deleting package:', error);
    sendError(res, 'Failed to delete package', 500);
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
      currency: order.currency || 'JMD',
      updatedBy: order.updated_by,
    }));
    sendSuccess(res, { orders }, 'Orders fetched successfully');
  } catch (error) {
    logger.error('fetching orders:', error);
    sendError(res, 'Failed to fetch orders', 500);
  }
});

// Create order
app.post('/api/orders', (req, res) => {
  try {
    const order = req.body;
    orderQueries.create(order);
    sendSuccess(res, { order }, 'Order created successfully', 201);
  } catch (error) {
    logger.error('creating order:', error);
    sendError(res, 'Failed to create order', 500);
  }
});

// Update order
app.put('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = req.body;
    orderQueries.update(id, order);
    sendSuccess(res, { order }, 'Order updated successfully');
  } catch (error) {
    logger.error('updating order:', error);
    sendError(res, 'Failed to update order', 500);
  }
});

// Delete order
app.delete('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    orderQueries.delete(id);
    sendSuccess(res, {}, 'Order deleted successfully');
  } catch (error) {
    logger.error('deleting order:', error);
    sendError(res, 'Failed to delete order', 500);
  }
});

// ==================== COLLECTION LOG ENDPOINTS ====================

// Get collection logs
app.get('/api/collection-logs', (req, res) => {
  try {
    const { date } = req.query;
    const logs = date ? collectionLogQueries.getByDate(date) : collectionLogQueries.getAll();
    sendSuccess(res, { logs }, 'Collection logs fetched successfully');
  } catch (error) {
    logger.error('fetching collection logs:', error);
    sendError(res, 'Failed to fetch collection logs', 500);
  }
});

// ==================== LEGACY ENDPOINTS (for backwards compatibility) ====================

app.post('/collect', async (req, res) => {
  const { packageId, amountPaid, paymentMethod } = req.body || {};
  if (!packageId || amountPaid == null || !paymentMethod) {
    return sendError(res, 'packageId, amountPaid, and paymentMethod are required', 400);
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

    sendSuccess(res, { packageId }, 'Package collected successfully');
  } catch (err) {
    logger.error('in /collect', err?.response?.data || err.message);
    sendError(res, 'Failed to collect package', 500);
  }
});

app.get('/customer-packages', (req, res) => {
  try {
    const { customerId } = req.query;
    const packages = customerId ? packageQueries.getByCustomerId(customerId) : packageQueries.getAll();
    sendSuccess(res, { packages }, 'Packages fetched successfully');
  } catch (error) {
    sendError(res, 'Failed to fetch packages', 500);
  }
});

app.get('/search-customer', (req, res) => {
  try {
    const { q } = req.query;
    const customers = customerQueries.getAll();
    const results = customers.filter(
      (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase())
    );
    sendSuccess(res, { query: q, results }, 'Search completed successfully');
  } catch (error) {
    sendError(res, 'Search failed', 500);
  }
});

// ==================== EXTERNAL API SYNC ENDPOINTS ====================

// Sync packages from external platform
app.post('/api/external/sync', async (req, res) => {
  try {
    if (!WAREHOUSE_BASE_URL || !WAREHOUSE_API_KEY) {
      return sendError(res, 'External API not configured', 400);
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
        logger.error('syncing package:', pkgError);
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

    sendSuccess(res, {
      summary: {
        total: externalPackages.length,
        created,
        updated,
        errors,
      },
    }, 'External sync completed successfully');
  } catch (error) {
    logger.error('syncing with external platform:', error);

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

    sendError(res, 'Failed to sync with external platform', 500);
  }
});

// Push status update to external platform
app.post('/api/external/push-status', async (req, res) => {
  try {
    const { packageId, status } = req.body;

    if (!packageId || !status) {
      return sendError(res, 'Package ID and status are required', 400);
    }

    const pkg = packageQueries.getById(packageId);
    if (!pkg || !pkg.external_package_id) {
      return sendError(res, 'Package not found or not linked to external platform', 404);
    }

    if (WAREHOUSE_BASE_URL && WAREHOUSE_API_KEY) {
      await externalClient.post('/packages/update-status', {
        packageId: pkg.external_package_id,
        status: status,
      });

      sendSuccess(res, {}, 'Status updated on external platform');
    } else {
      sendError(res, 'External API not configured', 400);
    }
  } catch (error) {
    logger.error('pushing status to external platform:', error);
    sendError(res, 'Failed to push status update', 500);
  }
});

// ==================== SHIPMENT BIN ENDPOINTS ====================

// Get all shipment logs
app.get('/api/shipment-logs', (req, res) => {
  try {
    const { archived } = req.query;

    let logs;
    if (archived === 'true') {
      logs = shipmentLogQueries.getArchived();
    } else if (archived === 'false') {
      logs = shipmentLogQueries.getActive();
    } else {
      logs = shipmentLogQueries.getAll();
    }

    // Add item count to each log
    const logsWithCounts = logs.map(log => {
      const items = shipmentItemQueries.getByLogId(log.id);
      return {
        ...log,
        itemCount: items.length
      };
    });

    sendSuccess(res, { logs: logsWithCounts }, 'Shipment logs fetched successfully');
  } catch (error) {
    logger.error('fetching shipment logs:', error);
    sendError(res, 'Failed to fetch shipment logs', 500);
  }
});

// Global search across all shipment items (for Shipment Bin global search)
app.get('/api/shipment-items/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return sendSuccess(res, { items: [] }, 'Search query too short');
    }

    const items = shipmentItemQueries.globalSearch(q.trim());
    sendSuccess(res, { items }, 'Search completed successfully');
  } catch (error) {
    logger.error('global search shipment items:', error);
    sendError(res, 'Failed to search shipment items', 500);
  }
});

// Get shipment log by ID with items
app.get('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const log = shipmentLogQueries.getById(id);
    if (!log) {
      return sendError(res, 'Shipment log not found', 404);
    }
    const items = shipmentItemQueries.getByLogId(id);
    const notFoundScans = notFoundScanQueries.getByLogId(id);
    const notFoundCount = notFoundScans.length;
    sendSuccess(res, { log, items, notFoundScans, notFoundCount }, 'Shipment log fetched successfully');
  } catch (error) {
    logger.error('fetching shipment log:', error);
    sendError(res, 'Failed to fetch shipment log', 500);
  }
});

// Upload CSV shipment log
app.post('/api/shipment-logs/upload', upload.single('file'), (req, res) => {
  try {
    const { shipmentDate, cargoType, uploadedBy } = req.body;

    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
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
      cargoType: cargoType || 'Air Cargo',
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
          code: record['Code'] || record['code'] || record['Courier'] || record['courier'] || null,
          customerName: record['Customer Name'] || record['customer_name'] || record['User Name'] || record['user_name'] || record['Customer'] || record['customer'] || record['Name'] || record['name'] || '',
          altName: record['Alt Name'] || record['alt_name'] || null,
          trackingNumber: record['Tracking Number'] || record['tracking_number'] || record['Tracking'] || record['tracking'] || '',
          weight: parseFloat(record['Weight'] || record['weight'] || record['Weight (LB)'] || record['weight_lb']) || null,
          description: record['Description'] || record['description'] || null,
          status: 'pending',
        });
        successCount++;
      } catch (err) {
        logger.error('inserting item:', err);
        errorCount++;
      }
    }

    sendSuccess(res, {
      shipmentLogId,
      itemsProcessed: successCount,
      itemsFailed: errorCount,
      totalItems: records.length,
    }, 'Shipment log uploaded successfully', 201);
  } catch (error) {
    logger.error('uploading shipment log:', error);
    sendError(res, 'Failed to upload shipment log', 500);
  }
});

// Scan tracking number
app.post('/api/shipment-logs/scan', (req, res) => {
  try {
    const { trackingNumber, currentLogId, scannedBy } = req.body;

    if (!trackingNumber) {
      return sendError(res, 'Tracking number is required', 400);
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

      return sendSuccess(res, { status: 'not_found' }, 'Tracking number not found in any shipment log');
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

          logger.info(`Dual update: Package ${matchingPackage.package_id} status updated to "Processing in Office"`);
        } else {
          logger.debug(`No matching package found for tracking number: ${trackingNumber}`);
        }
      } catch (updateError) {
        logger.error('updating customer package status:', updateError);
        // Don't fail the whole request if package update fails
      }

      return sendSuccess(res, {
        status: 'received',
        item: currentLogItem,
      }, 'Package marked as received');
    }

    // It's in a different log
    const otherLogItem = matchingItems[0];
    const otherLog = shipmentLogQueries.getById(otherLogItem.shipment_log_id);

    return sendSuccess(res, {
      status: 'found_in_other_log',
      item: otherLogItem,
      log: otherLog,
    }, `Package found in shipment log: ${otherLog.log_name} (${otherLog.shipment_date})`);
  } catch (error) {
    logger.error('scanning tracking number:', error);
    sendError(res, 'Failed to scan tracking number', 500);
  }
});

// Move item to current log
app.post('/api/shipment-logs/move-item', (req, res) => {
  try {
    const { itemId, newLogId } = req.body;

    if (!itemId || !newLogId) {
      return sendError(res, 'Item ID and new log ID are required', 400);
    }

    shipmentItemQueries.moveToLog(itemId, newLogId);

    sendSuccess(res, {}, 'Item moved to current shipment log');
  } catch (error) {
    logger.error('moving item:', error);
    sendError(res, 'Failed to move item', 500);
  }
});

// Delete shipment item
app.delete('/api/shipment-items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'Item ID is required', 400);
    }

    shipmentItemQueries.delete(id);

    sendSuccess(res, {}, 'Shipment item deleted successfully');
  } catch (error) {
    logger.error('deleting shipment item:', error);
    sendError(res, 'Failed to delete shipment item', 500);
  }
});

// Add new shipment item
app.post('/api/shipment-items', (req, res) => {
  try {
    const { shipmentLogId, packageId, code, customerName, altName, trackingNumber, weight, description } = req.body;

    if (!shipmentLogId || !customerName || !trackingNumber) {
      return sendError(res, 'Shipment log ID, customer name, and tracking number are required', 400);
    }

    const result = shipmentItemQueries.create({
      shipmentLogId,
      packageId: packageId || null,
      code: code || null,
      customerName,
      altName: altName || null,
      trackingNumber,
      weight: weight || null,
      description: description || null,
      status: 'pending',
    });

    sendSuccess(res, { itemId: result.lastInsertRowid }, 'Shipment item added successfully', 201);
  } catch (error) {
    logger.error('adding shipment item:', error);
    sendError(res, 'Failed to add shipment item', 500);
  }
});

// Update shipment item
app.put('/api/shipment-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, altName, trackingNumber, packageId, weight } = req.body;

    if (!customerName || !trackingNumber) {
      return sendError(res, 'Customer name and tracking number are required', 400);
    }

    shipmentItemQueries.update(id, {
      customerName,
      altName,
      trackingNumber,
      packageId,
      weight
    });

    sendSuccess(res, {}, 'Shipment item updated successfully');
  } catch (error) {
    logger.error('updating shipment item:', error);
    sendError(res, 'Failed to update shipment item', 500);
  }
});

// Update shipment item status
app.patch('/api/shipment-items/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendError(res, 'Status is required', 400);
    }

    shipmentItemQueries.updateStatus(id, status);

    sendSuccess(res, {}, 'Status updated successfully');
  } catch (error) {
    logger.error('updating shipment item status:', error);
    sendError(res, 'Failed to update status', 500);
  }
});

// Update shipment log
app.put('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { logName, shipmentDate } = req.body;

    if (!logName || !shipmentDate) {
      return sendError(res, 'Log name and shipment date are required', 400);
    }

    shipmentLogQueries.update(id, { logName, shipmentDate });

    sendSuccess(res, {}, 'Shipment log updated successfully');
  } catch (error) {
    logger.error('updating shipment log:', error);
    sendError(res, 'Failed to update shipment log', 500);
  }
});

// Delete shipment log
app.delete('/api/shipment-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    shipmentLogQueries.delete(id);
    sendSuccess(res, {}, 'Shipment log deleted successfully');
  } catch (error) {
    logger.error('deleting shipment log:', error);
    sendError(res, 'Failed to delete shipment log', 500);
  }
});

// Archive a shipment log
app.patch('/api/shipment-logs/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const log = shipmentLogQueries.getById(id);
    if (!log) {
      return sendError(res, 'Shipment log not found', 404);
    }
    shipmentLogQueries.archive(id);
    sendSuccess(res, {}, 'Shipment log archived successfully');
  } catch (error) {
    logger.error('archiving shipment log:', error);
    sendError(res, 'Failed to archive shipment log', 500);
  }
});

// Unarchive a shipment log
app.patch('/api/shipment-logs/:id/unarchive', (req, res) => {
  try {
    const { id } = req.params;
    const log = shipmentLogQueries.getById(id);
    if (!log) {
      return sendError(res, 'Shipment log not found', 404);
    }
    shipmentLogQueries.unarchive(id);
    sendSuccess(res, {}, 'Shipment log unarchived successfully');
  } catch (error) {
    logger.error('unarchiving shipment log:', error);
    sendError(res, 'Failed to unarchive shipment log', 500);
  }
});

// Get all not found scans across all logs
app.get('/api/not-found-scans', (req, res) => {
  try {
    const scans = notFoundScanQueries.getAll();
    sendSuccess(res, { scans }, 'Not found scans fetched successfully');
  } catch (error) {
    logger.error('fetching not found scans:', error);
    sendError(res, 'Failed to fetch not found scans', 500);
  }
});

// Add a not found scan to a shipment log
app.post('/api/shipment-items/add-not-found', (req, res) => {
  try {
    const { shipmentLogId, trackingNumber, customerName, altName, weight, scannedBy } = req.body;

    if (!shipmentLogId || !trackingNumber || !customerName) {
      return sendError(res, 'Shipment log ID, tracking number, and customer name are required', 400);
    }

    // Add the item to the shipment log
    const result = shipmentItemQueries.create({
      shipmentLogId,
      trackingNumber,
      customerName,
      altName: altName || '',
      packageId: null,
      weight: weight || null,
      status: 'pending',
    });

    // Delete the not found scan record since it's now been added to a log
    notFoundScanQueries.deleteByTracking(trackingNumber);

    sendSuccess(res, { itemId: result.lastInsertRowid }, 'Package added to shipment log successfully', 201);
  } catch (error) {
    logger.error('adding not found scan to log:', error);
    sendError(res, 'Failed to add package to log', 500);
  }
});

// Delete a not found scan
app.delete('/api/not-found-scans/:id', (req, res) => {
  try {
    const { id } = req.params;
    notFoundScanQueries.delete(id);
    sendSuccess(res, {}, 'Not found scan deleted successfully');
  } catch (error) {
    logger.error('deleting not found scan:', error);
    sendError(res, 'Failed to delete not found scan', 500);
  }
});

// ==================== BILLING CONSOLE ENDPOINTS ====================

// Get all shipment items for billing console (from all shipment logs)
app.get('/api/billing/all', (req, res) => {
  try {
    const items = shipmentItemQueries.getAllWithLogInfo();
    sendSuccess(res, { items }, 'Billing items fetched successfully');
  } catch (error) {
    logger.error('fetching all billing items:', error);
    sendError(res, 'Failed to fetch billing items', 500);
  }
});

// Search shipment items for billing console
app.get('/api/billing/search', (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return sendError(res, 'Search query is required', 400);
    }

    const items = shipmentItemQueries.search(query.trim());
    sendSuccess(res, { items }, 'Search completed successfully');
  } catch (error) {
    logger.error('searching billing items:', error);
    sendError(res, 'Failed to search billing items', 500);
  }
});

// Get all billing items
app.get('/api/billing/items', (req, res) => {
  try {
    const items = shipmentItemQueries.getBillingItems();
    sendSuccess(res, { items }, 'Billing items fetched successfully');
  } catch (error) {
    logger.error('fetching billing items:', error);
    sendError(res, 'Failed to fetch billing items', 500);
  }
});

// Get billing stats
app.get('/api/billing/stats', (req, res) => {
  try {
    const stats = shipmentItemQueries.getBillingStats();
    sendSuccess(res, { stats }, 'Billing stats fetched successfully');
  } catch (error) {
    logger.error('fetching billing stats:', error);
    sendError(res, 'Failed to fetch billing stats', 500);
  }
});

// Get billing item details by ID
app.get('/api/billing/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = shipmentItemQueries.getByTracking(id);

    if (!item || item.length === 0) {
      return sendError(res, 'Billing item not found', 404);
    }

    sendSuccess(res, { item: item[0] }, 'Billing item fetched successfully');
  } catch (error) {
    logger.error('fetching billing item:', error);
    sendError(res, 'Failed to fetch billing item', 500);
  }
});

// Bill a shipment item
app.post('/api/billing/bill/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customFee, processingFee, packageCost, billedBy } = req.body;

    if (!id) {
      return sendError(res, 'Item ID is required', 400);
    }

    shipmentItemQueries.bill(id, {
      customFee: parseFloat(customFee) || 0,
      processingFee: parseFloat(processingFee) || 0,
      packageCost: parseFloat(packageCost) || 0,
      billedBy: billedBy || 'System',
    });

    sendSuccess(res, {}, 'Item billed successfully');
  } catch (error) {
    logger.error('billing item:', error);
    sendError(res, 'Failed to bill item', 500);
  }
});

// Collect payment for a shipment item
app.post('/api/billing/collect/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amountPaid, lateFee, notes, collectedBy } = req.body;

    if (!id || !paymentMethod || amountPaid === undefined) {
      return sendError(res, 'Item ID, payment method, and amount paid are required', 400);
    }

    // Get current item to calculate total
    const currentItem = shipmentItemQueries.getById(id);
    if (!currentItem) {
      return sendError(res, 'Item not found', 404);
    }

    const packageCost = (currentItem.custom_fee || 0) + (currentItem.processing_fee || 0) + (currentItem.package_cost || 0);

    shipmentItemQueries.collect(currentItem.id, {
      paymentMethod,
      amountPaid: parseFloat(amountPaid),
      lateFee: parseFloat(lateFee) || 0,
      notes: notes || null,
      collectedBy: collectedBy || 'System',
      packageCost,
    });

    sendSuccess(res, {}, 'Payment collected successfully');
  } catch (error) {
    logger.error('collecting payment:', error);
    sendError(res, 'Failed to collect payment', 500);
  }
});

// Update billing status
app.patch('/api/billing/status/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy } = req.body;

    if (!id || !status) {
      return sendError(res, 'Item ID and status are required', 400);
    }

    if (!['Open', 'Closed', 'Partial', 'unbilled'].includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }

    shipmentItemQueries.updateBillingStatus(id, status, updatedBy || 'System');

    sendSuccess(res, {}, 'Billing status updated successfully');
  } catch (error) {
    logger.error('updating billing status:', error);
    sendError(res, 'Failed to update billing status', 500);
  }
});

// Get Daily Summary data from Billing Console transactions
app.get('/api/daily-summary', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build the query to get collections from shipment_items
    let query = `
      SELECT
        date(collection_date) as date,
        payment_method,
        SUM(amount_paid) as total_amount,
        collected_by
      FROM shipment_items
      WHERE collection_date IS NOT NULL
        AND payment_method IS NOT NULL
        AND amount_paid > 0
    `;

    const params = [];

    if (startDate) {
      query += ` AND date(collection_date) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date(collection_date) <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY date(collection_date), payment_method ORDER BY date(collection_date) DESC`;

    const results = db.prepare(query).all(...params);

    // Also get Credit Card orders from orders table (with currency)
    let ordersQuery = `
      SELECT
        date as date,
        method as payment_method,
        currency,
        SUM(cost) as total_amount,
        updated_by as collected_by
      FROM orders
      WHERE method = 'Credit Card'
    `;

    const ordersParams = [];

    if (startDate) {
      ordersQuery += ` AND date >= ?`;
      ordersParams.push(startDate);
    }

    if (endDate) {
      ordersQuery += ` AND date <= ?`;
      ordersParams.push(endDate);
    }

    ordersQuery += ` GROUP BY date, currency ORDER BY date DESC`;

    const orderResults = db.prepare(ordersQuery).all(...ordersParams);

    sendSuccess(res, {
      billingTransactions: results,
      creditCardOrders: orderResults
    }, 'Daily summary fetched successfully');
  } catch (error) {
    logger.error('fetching daily summary:', error);
    sendError(res, 'Failed to fetch daily summary', 500);
  }
});

// Calculate and update late fee for an item
app.post('/api/billing/late-fee/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, 'Item ID is required', 400);
    }

    const result = shipmentItemQueries.updateLateFee(id);

    if (!result) {
      return sendError(res, 'Item not found or not billed yet', 404);
    }

    sendSuccess(res, {}, 'Late fee updated successfully');
  } catch (error) {
    logger.error('updating late fee:', error);
    sendError(res, 'Failed to update late fee', 500);
  }
});

// Bulk update late fees for all billed items
app.post('/api/billing/late-fees/bulk-update', (req, res) => {
  try {
    const billedItems = shipmentItemQueries.getBillingItems();
    let updatedCount = 0;

    for (const item of billedItems) {
      if (item.bill_date) {
        shipmentItemQueries.updateLateFee(item.id);
        updatedCount++;
      }
    }

    sendSuccess(res, { updatedCount }, `Late fees updated for ${updatedCount} items`);
  } catch (error) {
    logger.error('bulk updating late fees:', error);
    sendError(res, 'Failed to bulk update late fees', 500);
  }
});

// Edit billing item details
app.put('/api/billing/edit/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerName,
      altName,
      weight,
      customFee,
      processingFee,
      packageCost,
      lateFee,
      paymentMethod,
      billingNotes,
      updatedBy
    } = req.body;

    if (!id) {
      return sendError(res, 'Item ID is required', 400);
    }

    shipmentItemQueries.editBillingItem(id, {
      customerName,
      altName,
      weight: parseFloat(weight) || 0,
      customFee: parseFloat(customFee) || 0,
      processingFee: parseFloat(processingFee) || 0,
      packageCost: parseFloat(packageCost) || 0,
      lateFee: parseFloat(lateFee) || 0,
      paymentMethod: paymentMethod || null,
      billingNotes: billingNotes || null,
      updatedBy: updatedBy || 'System',
    });

    sendSuccess(res, {}, 'Billing item updated successfully');
  } catch (error) {
    logger.error('editing billing item:', error);
    sendError(res, 'Failed to edit billing item', 500);
  }
});

// ==================== ROLES ENDPOINTS ====================

// Get all roles
app.get('/api/roles', (req, res) => {
  try {
    const roles = roleQueries.getAll();
    sendSuccess(res, { roles }, 'Roles fetched successfully');
  } catch (error) {
    logger.error('fetching roles:', error);
    sendError(res, 'Failed to fetch roles', 500);
  }
});

// Get role by ID
app.get('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const role = roleQueries.getById(id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }
    const permissions = permissionQueries.getByRoleId(id);
    sendSuccess(res, { role, permissions }, 'Role fetched successfully');
  } catch (error) {
    logger.error('fetching role:', error);
    sendError(res, 'Failed to fetch role', 500);
  }
});

// Create role
app.post('/api/roles', (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return sendError(res, 'Role name is required', 400);
    }

    const result = roleQueries.create({ name, description, isSystem: false });
    sendSuccess(res, { roleId: result.lastInsertRowid }, 'Role created successfully', 201);
  } catch (error) {
    logger.error('creating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendError(res, 'A role with this name already exists', 400);
    }
    sendError(res, 'Failed to create role', 500);
  }
});

// Update role
app.put('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return sendError(res, 'Role name is required', 400);
    }

    const role = roleQueries.getById(id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (role.is_system === 1) {
      return sendError(res, 'Cannot modify system roles', 403);
    }

    roleQueries.update(id, { name, description });
    sendSuccess(res, {}, 'Role updated successfully');
  } catch (error) {
    logger.error('updating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendError(res, 'A role with this name already exists', 400);
    }
    sendError(res, 'Failed to update role', 500);
  }
});

// Delete role
app.delete('/api/roles/:id', (req, res) => {
  try {
    const { id } = req.params;

    const role = roleQueries.getById(id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (role.is_system === 1) {
      return sendError(res, 'Cannot delete system roles', 403);
    }

    roleQueries.delete(id);
    sendSuccess(res, {}, 'Role deleted successfully');
  } catch (error) {
    logger.error('deleting role:', error);
    sendError(res, 'Failed to delete role', 500);
  }
});

// Duplicate role
app.post('/api/roles/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return sendError(res, 'New role name is required', 400);
    }

    const originalRole = roleQueries.getById(id);
    if (!originalRole) {
      return sendError(res, 'Role not found', 404);
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

    sendSuccess(res, { roleId: newRoleId }, 'Role duplicated successfully', 201);
  } catch (error) {
    logger.error('duplicating role:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendError(res, 'A role with this name already exists', 400);
    }
    sendError(res, 'Failed to duplicate role', 500);
  }
});

// ==================== ROLE SETTINGS ENDPOINTS ====================

// Get all role settings (with permissions) - cached
app.get('/api/role-settings', (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get('roleSettings');
    if (cachedData) {
      logger.debug('Serving role settings from cache');
      return sendSuccess(res, { roleSettings: cachedData }, 'Role settings fetched successfully');
    }

    const roleSettings = roleSettingsQueries.getAll();

    // Cache the result
    cache.set('roleSettings', roleSettings);
    logger.debug('Cached role settings data');

    sendSuccess(res, { roleSettings }, 'Role settings fetched successfully');
  } catch (error) {
    logger.error('fetching role settings:', error);
    sendError(res, 'Failed to fetch role settings', 500);
  }
});

// Get role settings by role name
app.get('/api/role-settings/:roleName', (req, res) => {
  try {
    const { roleName } = req.params;
    const roleSettings = roleSettingsQueries.getByRoleName(roleName);

    if (!roleSettings) {
      return sendError(res, 'Role settings not found', 404);
    }

    sendSuccess(res, { roleSettings }, 'Role settings fetched successfully');
  } catch (error) {
    logger.error('fetching role settings:', error);
    sendError(res, 'Failed to fetch role settings', 500);
  }
});

// Update role permissions
app.put('/api/role-settings/:roleName/permissions', (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return sendError(res, 'Permissions are required', 400);
    }

    const existingRole = roleSettingsQueries.getByRoleName(roleName);
    if (!existingRole) {
      return sendError(res, 'Role settings not found', 404);
    }

    roleSettingsQueries.updatePermissions(roleName, permissions);

    // Invalidate role settings cache
    cache.invalidate('roleSettings');

    // Update custom_permissions for all users with this role
    const usersWithRole = userQueries.getAll().filter(u => u.role === roleName);
    for (const user of usersWithRole) {
      userQueries.update(user.id, {
        ...user,
        customPermissions: permissions
      });
    }

    sendSuccess(res, { usersUpdated: usersWithRole.length }, `Role permissions updated successfully. ${usersWithRole.length} users updated.`);
  } catch (error) {
    logger.error('updating role permissions:', error);
    sendError(res, 'Failed to update role permissions', 500);
  }
});

// ==================== PERMISSIONS ENDPOINTS ====================

// Get all permissions
app.get('/api/permissions', (req, res) => {
  try {
    const permissions = permissionQueries.getAll();
    sendSuccess(res, { permissions }, 'Permissions fetched successfully');
  } catch (error) {
    logger.error('fetching permissions:', error);
    sendError(res, 'Failed to fetch permissions', 500);
  }
});

// Assign permissions to role
app.post('/api/roles/:id/permissions', (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      return sendError(res, 'Permission IDs must be an array', 400);
    }

    const role = roleQueries.getById(id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    rolePermissionQueries.assignPermissions(id, permissionIds);
    sendSuccess(res, {}, 'Permissions assigned successfully');
  } catch (error) {
    logger.error('assigning permissions:', error);
    sendError(res, 'Failed to assign permissions', 500);
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

    sendSuccess(res, { config: config || {} }, 'API configuration fetched successfully');
  } catch (error) {
    logger.error('fetching API config:', error);
    sendError(res, 'Failed to fetch API configuration', 500);
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

    sendSuccess(res, {}, 'API configuration updated successfully');
  } catch (error) {
    logger.error('updating API config:', error);
    sendError(res, 'Failed to update API configuration', 500);
  }
});

// Test API connection
app.post('/api/settings/api-config/test', async (req, res) => {
  try {
    const config = apiConfigQueries.get();

    if (!config || !config.base_url) {
      return sendError(res, 'API base URL not configured', 400);
    }

    if (!config.email || !config.password) {
      return sendError(res, 'API credentials (email and password) not configured', 400);
    }

    // Test authentication with the Courier Depot API
    // Configure HTTPS agent for proxy and SSL support
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates if needed
    });

    // Axios will automatically use HTTP_PROXY and HTTPS_PROXY environment variables
    const response = await axios.post(`${config.base_url}/api/auth/signin`, {
      email: config.email,
      password: config.password,
    }, {
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent,
      proxy: false, // Let environment variables handle proxy
    });

    // Check if authentication was successful
    if (response.data && (response.data.success || response.data.token || response.data.user)) {
      sendSuccess(res, {}, 'API connection and authentication successful!');
    } else {
      sendSuccess(res, {}, 'Connection successful but unexpected response format');
    }
  } catch (error) {
    logger.error('API connection test failed:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    sendError(res, errorMessage, 500, { code: 'API_CONNECTION_FAILED' });
  }
});

// Get API sync logs
app.get('/api/settings/sync-logs', (req, res) => {
  try {
    const logs = apiSyncLogQueries.getAll(10);
    sendSuccess(res, { logs }, 'Sync logs fetched successfully');
  } catch (error) {
    logger.error('fetching sync logs:', error);
    sendError(res, 'Failed to fetch sync logs', 500);
  }
});

// ==================== COURIER DEPOT API PROXY ENDPOINTS ====================

// Proxy: Sign in to Courier Depot API
app.post('/api/courier-depot/signin', async (req, res) => {
  try {
    const config = apiConfigQueries.get();

    if (!config || !config.base_url || !config.email || !config.password) {
      return sendError(res, 'Courier Depot API not configured. Please configure in Settings.', 400);
    }

    // Authenticate with Courier Depot API
    const response = await axios.post(`${config.base_url}/api/auth/signin`, {
      email: config.email,
      password: config.password,
    }, {
      timeout: config.timeout || 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    sendSuccess(res, response.data, 'Authentication successful');
  } catch (error) {
    logger.error('Courier Depot signin failed:', error);
    sendError(res, error.response?.data?.message || error.message, error.response?.status || 500, { code: 'AUTH_FAILED' });
  }
});

// Proxy: Fetch packages from Courier Depot API
app.post('/api/courier-depot/sync-packages', async (req, res) => {
  try {
    const config = apiConfigQueries.get();
    const { accessToken } = req.body;

    if (!config || !config.base_url || !config.user_id) {
      return sendError(res, 'Courier Depot API not configured. Please configure API settings.', 400);
    }

    if (!accessToken) {
      return sendError(res, 'Access token is required', 400);
    }

    // Fetch packages from Courier Depot API using user_id from config
    const response = await axios.get(`${config.base_url}/userpackage/${config.user_id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: config.timeout || 30000,
    });

    const packages = response.data;

    // Extract actual package count from nested structure
    const packageList = packages?.packages?.packlist || packages?.packlist || packages;
    const packageCount = Array.isArray(packageList) ? packageList.length : 0;

    // Log the sync
    apiSyncLogQueries.create({
      status: 'success',
      message: `Fetched ${packageCount} packages from Courier Depot API`,
      syncedBy: req.body.syncedBy || 'System',
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 0,
    });

    sendSuccess(res, { packages }, `Fetched ${packageCount} packages successfully`);
  } catch (error) {
    logger.error('Courier Depot package fetch failed:', error);

    // Log the failed sync
    apiSyncLogQueries.create({
      status: 'error',
      message: `Failed to fetch packages: ${error.message}`,
      syncedBy: req.body.syncedBy || 'System',
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 1,
    });

    sendError(res, error.response?.data?.message || error.message, error.response?.status || 500, { code: 'SYNC_FAILED' });
  }
});

// ==================== DELIVERY REQUEST ENDPOINTS ====================

// Get all delivery requests
app.get('/api/delivery-requests', (req, res) => {
  try {
    const requests = deliveryRequestQueries.getAll().map((request) => ({
      id: request.id,
      customerName: request.customer_name,
      customerPhone: request.customer_phone,
      address: request.address,
      packageCount: request.package_count,
      scheduledDate: request.scheduled_date,
      deliveryCost: request.delivery_cost,
      paymentType: request.payment_type,
      status: request.status,
      notes: request.notes,
      createdBy: request.created_by,
      updatedBy: request.updated_by,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    }));
    sendSuccess(res, { requests }, 'Delivery requests fetched successfully');
  } catch (error) {
    logger.error('fetching delivery requests:', error);
    sendError(res, 'Failed to fetch delivery requests', 500);
  }
});

// Get delivery requests by status
app.get('/api/delivery-requests/status/:status', (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['Pending', 'Scheduled', 'In Transit', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status value', 400);
    }

    const requests = deliveryRequestQueries.getByStatus(status).map((request) => ({
      id: request.id,
      customerName: request.customer_name,
      customerPhone: request.customer_phone,
      address: request.address,
      packageCount: request.package_count,
      scheduledDate: request.scheduled_date,
      deliveryCost: request.delivery_cost,
      paymentType: request.payment_type,
      status: request.status,
      notes: request.notes,
      createdBy: request.created_by,
      updatedBy: request.updated_by,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    }));
    sendSuccess(res, { requests }, 'Delivery requests fetched successfully');
  } catch (error) {
    logger.error('fetching delivery requests by status:', error);
    sendError(res, 'Failed to fetch delivery requests', 500);
  }
});

// Get delivery request by ID
app.get('/api/delivery-requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const request = deliveryRequestQueries.getById(id);

    if (!request) {
      return sendError(res, 'Delivery request not found', 404);
    }

    sendSuccess(res, {
      request: {
        id: request.id,
        customerName: request.customer_name,
        customerPhone: request.customer_phone,
        address: request.address,
        packageCount: request.package_count,
        scheduledDate: request.scheduled_date,
        deliveryCost: request.delivery_cost,
        paymentType: request.payment_type,
        status: request.status,
        notes: request.notes,
        createdBy: request.created_by,
        updatedBy: request.updated_by,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      }
    }, 'Delivery request fetched successfully');
  } catch (error) {
    logger.error('fetching delivery request:', error);
    sendError(res, 'Failed to fetch delivery request', 500);
  }
});

// Create delivery request
app.post('/api/delivery-requests', (req, res) => {
  try {
    const { customerName, customerPhone, address, packageCount, scheduledDate, deliveryCost, paymentType, notes, createdBy } = req.body;

    if (!customerName || !customerPhone || !address || !scheduledDate) {
      return sendError(res, 'Customer name, phone, address, and scheduled date are required', 400);
    }

    const result = deliveryRequestQueries.create({
      customerName,
      customerPhone,
      address,
      packageCount: packageCount || 1,
      scheduledDate,
      deliveryCost: deliveryCost || 0,
      paymentType: paymentType || 'Cash On Delivery',
      notes,
      createdBy,
    });

    sendSuccess(res, { requestId: result.lastInsertRowid }, 'Delivery request created successfully', 201);
  } catch (error) {
    logger.error('creating delivery request:', error);
    sendError(res, 'Failed to create delivery request', 500);
  }
});

// Update delivery request
app.put('/api/delivery-requests/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerPhone, address, packageCount, scheduledDate, deliveryCost, paymentType, status, notes, updatedBy } = req.body;

    const existing = deliveryRequestQueries.getById(id);
    if (!existing) {
      return sendError(res, 'Delivery request not found', 404);
    }

    if (!customerName || !customerPhone || !address || !scheduledDate) {
      return sendError(res, 'Customer name, phone, address, and scheduled date are required', 400);
    }

    deliveryRequestQueries.update(id, {
      customerName,
      customerPhone,
      address,
      packageCount: packageCount || 1,
      scheduledDate,
      deliveryCost: deliveryCost || 0,
      paymentType: paymentType || 'Cash On Delivery',
      status: status || existing.status,
      notes,
      updatedBy,
    });

    sendSuccess(res, {}, 'Delivery request updated successfully');
  } catch (error) {
    logger.error('updating delivery request:', error);
    sendError(res, 'Failed to update delivery request', 500);
  }
});

// Update delivery request status
app.patch('/api/delivery-requests/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, updatedBy } = req.body;

    const validStatuses = ['Pending', 'Scheduled', 'In Transit', 'Delivered', 'Cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, 'Invalid status value. Must be: Pending, Scheduled, In Transit, Delivered, or Cancelled', 400);
    }

    const existing = deliveryRequestQueries.getById(id);
    if (!existing) {
      return sendError(res, 'Delivery request not found', 404);
    }

    deliveryRequestQueries.updateStatus(id, status, updatedBy);

    sendSuccess(res, {}, 'Delivery request status updated successfully');
  } catch (error) {
    logger.error('updating delivery request status:', error);
    sendError(res, 'Failed to update delivery request status', 500);
  }
});

// Delete delivery request
app.delete('/api/delivery-requests/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = deliveryRequestQueries.getById(id);
    if (!existing) {
      return sendError(res, 'Delivery request not found', 404);
    }

    deliveryRequestQueries.delete(id);

    sendSuccess(res, {}, 'Delivery request deleted successfully');
  } catch (error) {
    logger.error('deleting delivery request:', error);
    sendError(res, 'Failed to delete delivery request', 500);
  }
});

// ==================== MAINTENANCE MODE ENDPOINTS ====================

// Toggle maintenance mode
app.patch('/api/settings/maintenance-mode', (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return sendError(res, 'Enabled must be a boolean value', 400);
    }

    apiConfigQueries.toggleMaintenanceMode(enabled);
    sendSuccess(res, { maintenanceMode: enabled }, `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`);
  } catch (error) {
    logger.error('toggling maintenance mode:', error);
    sendError(res, 'Failed to toggle maintenance mode', 500);
  }
});

// Get maintenance mode status
app.get('/api/settings/maintenance-mode', (req, res) => {
  try {
    const config = apiConfigQueries.get();
    const maintenanceMode = config ? config.maintenance_mode === 1 : false;
    sendSuccess(res, { maintenanceMode }, 'Maintenance mode status fetched successfully');
  } catch (error) {
    logger.error('fetching maintenance mode:', error);
    sendError(res, 'Failed to fetch maintenance mode status', 500);
  }
});

// Get page visibility settings
app.get('/api/settings/page-visibility', (req, res) => {
  try {
    const config = apiConfigQueries.get();
    let pageVisibility = {
      dashboard: true,
      packages: true,
      'shipment-bin': true,
      orders: true,
      summary: true
    };

    if (config && config.page_visibility) {
      try {
        pageVisibility = JSON.parse(config.page_visibility);
      } catch (e) {
        logger.error('parsing page visibility:', e);
      }
    }

    sendSuccess(res, { pageVisibility }, 'Page visibility settings fetched successfully');
  } catch (error) {
    logger.error('fetching page visibility:', error);
    sendError(res, 'Failed to fetch page visibility settings', 500);
  }
});

// Update page visibility settings
app.put('/api/settings/page-visibility', (req, res) => {
  try {
    const { pageVisibility } = req.body;

    if (!pageVisibility || typeof pageVisibility !== 'object') {
      return sendError(res, 'Invalid page visibility data', 400);
    }

    // Get current config and update page_visibility
    const config = apiConfigQueries.get();
    if (config) {
      db.prepare(`UPDATE api_config SET page_visibility = ? WHERE id = ?`)
        .run(JSON.stringify(pageVisibility), config.id);
    } else {
      // Insert new config with page visibility
      db.prepare(`INSERT INTO api_config (page_visibility) VALUES (?)`)
        .run(JSON.stringify(pageVisibility));
    }

    sendSuccess(res, { pageVisibility }, 'Page visibility settings saved successfully');
  } catch (error) {
    logger.error('saving page visibility:', error);
    sendError(res, 'Failed to save page visibility settings', 500);
  }
});

app.listen(port, () => {
  console.log(`\nBackend server running on http://localhost:${port}`);
  console.log('Database: SQLite (shipping.db)');
  console.log('Ready to accept requests\n');
});
