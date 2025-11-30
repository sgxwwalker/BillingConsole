# SG Xpress Shipping Database Documentation

## Database Overview

The shipping dashboard now uses **SQLite** for data persistence. All data is stored in a local `shipping.db` file located in the backend directory.

## Database Schema

### Tables

#### 1. **users** - Employee/User Management
```sql
- id (TEXT, PRIMARY KEY): Unique user identifier
- name (TEXT): Full name
- email (TEXT, UNIQUE): Email address
- password (TEXT): Password (plain text - should be hashed in production)
- photo (TEXT): Profile photo URL
- location (TEXT): User location
- role (TEXT): User role (full_control, editor, view_only, custom)
- custom_permissions (TEXT/JSON): Custom permissions if role is 'custom'
- created_at (DATETIME): Record creation timestamp
- updated_at (DATETIME): Last update timestamp
```

#### 2. **customers** - Customer Records
```sql
- id (TEXT, PRIMARY KEY): Customer ID (e.g., C-1201)
- name (TEXT): Customer name
- email (TEXT): Email address
- phone (TEXT): Phone number
- address (TEXT): Physical address
- created_at (DATETIME): Record creation timestamp
- updated_at (DATETIME): Last update timestamp
```

#### 3. **packages** - Package Tracking
```sql
- id (INTEGER, PRIMARY KEY, AUTOINCREMENT): Internal ID
- package_id (TEXT, UNIQUE): Package identifier (e.g., PKG-1001)
- external_package_id (TEXT): External API package ID
- customer_id (TEXT, FOREIGN KEY): References customers(id)
- tracking_number (TEXT): Shipping tracking number
- status (TEXT): Package status
- billing_status (TEXT): Billing status (Open, Closed, Partial)
- weight (REAL): Package weight
- cost (REAL): Package cost
- amount_paid (REAL): Amount paid by customer
- payment_method (TEXT): Payment method used
- freight_type (TEXT): Air or Sea
- description (TEXT): Package description
- date_received (DATE): Date received
- date_updated (DATE): Last update date
- updated_by (TEXT): User who last updated
- collected (INTEGER/BOOLEAN): Whether package was collected
- deleted (INTEGER/BOOLEAN): Soft delete flag
- archived (INTEGER/BOOLEAN): Archive flag
- created_at (DATETIME): Record creation timestamp
- alt_name (TEXT): Alternative customer name
- reason (TEXT): Reason/notes field
- seller (TEXT): Seller information
- length (REAL): Package length
- width (REAL): Package width
- height (REAL): Package height
- cubic_feet (REAL): Cubic feet calculation
- location (TEXT): Current package location
- invoice_url (TEXT): Invoice PDF URL
- package_image_url (TEXT): Package image URL
- pre_alert (INTEGER/BOOLEAN): Pre-alert flag
- email_sent (INTEGER/BOOLEAN): Email notification sent
- paid (INTEGER/BOOLEAN): Payment status
- warehouse_date (DATE): Warehouse received date
```

#### 4. **package_notes** - Package Notes/Comments
```sql
- id (INTEGER, PRIMARY KEY, AUTOINCREMENT): Note ID
- package_id (TEXT, FOREIGN KEY): References packages(package_id)
- note (TEXT): Note content
- created_by (TEXT): User who created the note
- created_at (DATETIME): Note creation timestamp
```

#### 5. **orders** - Customer Orders
```sql
- id (TEXT, PRIMARY KEY): Order ID (e.g., ORD-1001)
- date (DATE): Order date
- customer_name (TEXT): Customer name
- description (TEXT): Order description
- cost (REAL): Order cost
- status (TEXT): Order status (Ordered, Received, etc.)
- merchant (TEXT): Merchant name
- method (TEXT): Payment method
- updated_by (TEXT): Last updater
- created_at (DATETIME): Record creation timestamp
- updated_at (DATETIME): Last update timestamp
```

#### 6. **collection_logs** - Collection History
```sql
- id (INTEGER, PRIMARY KEY, AUTOINCREMENT): Log ID
- package_id (TEXT, FOREIGN KEY): References packages(package_id)
- date (DATE): Collection date
- amount (REAL): Amount collected
- method (TEXT): Payment method
- user_name (TEXT): Collector name
- note (TEXT): Collection note
- created_at (DATETIME): Log creation timestamp
```

#### 7. **api_config** - API Configuration
```sql
- id (INTEGER, PRIMARY KEY): Always 1 (singleton)
- base_url (TEXT): External API base URL
- api_key (TEXT): API key
- path (TEXT): API endpoint path
- method (TEXT): HTTP method
- payload (TEXT): Request payload
- updated_at (DATETIME): Last update timestamp
```

## API Endpoints

### User Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/login` - User login

### Customer Management
- `GET /api/customers` - Get all customers with packages

### Package Management
- `GET /api/packages` - Get all packages
- `POST /api/packages` - Create new package
- `PUT /api/packages/:id` - Update package
- `POST /api/packages/:id/collect` - Mark package as collected
- `DELETE /api/packages/:id` - Soft delete package

### Order Management
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Collection Logs
- `GET /api/collection-logs` - Get collection logs
- `GET /api/collection-logs?date=YYYY-MM-DD` - Get logs by date

### Legacy Endpoints (backwards compatibility)
- `POST /collect` - Collect package
- `GET /customer-packages` - Get customer packages
- `GET /search-customer?q=query` - Search customers

## Database Files

### Created Files:
1. **schema.sql** - PostgreSQL-compatible schema (for reference/migration)
2. **schema-sqlite.sql** - SQLite-specific schema (used by application)
3. **seed.sql** - Initial seed data
4. **database.js** - Database connection and query module
5. **server.js** - Updated API server with database integration
6. **shipping.db** - SQLite database file (auto-created on first run)

## Setup & Running

### Prerequisites
```bash
npm install
```

Dependencies installed:
- `better-sqlite3` - Fast SQLite3 driver
- `pg` - PostgreSQL driver (for future migration)

### Starting the Server
```bash
npm run dev
```

The server will:
1. Initialize the database schema (if not exists)
2. Seed initial data (if database is empty)
3. Start on `http://localhost:4000`

### Database Initialization

On first run, the system will:
- Create all tables
- Create indexes for performance
- Insert seed data (users, customers, packages, orders)

### Seed Data

The database includes:
- **5 Users** with different roles
- **4 Customers** with contact information
- **8 Packages** across different customers
- **Package notes** for tracking
- **2 Sample orders**

## Features

### Data Persistence
- All data is persisted to SQLite database
- Survives server restarts
- No data loss between sessions

### Soft Deletes
- Packages use soft delete (deleted flag)
- Maintains audit trail
- Can be restored if needed

### Audit Trails
- Package notes track all changes
- Collection logs track payments
- updated_by fields track who made changes
- Timestamps track when changes occurred

### Performance Optimizations
- Indexed foreign keys
- Indexed status fields
- Indexed date fields
- Efficient queries with prepared statements

## Database Backup

### Manual Backup
```bash
cp backend/shipping.db backend/shipping_backup_$(date +%Y%m%d).db
```

### Restore from Backup
```bash
cp backend/shipping_backup_YYYYMMDD.db backend/shipping.db
```

## Migration to PostgreSQL (Future)

The `schema.sql` file is PostgreSQL-compatible for future migration. To migrate:

1. Create PostgreSQL database
2. Run schema.sql
3. Export data from SQLite
4. Import to PostgreSQL
5. Update database.js to use `pg` instead of `better-sqlite3`

## Security Considerations

**IMPORTANT**: Current implementation is for development only!

### Production Recommendations:
1. **Hash passwords** - Use bcrypt or argon2
2. **JWT authentication** - Replace plain password auth
3. **Environment variables** - Store sensitive data in .env
4. **Input validation** - Sanitize all user inputs
5. **SQL injection protection** - Already using prepared statements
6. **HTTPS** - Use SSL/TLS in production
7. **Rate limiting** - Prevent abuse
8. **CORS** - Restrict allowed origins

## Monitoring & Maintenance

### Database Size
```bash
ls -lh backend/shipping.db
```

### Query Optimization
SQLite automatically optimizes queries using indexes. Check `.indexes` in SQLite CLI for index usage.

### Performance
- Use prepared statements (already implemented)
- Limit result sets with pagination (TODO)
- Archive old records periodically

## Troubleshooting

### Database locked error
- Check for multiple server instances
- Ensure proper connection closing

### Schema changes
- Modify schema-sqlite.sql
- Delete shipping.db
- Restart server (auto-recreates)

### Seed data issues
- Delete shipping.db to reset
- Server will re-seed on next start

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database file exists
3. Check file permissions
4. Review API endpoint documentation above
