# SG Xpress Shipping Dashboard

A comprehensive Vue.js-based shipping management system for SG Xpress with full RBAC (Role-Based Access Control), package tracking, customer management, and API integration capabilities.

## Project Overview

This application is a modern, single-page web application built with Vue 3 and a Node.js/Express backend with SQLite database. It provides a complete shipping management solution with user authentication, role-based permissions, package tracking, customer management, and integration with external courier APIs.

## Technology Stack

### Frontend
- **Vue 3** (Composition API) - Progressive JavaScript framework
- **Vite** - Fast build tool and dev server
- **Vanilla CSS** - Custom CSS with design system variables

### Backend
- **Node.js** with Express - REST API server
- **SQLite** - Lightweight database
- **Axios** - HTTP client for API integration
- **Nodemon** - Development auto-reload

## Project Structure

```
shipping-dashboard/
├── src/
│   ├── App.vue           # Main application component (single-file Vue component)
│   ├── main.js           # Application entry point
│   ├── style.css         # Global styles with design system
│   └── assets/           # Images and static assets
├── backend/
│   ├── server.js         # Express server and API routes
│   ├── database.js       # SQLite database initialization & queries
│   ├── migrations.js     # Database migration runner
│   ├── migrations/       # SQL migration files
│   │   ├── 001_add_roles_permissions.sql
│   │   ├── 002_add_code_description.sql
│   │   ├── 003_add_cargo_type.sql
│   │   ├── 004_add_currency_to_orders.sql
│   │   ├── 005_add_user_id_to_api_config.sql
│   │   ├── 006_add_archived_to_packages.sql
│   │   └── 007_add_courier_depot_fields.sql
│   ├── schema-sqlite.sql # Database schema definition
│   ├── schema.sql        # Original schema reference
│   ├── seed.sql          # Initial data seed
│   ├── seed-permissions.sql # Permission seed data
│   ├── setup-api-config.js  # API configuration setup utility
│   ├── shipping.db       # SQLite database file
│   └── DATABASE.md       # Database documentation
├── asset/                # Design assets and UI reference images
│   ├── icon pack/        # UI icons
│   └── *.png, *.jpg      # UI design references
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── package.json          # Frontend dependencies
└── backend/package.json  # Backend dependencies
```

## Key Features

### 1. Authentication & Authorization
- Secure login system with password hashing
- Session management with localStorage
- Role-based access control (RBAC)
- Three primary roles:
  - **Administrator** (full_control) - Complete system access
  - **Manager** (editor) - Most operations, limited settings access
  - **Users** (view_only) - Read-only with basic operations

### 2. User Management
- Create, edit, and manage users
- Assign roles and custom permissions
- User search and filtering
- Avatar display with initials
- Password reset functionality
- Active/inactive user status

### 3. Role & Permission Management
- Visual role cards showing user counts
- Edit role permissions modal with:
  - 9 permission categories (Package, Customer, Order, etc.)
  - Read/Write/Create granular permissions
  - Apply permission templates (Full Access, Most Access, Limited Access)
  - Permission summary display
  - Master toggle for all permissions

### 4. Package Management
- Track package lifecycle from receipt to delivery
- Package status updates (Processing, In Transit, Delivered, etc.)
- Billing status tracking (Open, Closed, Partial)
- Weight, dimensions, and freight type management
- Package notes and history
- Archive and soft delete functionality
- Integration with Courier Depot API for package sync

### 5. Customer Management
- Customer profiles with contact information
- View customer package history
- Quick customer search and filtering
- Customer-specific package views

### 6. Order Management
- Track customer orders
- Order status management
- Cost and payment tracking
- Merchant and method information

### 7. Collection Management
- Payment collection tracking
- Multiple payment methods support
- Collection history and logs
- Amount paid vs. total cost tracking

### 8. Shipment Bin Management
- Upload shipment logs (Google Sheets)
- Track air and sea cargo shipments
- Scan tracking numbers
- Not-found scan tracking
- Shipment item status management

### 9. API Integration
- Courier Depot API integration
- Configurable API endpoints
- Sign-in authentication
- Package sync functionality
- API sync logs and monitoring
- Test connection feature

### 10. Settings & System Controls
- Maintenance mode toggle
- System-wide environment controls
- API configuration management
- User preferences

## Design System

### Color Palette
- **Primary Blue**: `#002d62` (sgx-blue)
- **Accent Light**: `#00aeef` (sgx-light)
- **Background Gray**: `#f8f9fb` (sgx-gray)

### Typography
- Font sizes: xs (11px) to 5xl (36px)
- Font weights: normal (400) to extrabold (800)
- System font stack with SF Pro Display

### Component Styles
- Consistent border radius (12px, 16px, 20px)
- Card-based UI with shadows
- Gradient buttons and accents
- Modal overlays with backdrop blur
- Responsive grid layouts

## Database Schema

### Core Tables
- `users` - User accounts and authentication
- `roles` - System roles
- `permissions` - Granular permissions
- `role_permissions` - Role-permission mapping
- `customers` - Customer records
- `packages` - Package tracking
- `package_notes` - Package comments
- `orders` - Customer orders
- `collection_logs` - Payment collections
- `shipment_logs` - Shipment manifests
- `shipment_items` - Individual shipment items
- `api_config` - API configuration
- `api_sync_logs` - API sync history

## API Endpoints

### Authentication
- `POST /api/login` - User authentication

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset user password

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Packages
- `GET /api/packages` - List packages
- `POST /api/packages` - Create package
- `PUT /api/packages/:id` - Update package
- `DELETE /api/packages/:id` - Delete package
- `POST /api/packages/:id/notes` - Add package note

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Collections
- `GET /api/collections` - List collection logs
- `POST /api/collections` - Record collection

### Shipments
- `GET /api/shipments` - List shipment logs
- `POST /api/shipments/upload` - Upload shipment data
- `POST /api/shipments/:id/scan` - Scan tracking number

### API Integration
- `GET /api/api-config` - Get API configuration
- `PUT /api/api-config` - Update API configuration
- `POST /api/api-config/test` - Test API connection
- `POST /api/courier-depot/signin` - Authenticate with Courier Depot
- `POST /api/courier-depot/sync-packages` - Sync packages from API
- `GET /api/sync-logs` - Get API sync history

### Settings
- `PATCH /api/settings/maintenance-mode` - Toggle maintenance mode
- `GET /api/settings/maintenance-mode` - Get maintenance mode status

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup

1. **Frontend Setup**
```bash
cd shipping-dashboard
npm install
npm run dev
```

2. **Backend Setup**
```bash
cd backend
npm install
npm run dev
```

### Development Servers
- Frontend: `http://localhost:5173` (Vite default)
- Backend: `http://localhost:3000`

### Database
The SQLite database (`shipping.db`) is automatically created on first run with seed data.

## Recent Updates

### Database Migrations System (November 2025)
- Implemented incremental migration system for database schema changes
- 7 migration files covering roles, permissions, cargo types, currency, API config, and Courier Depot fields
- Migration runner in `migrations.js` tracks applied migrations

### Courier Depot API Integration (November 2025)
- Full integration with Courier Depot external API
- Package sync functionality with field mapping
- API authentication and token management
- Sync logs and monitoring dashboard

### Modal Fix (November 2025)
- Fixed Role Permission Modal not appearing due to incorrect nesting
- Modal was nested inside Password Reset Modal wrapper, causing conditional rendering issue
- Moved modal to be a sibling element with independent `v-if` condition

### Role Display Standardization
- Updated role display names throughout the application
- **Database values**: `full_control`, `editor`, `view_only`
- **Display names**: Administrator, Manager, Users
- Centralized display logic in `getRoleDisplayName()` function
- Updated all UI components (role cards, user table, dropdowns)

### UI Cleanup
- Removed duplicate HTML comments from role cards
- Removed copy buttons from role cards (Edit Role only)
- Consistent color-coded role badges across the application

## Best Practices

### Code Style
- Use Vue 3 Composition API with `<script setup>`
- Reactive state with `ref()` and `reactive()`
- Computed properties for derived state
- Event handlers with `.stop` to prevent propagation

### Security
- Password hashing (implement bcrypt in production)
- SQL injection prevention via parameterized queries
- Input validation on frontend and backend
- Role-based access checks on all sensitive operations

### Performance
- Database indexing on frequently queried fields
- Lazy loading for large datasets
- Optimistic UI updates
- Debounced search inputs

## Future Enhancements

- [ ] Real-time notifications via WebSockets
- [ ] Export functionality (CSV, PDF reports)
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive design improvements
- [ ] Multi-language support (i18n)
- [ ] Dark mode theme
- [ ] Email notifications for package status changes
- [ ] Barcode scanning integration
- [ ] Batch operations for packages
- [ ] Advanced search with filters

## Support

For issues, questions, or feature requests, please contact the development team.

---

**Last Updated**: November 29, 2025
**Version**: 1.1.0
**Maintained by**: SG Xpress Development Team
