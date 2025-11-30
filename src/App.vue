<template>
  <div v-if="currentPage === 'login'" class="login-shell">
    <div class="login-card">
      <div class="login-logo-container">
        <div class="login-logo">
          <img :src="logo" alt="SG Xpress Shipping logo" />
        </div>
        <h1 class="login-title">SGX Billing Console</h1>
        <p class="login-subtitle">SG Xpress Shipping Management System</p>
      </div>

      <form @submit.prevent="login" class="login-form">
        <div class="form-field">
          <label class="input-label">Username</label>
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="Enter your username"
            required
            autocomplete="username"
            class="login-input"
          />
        </div>

        <div class="form-field">
          <label class="input-label">Password</label>
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
            class="login-input"
          />
        </div>

        <div class="remember-me-container">
          <label class="remember-me-label">
            <input
              v-model="loginForm.rememberMe"
              type="checkbox"
              class="remember-me-checkbox"
            />
            <span>Remember me</span>
          </label>
        </div>

        <p v-if="loginError" class="error-text">{{ loginError }}</p>

        <button class="pill full login-button" type="submit">Sign In</button>
      </form>

      <p class="login-footer">Need access? Contact your system administrator</p>
    </div>
  </div>

  <div v-else class="app-shell">
    <header class="top-nav">
      <div class="nav-left">
        <div class="brand-mark small">
          <img :src="logo" alt="SG Xpress Shipping logo" />
        </div>
        <nav class="top-links">
          <button class="top-link" :class="{ active: currentPage === 'dashboard' }" @click="goTo('dashboard')">Dashboard</button>
          <button class="top-link" :class="{ active: currentPage === 'packages' }" @click="goTo('packages')">Packages</button>
          <button class="top-link" :class="{ active: currentPage === 'shipment-bin' }" @click="goTo('shipment-bin')">Shipment Bin</button>
          <button class="top-link" :class="{ active: currentPage === 'orders' }" @click="goTo('orders')">SGX Order</button>
          <button class="top-link" :class="{ active: currentPage === 'summary' }" @click="goTo('summary')">Daily Summary</button>
          <button v-if="isAdmin" class="top-link" :class="{ active: currentPage === 'settings' }" @click="goTo('settings')">Settings</button>
        </nav>
      </div>
      <div class="nav-right">
        <div class="profile-chip" @click="profileMenuOpen = !profileMenuOpen">
          <div class="avatar"></div>
          <div class="profile-name">{{ currentUser?.name || 'Profile' }}</div>
        </div>
        <div class="profile-menu" v-if="profileMenuOpen">
          <button type="button" @click="goTo('profile')">Profile</button>
          <button type="button" @click="goTo('settings')">Settings</button>
          <button type="button" @click="signOut">Sign Out</button>
        </div>
      </div>
    </header>

    <main class="content with-top-nav">
      <section v-if="currentPage === 'dashboard'" class="panel" id="dashboard">
        <header class="topbar">
          <div class="titles">
            <p class="eyebrow">SG Xpress Shipping</p>
            <h1>SGX Billing Console</h1>
          </div>
        </header>

        <!-- Billing Stats -->
        <div class="grid stats-split">
          <div class="card stat">
            <p class="eyebrow">Unbilled</p>
            <h3>{{ billingStats.unbilled }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Open</p>
            <h3>{{ billingStats.open }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Closed Today</p>
            <h3>{{ billingStats.closedToday }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Collected Today</p>
            <h3>{{ formatCurrency(billingStats.amountCollectedToday) }}</h3>
          </div>
        </div>

        <!-- Search -->
        <div class="search-header no-title">
          <div class="search-box" style="min-width: 400px;">
            <label class="input-label" for="billingSearch">Search by Customer Name, Package ID, or Tracking Number</label>
            <div class="input-shell with-clear">
              <input
                id="billingSearch"
                type="text"
                placeholder="Search..."
                autocomplete="off"
                v-model="billingSearchQuery"
              />
              <button
                v-if="billingSearchQuery"
                type="button"
                class="clear-search-btn"
                @click="billingSearchQuery = ''"
                title="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="action-group">
            <select v-model="billingStatusFilter" class="billing-filter-select">
              <option value="all">All BL Status</option>
              <option value="unbilled">Unbilled</option>
              <option value="Open">Open</option>
              <option value="Partial">Partial</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <!-- Billing Table -->
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Package ID</th>
                <th>Tracking</th>
                <th>Customer</th>
                <th>Alt Name</th>
                <th>Cost</th>
                <th>SL Status</th>
                <th>BL Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredBillingItems.length === 0" class="empty">
                <td colspan="8">{{ billingSearchQuery.trim() ? 'No packages found matching your search.' : 'Search for a customer name, package ID, or tracking number to view packages.' }}</td>
              </tr>
              <tr v-for="item in paginatedBillingItems" :key="item.id">
                <td><strong>{{ item.package_id || item.id }}</strong></td>
                <td>{{ item.tracking_number }}</td>
                <td>{{ item.customer_name }}</td>
                <td>{{ item.alt_name || '—' }}</td>
                <td>{{ formatCurrency(calculateItemCost(item)) }}</td>
                <td>
                  <span class="tag" :class="{
                    'success': item.status === 'received',
                    'secondary': item.status === 'pending',
                    'danger': item.status === 'not_found'
                  }">
                    {{ item.status === 'received' ? 'Received' : item.status === 'pending' ? 'Pending' : item.status === 'not_found' ? 'Not Found' : item.status }}
                  </span>
                </td>
                <td>
                  <div class="bl-status-dropdown" @click.stop>
                    <button
                      class="bl-status-btn"
                      :class="getBLStatusClass(item.billing_status)"
                      @click="toggleBLStatusDropdown(item.id)"
                    >
                      {{ item.billing_status === 'unbilled' || !item.billing_status ? 'Unbilled' : item.billing_status }}
                      <span class="chevron">▼</span>
                    </button>
                    <div v-if="openBLStatusDropdownId === item.id" class="bl-status-menu">
                      <button @click="updateBillingStatus(item, 'unbilled')">Unbilled</button>
                      <button @click="updateBillingStatus(item, 'Open')">Open</button>
                      <button @click="updateBillingStatus(item, 'Partial')">Partial</button>
                      <button @click="updateBillingStatus(item, 'Closed')">Closed</button>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="billing-actions">
                    <button
                      class="pill small"
                      type="button"
                      @click="openBillModal(item)"
                      :disabled="item.billing_status !== 'unbilled' && item.billing_status"
                    >Bill</button>
                    <button
                      class="pill small secondary"
                      type="button"
                      @click="openCollectModal(item)"
                      :disabled="!item.billing_status || item.billing_status === 'unbilled' || item.billing_status === 'Closed'"
                    >Collect</button>
                    <div class="kebab-menu-container">
                      <button class="kebab-btn" @click="toggleBillingKebab(item.id)" type="button" aria-label="More actions">
                        <span class="kebab-dots"><span></span></span>
                      </button>
                      <div v-if="openBillingKebabId === item.id" class="kebab-dropdown">
                        <button @click="openBillingViewModal(item); closeBillingKebab()">View</button>
                        <button @click="openBillingEditModal(item); closeBillingKebab()">Edit</button>
                        <button class="danger" @click="openBillingDeleteModal(item); closeBillingKebab()">Delete</button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="filteredBillingItems.length > billingItemsPerPage" class="billing-pagination">
          <button
            class="pill ghost small"
            :disabled="billingCurrentPage === 1"
            @click="billingCurrentPage--"
          >Previous</button>
          <span class="pagination-info">
            Page {{ billingCurrentPage }} of {{ billingTotalPages }} ({{ filteredBillingItems.length }} items)
          </span>
          <button
            class="pill ghost small"
            :disabled="billingCurrentPage >= billingTotalPages"
            @click="billingCurrentPage++"
          >Next</button>
        </div>
      </section>

      <section v-if="currentPage === 'packages'" class="panel full-page" id="packages">
        <div class="packages-header">
          <div class="packages-header-content">
            <div>
              <h1 class="packages-title">Packages</h1>
              <p class="packages-subtitle">Packages synced with Courier Depot API</p>
            </div>
            <div class="packages-actions">
              <button class="pill ghost" @click="apiSyncPackages" :disabled="isSyncing">
                {{ isSyncing ? 'Syncing...' : 'Pull from SaaS' }}
              </button>
              <button class="pill" disabled>Push Changes (0)</button>
            </div>
          </div>
        </div>

        <div class="packages-grid">
          <!-- API Connection Status Card -->
          <div class="packages-card packages-card-status">
            <div class="packages-card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <p class="packages-card-label">API Connection</p>
              <p class="packages-card-value">{{ apiConfigForm.baseUrl && apiConfigForm.email ? 'Connected to Courier Depot' : 'Not Connected' }}</p>
              <p class="packages-card-meta">{{ apiConfigForm.baseUrl || 'https://api.courierdepotja.com' }}</p>
            </div>
          </div>

          <!-- Statistics Cards -->
          <div class="packages-card">
            <div class="packages-stat">
              <p class="packages-stat-value">{{ allPackagesForPackagesPage.length }}</p>
              <p class="packages-stat-label">Total Packages</p>
            </div>
          </div>

          <div class="packages-card">
            <div class="packages-stat">
              <p class="packages-stat-value packages-stat-success">{{ syncedPackagesCount }}</p>
              <p class="packages-stat-label">Synced</p>
            </div>
          </div>

          <div class="packages-card">
            <div class="packages-stat">
              <p class="packages-stat-value packages-stat-warning">0</p>
              <p class="packages-stat-label">Pending Push</p>
            </div>
          </div>

          <!-- Last Sync Card -->
          <div class="packages-card packages-card-sync">
            <p class="packages-card-label">Last Sync</p>
            <p class="packages-card-value">{{ lastSyncTime || 'Never' }}</p>
            <p class="packages-card-meta">{{ lastSyncDetails || 'No sync performed yet' }}</p>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="packages-controls">
          <input
            v-model="packagesSearchQuery"
            type="text"
            class="packages-search"
            placeholder="Search by tracking, customer, or code..."
          />
          <div class="packages-filters">
            <button
              v-for="filter in packageFilters"
              :key="filter.key"
              class="packages-filter-btn"
              :class="{ active: packagesActiveFilter === filter.key }"
              @click="packagesActiveFilter = filter.key"
            >
              {{ filter.label }} ({{ filter.count }})
            </button>
          </div>
        </div>

        <!-- Packages Table -->
        <div class="packages-table-shell">
          <table class="packages-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Package ID</th>
                <th>Tracking</th>
                <th>Customer</th>
                <th>Name on Package</th>
                <th>Courier</th>
                <th>Description</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Sync Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredPackagesForPage.length" class="empty">
                <td colspan="10">No packages yet. Click "Pull from SaaS" to sync packages from Courier Depot.</td>
              </tr>
              <tr v-for="pkg in filteredPackagesForPage" :key="pkg.packageId">
                <td><input type="checkbox" /></td>
                <td><span class="packages-id">{{ pkg.packageId }}</span></td>
                <td><span class="packages-tracking">{{ pkg.trackingNumber }}</span></td>
                <td>{{ pkg.customer }}</td>
                <td>{{ pkg.altName }}</td>
                <td>{{ pkg.courier }}</td>
                <td>{{ pkg.description }}</td>
                <td>{{ pkg.weight ? pkg.weight + ' lb' : '' }}</td>
                <td><span class="packages-status">{{ pkg.status || 'Unknown' }}</span></td>
                <td><span class="packages-sync-badge packages-sync-synced">Synced</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="currentPage === 'summary'" class="panel full-page" id="summary">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Daily summary</p>
            <h2>Daily Check</h2>
            <p class="muted">Breakdown of collected amounts and who recorded them.</p>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <input
              v-model="dailySummaryDateFilter"
              type="date"
              placeholder="Filter by date"
              style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px;"
            />
            <button
              v-if="dailySummaryDateFilter"
              class="pill ghost"
              type="button"
              @click="dailySummaryDateFilter = ''; activeDailyMethod = null;"
              style="white-space: nowrap;"
            >
              Clear Filter
            </button>
          </div>
        </div>

        <!-- Payment Method Cards (show when no method is selected) -->
        <div v-if="!activeDailyMethod" style="margin-bottom: 32px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            <!-- Cash Card -->
            <div class="card clickable-card" @click="activeDailyMethod = 'cash'" style="cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #4b5563;">Cash</h4>
                <span style="background: #f3f4f6; color: #6b7280; fontSize: 13px; font-weight: 500; padding: 6px 12px; border-radius: 6px;">
                  Cash
                </span>
              </div>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>
              <p style="font-size: 48px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 8px;">
                {{ formatCurrency(dailyMethodTotals.cash) }}
              </p>
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                {{ dailySummaryDateFilter ? 'For selected date' : 'Total collected' }}
              </p>
              <p style="font-size: 13px; color: #6b7280;">
                Click to view <span style="font-weight: 600; color: #374151;">breakdown</span>
              </p>
            </div>

            <!-- POS Card -->
            <div class="card clickable-card" @click="activeDailyMethod = 'pos'" style="cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #4b5563;">POS</h4>
                <span style="background: #f3f4f6; color: #6b7280; fontSize: 13px; font-weight: 500; padding: 6px 12px; border-radius: 6px;">
                  POS
                </span>
              </div>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>
              <p style="font-size: 48px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 8px;">
                {{ formatCurrency(dailyMethodTotals.pos) }}
              </p>
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                {{ dailySummaryDateFilter ? 'For selected date' : 'Total collected' }}
              </p>
              <p style="font-size: 13px; color: #6b7280;">
                Click to view <span style="font-weight: 600; color: #374151;">breakdown</span>
              </p>
            </div>

            <!-- Transfer Card -->
            <div class="card clickable-card" @click="activeDailyMethod = 'transfer'" style="cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #4b5563;">Transfer</h4>
                <span style="background: #f3f4f6; color: #6b7280; fontSize: 13px; font-weight: 500; padding: 6px 12px; border-radius: 6px;">
                  Transfer
                </span>
              </div>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>
              <p style="font-size: 48px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 8px;">
                {{ formatCurrency(dailyMethodTotals.transfer) }}
              </p>
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                {{ dailySummaryDateFilter ? 'For selected date' : 'Total collected' }}
              </p>
              <p style="font-size: 13px; color: #6b7280;">
                Click to view <span style="font-weight: 600; color: #374151;">breakdown</span>
              </p>
            </div>

            <!-- Credit Card Card -->
            <div class="card clickable-card" @click="activeDailyMethod = 'creditCard'" style="cursor: pointer; transition: all 0.2s ease;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #4b5563;">Credit Card</h4>
                <span style="background: #f3f4f6; color: #6b7280; fontSize: 13px; font-weight: 500; padding: 6px 12px; border-radius: 6px;">
                  Credit
                </span>
              </div>
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>
              <p style="font-size: 48px; font-weight: 700; color: #111827; line-height: 1; margin-bottom: 8px;">
                {{ formatCurrency(dailyMethodTotals.creditCard) }}
              </p>
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                {{ dailySummaryDateFilter ? 'For selected date' : 'Total collected' }}
              </p>
              <p style="font-size: 13px; color: #6b7280;">
                Click to view <span style="font-weight: 600; color: #374151;">breakdown</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Breakdown Table (show when a method is selected or view all) -->
        <div v-if="activeDailyMethod" class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main);">
              {{ activeDailyMethod === 'cash' ? 'Cash' : activeDailyMethod === 'pos' ? 'POS' : activeDailyMethod === 'transfer' ? 'Transfer' : 'Credit Card' }} Breakdown
            </h3>
            <button class="pill ghost" type="button" @click="activeDailyMethod = null">← Back to Overview</button>
          </div>

          <!-- Time Filter Buttons -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
            <button
              v-for="filter in [{value: 'today', label: 'Today'}, {value: '7days', label: '7 Days'}, {value: '1month', label: '1 Month'}, {value: '90days', label: '90 Days'}, {value: 'year', label: 'Year'}]"
              :key="filter.value"
              @click="dailyTimeFilter = filter.value"
              :style="{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: dailyTimeFilter === filter.value ? '#3b82f6' : '#f3f4f6',
                color: dailyTimeFilter === filter.value ? 'white' : '#6b7280',
                transition: 'all 0.2s ease'
              }"
            >
              {{ filter.label }}
            </button>
          </div>

          <div class="table-shell compact">
            <table v-if="activeDailyMethod !== 'creditCard'">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredDailySummary.length" class="empty">
                  <td colspan="3">No collections found.</td>
                </tr>
                <tr v-for="row in filteredDailySummary" :key="row.date">
                  <td><strong>{{ row.date }}</strong></td>
                  <td style="font-size: 16px; font-weight: 600; color: #10b981;">{{ formatCurrency(row[activeDailyMethod]) }}</td>
                  <td>{{ row.users.join(', ') || '—' }}</td>
                </tr>
                <tr v-if="filteredDailySummary.length > 0" style="background: #f8fafb; font-weight: 700;">
                  <td>Total</td>
                  <td style="font-size: 18px; color: #10b981;">
                    {{ formatCurrency(filteredDailySummary.reduce((sum, row) => sum + row[activeDailyMethod], 0)) }}
                  </td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
            <table v-else>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Currency</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!filteredCreditCardOrders.length" class="empty">
                  <td colspan="4">No credit card orders found for selected period.</td>
                </tr>
                <tr v-for="order in filteredCreditCardOrders" :key="order.id">
                  <td><strong>{{ order.date }}</strong></td>
                  <td>{{ order.customer_name || order.customerName || '—' }}</td>
                  <td style="font-size: 16px; font-weight: 600; color: #10b981;">{{ formatCurrency(order.cost) }}</td>
                  <td><span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">{{ order.currency || 'JMD' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="currentPage === 'orders'" class="panel full-page" id="orders">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Customers Orders</p>
            <h2>Customers Orders</h2>
          </div>
        </div>

        <div class="orders-controls">
          <div class="search-box compact">
            <label class="input-label" for="orderSearch">Search</label>
            <div class="input-shell">
              <input
                id="orderSearch"
                type="text"
                placeholder="Search customer or merchant"
                v-model="ordersSearch"
              />
            </div>
          </div>
          <div class="action-group gap-3">
            <button class="pill small" type="button" @click="openOrderAdd" :disabled="!currentUser || !can('manageOrders')">Add order</button>
            <button class="pill secondary small" type="button" @click="bulkOrderReceive" :disabled="!currentUser || !selectedOrderIds.length || !can('manageOrders')">Bulk update to received</button>
            <button class="pill danger small" type="button" @click="openOrderDelete('')" :disabled="!currentUser || !selectedOrderIds.length || !can('manageOrders')">Bulk delete</button>
          </div>
        </div>

        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" :checked="selectedOrderIds.length && filteredOrders.length && selectedOrderIds.length === filteredOrders.length" @change="toggleAllOrders" /></th>
                <th>Date</th>
                <th>Customer</th>
                <th>Description</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Merchant</th>
                <th>Method</th>
                <th>Updated by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!filteredOrders.length" class="empty">
                <td colspan="10">No orders yet.</td>
              </tr>
              <tr v-for="order in filteredOrders" :key="order.id">
                <td><input type="checkbox" :checked="selectedOrderIds.includes(order.id)" @change="toggleOrderSelection(order.id)" /></td>
                <td>{{ order.date }}</td>
                <td>{{ order.customerName }}</td>
                <td>{{ order.description }}</td>
                <td>{{ formatCurrency(order.cost) }}</td>
                <td>
                  <span class="tag" v-if="order.status === 'Ordered'">Ordered</span>
                  <span class="tag secondary" v-else>Received</span>
                </td>
                <td>{{ order.merchant }}</td>
                <td>{{ order.method }}</td>
                <td>{{ order.updatedBy || '—' }}</td>
                <td>
                  <div class="actions">
                    <button class="pill secondary" type="button" @click="markOrderReceived(order)" :disabled="!currentUser">Received</button>
                    <button class="pill ghost" type="button" @click="openOrderEdit(order)" :disabled="!currentUser || !can('manageOrders')">Edit</button>
                    <button class="pill danger" type="button" @click="openOrderDelete(order.id)" :disabled="!currentUser || !can('manageOrders')">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="currentPage === 'api'" class="panel full-page" id="api">
        <div class="panel-head">
          <div>
            <p class="eyebrow">API</p>
            <h2>Package API</h2>
            <p class="muted">Configure base URL and push package updates.</p>
          </div>
          <div class="status-dot"><span></span>{{ apiStatus }}</div>
        </div>
        <div class="card">
          <div class="form-grid">
            <label>
              <span class="input-label">Base URL</span>
              <input v-model="apiForm.baseUrl" type="text" placeholder="https://api.example.com" />
            </label>
            <label>
              <span class="input-label">API Key</span>
              <input v-model="apiForm.apiKey" type="password" placeholder="sk-..." />
            </label>
            <label>
              <span class="input-label">Endpoint</span>
              <input v-model="apiForm.path" type="text" />
            </label>
            <label>
              <span class="input-label">Method</span>
              <select v-model="apiForm.method">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>
          </div>
          <label>
            <span class="input-label">Payload (JSON)</span>
            <textarea v-model="apiForm.payload" rows="4" placeholder='{"foo":"bar"}'></textarea>
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="testApi(false)">Save config</button>
            <button class="pill" type="button" @click="testApi(true)">Send test call</button>
          </div>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Apply package update</p>
              <h3>Simulate API response</h3>
            </div>
            <div class="muted">Use this to apply remote updates to local data.</div>
          </div>
          <div class="form-grid">
            <label>
              <span class="input-label">Package ID</span>
              <input v-model="apiUpdateForm.packageId" type="text" placeholder="PKG-1001" />
            </label>
            <label>
              <span class="input-label">Status</span>
              <select v-model="apiUpdateForm.status">
                <option value="Ready for Pickup">Ready for Pickup</option>
                <option value="Processing at Customs">Processing at Customs</option>
                <option value="Processing in Office">Processing in Office</option>
                <option value="In Transit">In Transit</option>
                <option value="Pickup">Pickup</option>
              </select>
            </label>
            <label>
              <span class="input-label">Billing status</span>
              <select v-model="apiUpdateForm.billingStatus">
                <option value="Open">Open</option>
                <option value="Partial">Partial</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
            <label>
              <span class="input-label">Cost</span>
              <input v-model.number="apiUpdateForm.cost" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span class="input-label">Method</span>
              <input v-model="apiUpdateForm.method" type="text" placeholder="POS / Cash / Transfer" />
            </label>
            <label>
              <span class="input-label">Freight</span>
              <select v-model="apiUpdateForm.freightType">
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </label>
          </div>
          <label>
            <span class="input-label">Note</span>
            <textarea v-model="apiUpdateForm.note" rows="3" placeholder="Any note to attach"></textarea>
          </label>
          <div class="modal-actions">
            <div class="muted">{{ apiMessage }}</div>
            <div style="margin-left:auto; display:flex; gap:8px;">
              <button class="pill ghost" type="button" @click="resetApiUpdate">Reset</button>
              <button class="pill" type="button" @click="applyApiUpdate">Apply update</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="currentPage === 'profile'" class="panel" id="profile">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Profile</p>
            <h2>Employee profile</h2>
            <p class="muted">Update your photo, email, and password.</p>
          </div>
        </div>
        <div class="grid two-cols">
          <div class="card">
            <div class="profile-photo-preview">
              <img :src="profileForm.photo || placeholderPhoto" alt="profile preview" />
            </div>
            <label>
              <span class="input-label">Photo URL</span>
              <input v-model="profileForm.photo" type="text" placeholder="https://..." />
            </label>
          </div>
          <div class="card">
            <div class="form-grid">
              <label>
                <span class="input-label">Email</span>
                <input v-model="profileForm.email" type="email" placeholder="you@sgxpress.com" />
              </label>
              <label>
                <span class="input-label">Password</span>
                <input v-model="profileForm.password" type="password" placeholder="New password" />
              </label>
            </div>
            <button class="pill" type="button" @click="saveProfile">Save profile</button>
          </div>
        </div>
      </section>

      <section v-if="currentPage === 'settings'" class="panel full-page" id="settings" @vue:mounted="loadRoles(); loadPermissions(); loadApiConfig(); loadSyncLogs(); loadMaintenanceMode();">
        <div class="panel-head">
          <div>
            <p class="eyebrow">System Configuration</p>
            <h2>Settings</h2>
            <p class="muted">Manage users, roles, permissions, and system configuration</p>
          </div>
        </div>

        <!-- Settings Navigation Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 2px;">
          <button
            @click="activeSettingsTab = 'environment'"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSettingsTab === 'environment' ? '#3b82f6' : 'transparent',
              color: activeSettingsTab === 'environment' ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }"
            v-if="currentUser?.role === 'full_control'"
          >
            <img src="/asset/icon pack/settings.png" alt="Settings" style="width: 18px; height: 18px;" />
            <span>Environment Control</span>
          </button>

          <button
            @click="activeSettingsTab = 'roles'"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSettingsTab === 'roles' ? '#3b82f6' : 'transparent',
              color: activeSettingsTab === 'roles' ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }"
          >
            <img src="/asset/icon pack/Roles .png" alt="Roles" style="width: 18px; height: 18px;" />
            <span>Roles</span>
          </button>

          <button
            @click="activeSettingsTab = 'users'"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSettingsTab === 'users' ? '#3b82f6' : 'transparent',
              color: activeSettingsTab === 'users' ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }"
          >
            <img src="/asset/icon pack/users.png" alt="Users" style="width: 18px; height: 18px;" />
            <span>Users</span>
          </button>

          <button
            @click="activeSettingsTab = 'api-config'"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSettingsTab === 'api-config' ? '#3b82f6' : 'transparent',
              color: activeSettingsTab === 'api-config' ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }"
            v-if="currentUser?.role === 'full_control'"
          >
            <img src="/asset/icon pack/api-cloud.png" alt="API Configuration" style="width: 18px; height: 18px;" />
            <span>API Configuration</span>
          </button>

          <button
            @click="activeSettingsTab = 'notifications'"
            :style="{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeSettingsTab === 'notifications' ? '#3b82f6' : 'transparent',
              color: activeSettingsTab === 'notifications' ? 'white' : '#64748b',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }"
          >
            <img src="/asset/icon pack/bell-notification-social-media.png" alt="Notifications" style="width: 18px; height: 18px;" />
            <span>Notifications</span>
          </button>
        </div>

        <!-- Environment Controls Section (Maintenance Mode) -->
        <div class="card" style="margin-bottom: 32px; border-left: 4px solid #ef4444;" v-if="activeSettingsTab === 'environment' && currentUser?.role === 'full_control'">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Environment Controls</h3>
            <p class="muted">System-wide settings and maintenance controls</p>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #fef2f2; border-radius: 8px;">
            <div>
              <strong style="font-size: 16px; color: var(--text-main);">Maintenance Mode</strong>
              <p class="muted" style="margin-top: 4px;">When enabled, only administrators can access the system</p>
              <p v-if="maintenanceMode" style="color: #ef4444; font-weight: 600; margin-top: 8px;">Maintenance mode is currently ENABLED</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" :checked="maintenanceMode" @change="toggleMaintenanceModeFunc" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Roles Section with Cards -->
        <div v-if="activeSettingsTab === 'roles'" class="card" style="margin-bottom: 32px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 24px;">
              <!-- Full Control Card -->
              <div @click="openRolePermissionModal('full_control')" class="role-card">
                <!-- Header: Title and Badge -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <h4 style="font-size: 20px; font-weight: 600; color: #4b5563; margin: 0;">Full Control</h4>
                  <span style="background: #ede9fe; color: #7c3aed; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Admin</span>
                </div>

                <!-- Divider -->
                <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>

                <!-- Large Text Label -->
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px; text-align: center; color: #7c3aed;">Administrator</div>

                <!-- Description -->
                <p style="font-size: 15px; color: #6b7280; text-align: center; margin-bottom: 20px;">Full system access with all permissions</p>

                <!-- Bottom Stats -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 14px; color: #9ca3af;">Total Permissions</span>
                  <span style="font-size: 16px; font-weight: 700; color: #111827;">All</span>
                </div>
              </div>

              <!-- Editor Card -->
              <div @click="openRolePermissionModal('editor')" class="role-card">
                <!-- Header: Title and Badge -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <h4 style="font-size: 20px; font-weight: 600; color: #4b5563; margin: 0;">Editor</h4>
                  <span style="background: #fce7f3; color: #db2777; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Edit Access</span>
                </div>

                <!-- Divider -->
                <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>

                <!-- Large Text Label -->
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px; text-align: center; color: #db2777;">Manager</div>

                <!-- Description -->
                <p style="font-size: 15px; color: #6b7280; text-align: center; margin-bottom: 20px;">Can edit and manage content</p>

                <!-- Bottom Stats -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 14px; color: #9ca3af;">Total Permissions</span>
                  <span style="font-size: 16px; font-weight: 700; color: #111827;">Most</span>
                </div>
              </div>

              <!-- View Only Card -->
              <div @click="openRolePermissionModal('view_only')" class="role-card">
                <!-- Header: Title and Badge -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <h4 style="font-size: 20px; font-weight: 600; color: #4b5563; margin: 0;">View Only</h4>
                  <span style="background: #dbeafe; color: #2563eb; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">Read-Only</span>
                </div>

                <!-- Divider -->
                <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>

                <!-- Large Text Label -->
                <div style="font-size: 28px; font-weight: 700; margin-bottom: 12px; text-align: center; color: #2563eb;">Users</div>

                <!-- Description -->
                <p style="font-size: 15px; color: #6b7280; text-align: center; margin-bottom: 20px;">Read-only access to view data</p>

                <!-- Bottom Stats -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 14px; color: #9ca3af;">Total Permissions</span>
                  <span style="font-size: 16px; font-weight: 700; color: #111827;">Limited</span>
                </div>
              </div>
            </div>
          </div>

        <!-- Users Section -->
        <div v-if="activeSettingsTab === 'users'" class="card" style="margin-bottom: 32px; padding: 32px;">
            <!-- Add User Button (Top Right) -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
              <button class="pill" type="button" @click="userModals.add = true" v-if="hasPermission('admin')" style="background: #3b82f6; color: white; padding: 10px 20px;">+ Add New User</button>
            </div>

            <!-- Section Header with Search -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h3 style="font-size: 22px; font-weight: 600; color: #111827; margin: 0;">Users</h3>
              <input
                v-model="userSearchFilter"
                type="text"
                placeholder="Search users..."
                style="padding: 10px 16px; border: 1px solid #d1d5db; border-radius: 8px; width: 300px; font-size: 14px;"
              />
            </div>

            <!-- Users Table -->
            <div class="table-shell">
              <table style="width: 100%;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">NAME</th>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">EMAIL</th>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">ROLE</th>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">STATUS</th>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">LAST LOGIN</th>
                    <th style="text-align: left; padding: 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb;">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!filteredEmployees.length" class="empty">
                    <td colspan="6" style="text-align: center; padding: 32px; color: #9ca3af;">No users found.</td>
                  </tr>
                  <tr v-for="user in filteredEmployees" :key="user.id" style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 16px 12px;">
                      <strong style="font-size: 14px; color: #111827;">{{ user.name }}</strong>
                    </td>
                    <td style="padding: 16px 12px;">
                      <span style="font-size: 14px; color: #6b7280;">{{ user.email }}</span>
                    </td>
                    <td style="padding: 16px 12px;">
                      <span :style="{
                        background: user.role === 'full_control' ? '#fef3c7' : user.role === 'editor' ? '#ede9fe' : '#dcfce7',
                        color: user.role === 'full_control' ? '#92400e' : user.role === 'editor' ? '#6b21a8' : '#166534',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'inline-block'
                      }">
                        {{ user.role === 'full_control' ? 'Full Control' : user.role === 'editor' ? 'Editor' : 'View Only' }}
                      </span>
                    </td>
                    <td style="padding: 16px 12px;">
                      <span :style="{
                        background: user.active === 1 ? '#dcfce7' : '#fee2e2',
                        color: user.active === 1 ? '#166534' : '#991b1b',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'inline-block'
                      }">
                        {{ user.active === 1 ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td style="padding: 16px 12px;">
                      <span style="font-size: 14px; color: #6b7280;">
                        {{ new Date(user.lastLogin).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) }}
                      </span>
                    </td>
                    <td style="padding: 16px 12px;">
                      <div v-if="hasPermission('admin')" class="kebab-menu-container">
                        <button class="kebab-btn" @click="toggleUserKebab(user.id)" @blur="setTimeout(() => closeUserKebab(user.id), 200)" type="button" aria-label="User actions">
                          ⋮
                        </button>
                        <div v-if="openUserKebabId === user.id" class="kebab-dropdown">
                          <button @click="openEditUser(user); closeUserKebab(user.id)">Edit</button>
                          <button @click="toggleUserLock(user); closeUserKebab(user.id)">{{ user.active === 1 ? 'Deactivate' : 'Activate' }}</button>
                          <button class="danger" @click="openDeleteUser(user); closeUserKebab(user.id)">Delete</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        <!-- External API Configuration (Only for full_control users) -->
        <div v-if="activeSettingsTab === 'api-config' && currentUser?.role === 'full_control'" class="card" style="margin-bottom: 32px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Courier Depot API Configuration</h3>
                <p class="muted">Configure Courier Depot SaaS platform integration and authentication</p>
              </div>
              <button
                v-if="!isEditingApiConfig"
                class="pill ghost"
                type="button"
                @click="isEditingApiConfig = true"
              >
                Edit Credentials
              </button>
            </div>
          </div>

          <div class="form-grid">
            <label style="grid-column: 1 / -1;">
              <span class="input-label">Authentication Endpoint</span>
              <input
                v-model="apiConfigForm.baseUrl"
                type="url"
                placeholder="https://api.courierdepotja.com/api/auth/signin"
                :readonly="!isEditingApiConfig"
                :style="!isEditingApiConfig ? 'background: #f1f5f9; cursor: not-allowed;' : ''"
              />
              <p class="muted" style="margin-top: 6px; font-size: 13px;">Full endpoint URL for API authentication</p>
            </label>

            <label>
              <span class="input-label">Authentication Email</span>
              <input
                v-model="apiConfigForm.email"
                type="email"
                placeholder="your-email@gmail.com"
                :readonly="!isEditingApiConfig"
                :style="!isEditingApiConfig ? 'background: #f1f5f9; cursor: not-allowed;' : ''"
              />
            </label>

            <label>
              <span class="input-label">Authentication Password</span>
              <div style="position: relative;">
                <input
                  v-model="apiConfigForm.password"
                  :type="showApiPassword ? 'text' : 'password'"
                  placeholder="Enter password"
                  style="padding-right: 50px;"
                  :readonly="!isEditingApiConfig"
                  :style="!isEditingApiConfig ? 'background: #f1f5f9; cursor: not-allowed;' : ''"
                />
                <button type="button" @click="showApiPassword = !showApiPassword"
                  style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; font-size: 18px;">
                  {{ showApiPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </label>

            <label>
              <span class="input-label">User ID</span>
              <input
                v-model="apiConfigForm.userId"
                type="text"
                placeholder="970"
                :readonly="!isEditingApiConfig"
                :style="!isEditingApiConfig ? 'background: #f1f5f9; cursor: not-allowed;' : ''"
              />
              <p class="muted" style="margin-top: 6px; font-size: 13px;">Your Courier Depot user ID for package retrieval</p>
            </label>
          </div>

          <div v-if="isEditingApiConfig" style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="pill" type="button" @click="saveApiConfig">Save Configuration</button>
            <button class="pill ghost" type="button" @click="isEditingApiConfig = false">Cancel</button>
          </div>

          <div v-else style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="pill ghost" type="button" @click="testApiConnection">Test Connection</button>
            <button class="pill ghost" type="button" @click="triggerApiSync">Sync Now</button>
          </div>

          <p v-if="apiTestMessage" :style="{ marginTop: '16px', color: apiTestStatus === 'success' ? '#10b981' : apiTestStatus === 'error' ? '#ef4444' : '#64748b' }">
            {{ apiTestMessage }}
          </p>

          <!-- API Sync Logs -->
          <div v-if="apiSyncLogs.length > 0" style="margin-top: 32px;">
            <h4 style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 16px;">Recent Sync Logs</h4>
            <div class="table-shell compact">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Message</th>
                    <th>Synced By</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in apiSyncLogs" :key="log.id">
                    <td>
                      <span class="tag" :class="log.status === 'success' ? 'success' : 'danger'">
                        {{ log.status }}
                      </span>
                    </td>
                    <td>{{ log.message || '—' }}</td>
                    <td>{{ log.synced_by || '—' }}</td>
                    <td>{{ log.records_created }}</td>
                    <td>{{ log.records_updated }}</td>
                    <td>{{ log.errors }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Notification Preferences (Keep existing) -->
        <div class="card" v-if="activeSettingsTab === 'notifications'">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Notification Preferences</h3>
            <p class="muted">Configure how you want to receive notifications</p>
          </div>

          <div class="form-grid">
            <label class="toggle-row">
              <input type="checkbox" v-model="settings.notifyEmail" />
              <div>
                <strong>Email notifications</strong>
                <p class="muted">Send a receipt copy to my inbox.</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="settings.notifySms" />
              <div>
                <strong>SMS notifications</strong>
                <p class="muted">Send handoff confirmation via SMS.</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="settings.notifyDesktop" />
              <div>
                <strong>Desktop alerts</strong>
                <p class="muted">Show desktop alerts for new ready packages.</p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section v-if="currentPage === 'shipment-bin'" class="panel full-page" id="shipment-bin">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Shipment Management</p>
            <h2>Shipment Bin</h2>
            <p class="muted">{{ activeShipmentLogId ? 'Scan and manage packages in the active shipment log' : 'Select a shipment log to begin scanning' }}</p>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <button v-if="activeShipmentLogId" class="pill ghost" type="button" @click="activeShipmentLogId = ''; shipmentItems = []; scanMessage = ''">
              ← Back to All Logs
            </button>
            <button v-if="hasPermission('manageShipments')" class="pill" type="button" @click="openShipmentUpload">
              + Upload New Log
            </button>
            <button v-if="activeShipmentLogId && hasPermission('manageShipments')" class="pill" type="button" @click="openShipmentEdit(shipmentLogs.find(l => l.id === activeShipmentLogId))">
              Edit
            </button>
            <button v-if="activeShipmentLogId && hasPermission('manageShipments')" class="pill danger" type="button" @click="openShipmentDelete(shipmentLogs.find(l => l.id === activeShipmentLogId))">
              Delete Log
            </button>
          </div>
        </div>

        <!-- CARDS VIEW: Show when no active log is selected -->
        <div v-if="!activeShipmentLogId && shipmentLogs.length > 0">
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">All Shipment Logs</h3>
            <p class="muted">Click on a log to start scanning packages</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
            <div v-for="log in shipmentLogs" :key="log.id"
                 class="card clickable-card"
                 @click="selectShipmentLog(log.id)"
                 style="cursor: pointer; transition: all 0.2s ease;">

              <!-- Header: Title and Cargo Badge -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <h4 style="font-size: 18px; font-weight: 600; color: #4b5563;">
                  {{ log.log_name }}
                </h4>
                <span :style="{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '13px',
                  fontWeight: '500',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }">
                  {{ log.cargo_type || 'Air Cargo' }}
                </span>
              </div>

              <!-- Divider -->
              <div style="height: 1px; background: #e5e7eb; margin-bottom: 20px;"></div>

              <!-- Large Number -->
              <div style="margin-bottom: 8px;">
                <p style="font-size: 48px; font-weight: 700; color: #111827; line-height: 1;">
                  {{ getLogItemCount(log.id) }}
                </p>
              </div>

              <!-- Supporting Text -->
              <p style="font-size: 14px; color: #9ca3af; margin-bottom: 20px;">
                Shipment date: {{ log.shipment_date }}
              </p>

              <!-- Bottom Info Row -->
              <div>
                <p style="font-size: 13px; color: #6b7280;">
                  Uploaded by <span style="font-weight: 600; color: #374151;">{{ log.uploaded_by || 'Unknown' }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ACTIVE LOG VIEW: Show when a log is selected -->
        <div v-if="activeShipmentLogId">
          <!-- Shipment Log Header with Details -->
          <div class="card" style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #002d62 0%, #00aeef 100%); color: white;">
            <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: white;">
              {{ shipmentLogs.find(l => l.id === activeShipmentLogId)?.log_name || 'Shipment Log' }}
            </h2>
            <div style="display: flex; gap: 24px; font-size: 14px; opacity: 0.95;">
              <span>{{ shipmentLogs.find(l => l.id === activeShipmentLogId)?.shipment_date }}</span>
              <span>{{ shipmentLogs.find(l => l.id === activeShipmentLogId)?.uploaded_by || 'Unknown' }}</span>
              <span>{{ shipmentLogs.find(l => l.id === activeShipmentLogId)?.cargo_type || 'Air Cargo' }}</span>
            </div>
          </div>

          <!-- Two-Column Layout: Scan Card (Left) + Shipment Info (Right) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <!-- LEFT: Scan Tracking Numbers Card -->
            <div class="card" :class="{ 'disabled-card': !hasPermission('scanPackages') }" style="padding: 24px; border: 2px dashed #cbd5e1;">
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--text-main);">
                Scan Tracking Numbers
              </h3>
              <p class="muted" style="margin-bottom: 16px; font-size: 13px;">Scan tracking number or press Enter...</p>
              <input
                ref="scanInput"
                v-model="scanTrackingNumber"
                @keydown.enter="scanPackage"
                type="text"
                placeholder="Scan or enter tracking number..."
                style="font-size: 15px; padding: 14px; width: 100%; margin-bottom: 12px; border-radius: 6px; border: 1px solid #cbd5e1;"
                :disabled="!hasPermission('scanPackages')"
              />
              <button class="pill" type="button" @click="scanPackage" :disabled="!hasPermission('scanPackages')" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 600;">
                Scan Package
              </button>
              <p v-if="scanMessage" :class="{'muted': scanStatus === 'info', 'error-text': scanStatus === 'error'}" style="margin-top: 12px; font-weight: 600; text-align: center;">
                {{ scanMessage }}
              </p>
            </div>

            <!-- RIGHT: Shipment Info Card with 2x2 Grid -->
            <div class="card" style="padding: 24px; border: 2px solid #fbbf24;">
              <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--text-main);">
                Shipment Info
              </h3>
              <!-- 2x2 Statistics Grid -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <!-- Total Packages -->
                <div style="text-align: center; padding: 16px; background: #f8f9fb; border-radius: 8px;">
                  <p class="muted" style="font-size: 12px; margin-bottom: 6px;">Total Packages</p>
                  <h2 style="font-size: 32px; font-weight: 700; color: var(--sgx-blue);">{{ shipmentStats.total }}</h2>
                </div>
                <!-- Packages Received -->
                <div style="text-align: center; padding: 16px; background: #f8f9fb; border-radius: 8px;">
                  <p class="muted" style="font-size: 12px; margin-bottom: 6px;">Packages Received</p>
                  <h2 style="font-size: 32px; font-weight: 700; color: #10b981;">{{ shipmentStats.received }}</h2>
                </div>
                <!-- Verification Pending -->
                <div style="text-align: center; padding: 16px; background: #f8f9fb; border-radius: 8px;">
                  <p class="muted" style="font-size: 12px; margin-bottom: 6px;">Verification Pending</p>
                  <h2 style="font-size: 32px; font-weight: 700; color: #f59e0b;">{{ shipmentStats.pending }}</h2>
                </div>
                <!-- # of Couriers -->
                <div style="text-align: center; padding: 16px; background: #f8f9fb; border-radius: 8px;">
                  <p class="muted" style="font-size: 12px; margin-bottom: 6px;"># of Couriers</p>
                  <h2 style="font-size: 32px; font-weight: 700; color: var(--sgx-blue);">{{ shipmentStats.couriers }}</h2>
                </div>
              </div>
            </div>
          </div>

          <!-- Package Table Section -->
          <div v-if="shipmentItems.length > 0">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 16px;">
              Shipment Data by Courier
            </h3>

            <!-- Search Bar -->
            <div class="search-box" style="margin-bottom: 16px; width: 100%;">
              <input
                v-model="shipmentSearchQuery"
                type="text"
                placeholder="Search by ID, Customer Name, or Tracking Number..."
                style="font-size: 14px; width: 100%;"
              />
            </div>

            <!-- Filter Buttons -->
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
              <select v-model="shipmentCourierFilter" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: white;">
                <option value="">All Couriers</option>
                <option v-for="courier in uniqueCourierCodes" :key="courier" :value="courier">{{ courier }}</option>
              </select>
              <select
                v-model="shipmentFilter"
                style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: white;"
              >
                <option value="all">All Status</option>
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="not_found">Not Found</option>
              </select>
            </div>

            <!-- Package List Header with Add Button -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="font-size: 16px; font-weight: 700; color: var(--text-main);">Package List</h4>
              <button v-if="hasPermission('manageShipments')" class="pill" type="button" @click="openAddShipmentItem" style="font-size: 14px; padding: 8px 16px;">
                + Add Package
              </button>
            </div>

          <div class="table-shell">
            <table>
              <thead>
                <tr>
                  <th @click="sortShipmentTable('package_id')" style="cursor: pointer; user-select: none;">
                    ID
                    <span v-if="shipmentSortColumn === 'package_id'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('code')" style="cursor: pointer; user-select: none;">
                    Code
                    <span v-if="shipmentSortColumn === 'code'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('customer_name')" style="cursor: pointer; user-select: none;">
                    Customer
                    <span v-if="shipmentSortColumn === 'customer_name'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('alt_name')" style="cursor: pointer; user-select: none;">
                    Alt Name
                    <span v-if="shipmentSortColumn === 'alt_name'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('tracking_number')" style="cursor: pointer; user-select: none;">
                    Tracking
                    <span v-if="shipmentSortColumn === 'tracking_number'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('weight')" style="cursor: pointer; user-select: none;">
                    Weight
                    <span v-if="shipmentSortColumn === 'weight'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th>Description</th>
                  <th @click="sortShipmentTable('status')" style="cursor: pointer; user-select: none;">
                    Status
                    <span v-if="shipmentSortColumn === 'status'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th v-if="hasPermission('editShipmentItems') || hasPermission('moveShipmentItems')">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredShipmentItems" :key="item.id">
                  <td>{{ item.package_id || item.id }}</td>
                  <td>
                    <span class="tag" style="background: var(--sgx-blue); color: white; font-weight: 600;">
                      {{ item.code || item.courier_code || 'RSC' }}
                    </span>
                  </td>
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.alt_name }}</td>
                  <td><strong>{{ item.tracking_number }}</strong></td>
                  <td>{{ item.weight ? item.weight + ' lb' : '' }}</td>
                  <td>{{ item.description }}</td>
                  <td>
                    <select
                      v-if="hasPermission('editShipmentItems')"
                      :value="item.status"
                      @change="updateShipmentItemStatus(item.id, $event.target.value)"
                      :style="{
                        padding: '10px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'white',
                        cursor: 'pointer',
                        minWidth: '140px',
                        backgroundColor: item.status === 'received' ? '#10b981' : item.status === 'pending' ? '#eab308' : '#ef4444'
                      }"
                    >
                      <option value="received">Received</option>
                      <option value="pending">Pending</option>
                      <option value="not_found">Not Found</option>
                    </select>
                    <span v-else class="tag" :style="{
                      background: item.status === 'received' ? '#10b981' : item.status === 'pending' ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      fontWeight: '600'
                    }">
                      {{ item.status === 'received' ? 'Received' : item.status === 'pending' ? 'Pending' : 'Not Found' }}
                    </span>
                  </td>
                  <td v-if="hasPermission('editShipmentItems') || hasPermission('moveShipmentItems')">
                    <div class="kebab-menu-container">
                      <button class="kebab-btn" @click="toggleShipmentItemKebab(item.id)" @blur="setTimeout(() => closeShipmentItemKebab(item.id), 200)" type="button" aria-label="Item actions">
                        ⋮
                      </button>
                      <div v-if="openShipmentItemKebabId === item.id" class="kebab-dropdown">
                        <button v-if="hasPermission('editShipmentItems')" @click="openItemEdit(item); closeShipmentItemKebab(item.id)">Edit</button>
                        <button v-if="hasPermission('moveShipmentItems')" @click="openItemMove(item); closeShipmentItemKebab(item.id)">Move</button>
                        <button v-if="hasPermission('manageShipments')" class="danger" @click="deleteShipmentItem(item); closeShipmentItemKebab(item.id)">Delete</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredShipmentItems.length === 0" class="empty">
                  <td colspan="8">No packages found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else-if="shipmentLogs.length === 0" class="card">
          <p class="muted" style="text-align: center; padding: 40px 0;">
            No shipment logs found. Upload a shipment log to get started.
          </p>
        </div>
      </section>
    </main>

    <div class="modal" v-if="modals.add">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Add Package</h3>
            <p class="modal-subtitle">Manual entry</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="closeModal('add')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmAddPackage">
          <div class="form-grid">
            <label>
              <span class="input-label">Customer</span>
              <select v-model="addForm.customerId" required>
                <option disabled value="">Select customer</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }} ({{ c.id }})</option>
              </select>
            </label>
            <label>
              <span class="input-label">Package ID</span>
              <input v-model="addForm.packageId" type="text" placeholder="PKG-XXXX" />
            </label>
            <label>
              <span class="input-label">Tracking</span>
              <input v-model="addForm.trackingNumber" type="text" placeholder="TRK-XXXX" />
            </label>
            <label>
              <span class="input-label">Status</span>
              <select v-model="addForm.status">
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label>
              <span class="input-label">Weight (lbs)</span>
              <input v-model.number="addForm.weight" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span class="input-label">Cost</span>
              <input v-model.number="addForm.cost" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span class="input-label">Freight type</span>
              <select v-model="addForm.freightType">
                <option value="Air">Air</option>
                <option value="Sea">Sea</option>
              </select>
            </label>
          </div>
          <label>
            <span class="input-label">Description</span>
            <input v-model="addForm.description" type="text" placeholder="Package description" />
          </label>
          <label>
            <span class="input-label">Note (optional)</span>
            <textarea v-model="addForm.note" rows="3" placeholder="Any quick detail on this package"></textarea>
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="closeModal('add')">Cancel</button>
            <button class="pill" type="submit">Add package</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="modals.view">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Package Details</h3>
            <p class="modal-subtitle">{{ viewPackage?.packageId }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="modals.view = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div class="form-grid">
          <div>
            <p class="input-label">Tracking Number</p>
            <p class="muted">{{ viewPackage?.trackingNumber }}</p>
          </div>
          <div>
            <p class="input-label">Status</p>
            <p class="muted">{{ viewPackage?.status }}</p>
          </div>
          <div>
            <p class="input-label">Freight Type</p>
            <p class="muted">{{ viewPackage?.freightType || '—' }}</p>
          </div>
          <div>
            <p class="input-label">Weight</p>
            <p class="muted">{{ viewPackage?.weight }} lbs</p>
          </div>
        </div>
        <div class="card" style="margin-top:12px;">
          <p class="input-label">Description</p>
          <p class="muted">{{ viewPackage?.description || '—' }}</p>
        </div>
        <div class="form-grid" style="margin-top:12px;">
          <div>
            <p class="input-label">Cost</p>
            <p class="muted">{{ viewPackage ? formatCurrency(viewPackage.cost) : '' }}</p>
          </div>
          <div>
            <p class="input-label">Amount Paid</p>
            <p class="muted">{{ viewPackage ? formatCurrency(viewPackage.amountPaid || 0) : '' }}</p>
          </div>
          <div>
            <p class="input-label">Billing Status</p>
            <p class="muted">{{ viewPackage?.billingStatus }}</p>
          </div>
          <div>
            <p class="input-label">Payment Method</p>
            <p class="muted">{{ viewPackage?.paymentMethod || '—' }}</p>
          </div>
        </div>
        <div class="form-grid" style="margin-top:12px;">
          <div>
            <p class="input-label">Date Updated</p>
            <p class="muted">{{ viewPackage?.dateUpdated }}</p>
          </div>
          <div>
            <p class="input-label">Updated By</p>
            <p class="muted">{{ viewPackage?.updatedBy || '—' }}</p>
          </div>
          <div>
            <p class="input-label">Collected</p>
            <p class="muted">{{ viewPackage?.collected ? 'Yes' : 'No' }}</p>
          </div>
        </div>
        <div v-if="viewPackage?.notes && viewPackage.notes.length > 0" class="card" style="margin-top:12px;">
          <p class="input-label">Notes</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px;">
            <li v-for="(note, idx) in viewPackage.notes" :key="idx" class="muted" style="margin-bottom: 4px;">{{ note }}</li>
          </ul>
        </div>
        <div class="modal-actions">
          <button class="pill" type="button" @click="modals.view = false">Close</button>
        </div>
      </div>
    </div>

    <div class="modal" v-if="orderModals.add">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Add Order</h3>
            <p class="modal-subtitle">SGX Order</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="orderModals.add = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmOrderAdd">
          <div class="form-grid">
            <label>
              <span class="input-label">Date</span>
              <input v-model="orderAddForm.date" type="date" required />
            </label>
            <label>
              <span class="input-label">Customer</span>
              <input v-model="orderAddForm.customerName" type="text" required />
            </label>
            <label>
              <span class="input-label">Merchant</span>
              <input v-model="orderAddForm.merchant" type="text" required />
            </label>
            <label>
              <span class="input-label">Cost</span>
              <input v-model.number="orderAddForm.cost" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span class="input-label">Currency</span>
              <select v-model="orderAddForm.currency">
                <option value="JMD">JMD</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              <span class="input-label">Status</span>
              <select v-model="orderAddForm.status">
                <option v-for="s in orderStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
          </div>
          <label>
            <span class="input-label">Description</span>
            <input v-model="orderAddForm.description" type="text" />
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="orderModals.add = false">Cancel</button>
            <button class="pill" type="submit">Add order</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="orderModals.edit">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit Order</h3>
            <p class="modal-subtitle">SGX Order</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="orderModals.edit = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmOrderEdit">
          <div class="form-grid">
            <label>
              <span class="input-label">Date</span>
              <input v-model="orderEditForm.date" type="date" required />
            </label>
            <label>
              <span class="input-label">Customer</span>
              <input v-model="orderEditForm.customerName" type="text" required />
            </label>
            <label>
              <span class="input-label">Merchant</span>
              <input v-model="orderEditForm.merchant" type="text" required />
            </label>
            <label>
              <span class="input-label">Cost</span>
              <input v-model.number="orderEditForm.cost" type="number" min="0" step="0.01" />
            </label>
            <label>
              <span class="input-label">Currency</span>
              <select v-model="orderEditForm.currency">
                <option value="JMD">JMD</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              <span class="input-label">Status</span>
              <select v-model="orderEditForm.status">
                <option v-for="s in orderStatusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
          </div>
          <label>
            <span class="input-label">Description</span>
            <input v-model="orderEditForm.description" type="text" />
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="orderModals.edit = false">Cancel</button>
            <button class="pill" type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="orderModals.delete">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete Order</h3>
            <p class="modal-subtitle">This action cannot be undone</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="orderModals.delete = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <p class="muted" style="margin-bottom: 20px;">Are you sure you want to delete this order? This action cannot be undone.</p>
        <div class="modal-footer">
          <button class="pill ghost" type="button" @click="orderModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="confirmOrderDelete">Delete Order</button>
        </div>
      </div>
    </div>

    <div class="modal" v-if="modals.collection">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Collect Payment</h3>
            <p class="modal-subtitle">{{ collectionTitle }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="closeModal('collection')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmCollection">
          <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 8px;">
            <p class="muted" style="margin: 0 0 0.5rem 0; font-size: 0.875rem;">Current billing status:</p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span
                v-for="pkg in selectedPackageIds.map(id => findPackage(id)).filter(Boolean)"
                :key="pkg.packageId"
                :class="['tag', pkg.billingStatus === 'Closed' ? 'closed' : pkg.billingStatus === 'Open' ? 'open' : 'partial']"
              >
                {{ pkg.packageId }}: {{ pkg.billingStatus }}
              </span>
            </div>
          </div>
          <div class="form-grid">
            <label>
              <span class="input-label">Amount paid</span>
              <input v-model.number="collectionForm.amount" type="number" min="0" step="0.01" required placeholder="0.00" />
            </label>
            <label>
              <span class="input-label">Payment method</span>
              <select v-model="collectionForm.method" required>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
                <option value="Transfer">Transfer</option>
                <option value="Loyalty">Loyalty</option>
              </select>
            </label>
            <label>
              <span class="input-label">Late fee (auto)</span>
              <input v-model.number="collectionForm.lateFee" type="number" min="0" step="0.01" />
            </label>
            <div class="summary-box">
              <p class="muted">Total due (cost + late fee)</p>
              <h3>{{ formatCurrency(getBaseTotal(selectedPackages) + Number(collectionForm.lateFee || 0)) }}</h3>
            </div>
          </div>
          <label>
            <span class="input-label">Note (optional)</span>
            <textarea v-model="collectionForm.note" rows="3" placeholder="Any quick detail on this handoff"></textarea>
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="closeModal('collection')">Cancel</button>
            <button class="pill" type="submit">Confirm collected</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="modals.edit">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit Package</h3>
            <p class="modal-subtitle">{{ editTitle }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="closeModal('edit')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmEdit">
          <div class="form-grid">
            <label>
              <span class="input-label">Tracking number</span>
              <input v-model="editForm.trackingNumber" type="text" required />
            </label>
            <label>
              <span class="input-label">Weight (lbs)</span>
              <input v-model.number="editForm.weight" type="number" min="0" step="0.01" required />
            </label>
            <label>
              <span class="input-label">Description</span>
              <input v-model="editForm.description" type="text" required />
            </label>
            <label>
              <span class="input-label">Cost</span>
              <input v-model.number="editForm.cost" type="number" min="0" step="0.01" required />
            </label>
          </div>
          <label>
            <span class="input-label">Note about this change</span>
            <textarea v-model="editForm.note" rows="3" placeholder="Reason or handoff note" required></textarea>
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="closeModal('edit')">Cancel</button>
            <button class="pill" type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="modals.delete">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete Package</h3>
            <p class="modal-subtitle">{{ deleteTitle }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="closeModal('delete')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmDelete">
          <p class="muted">This hides the package from the pickup console only. Add a quick note for the audit trail.</p>
          <label>
            <span class="input-label">Note</span>
            <textarea v-model="deleteForm.note" rows="3" placeholder="Why is this being removed?" required></textarea>
          </label>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="closeModal('delete')">Cancel</button>
            <button class="pill danger" type="submit">Delete package</button>
          </div>
        </form>
      </div>
    </div>

    <!-- BILLING CONSOLE MODALS -->

    <!-- Bill Modal -->
    <div class="modal" v-if="billingModals.bill">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Bill Package</h3>
            <p class="modal-subtitle">{{ billForm.packageId }} • {{ billForm.customerName }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="billingModals.bill = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmBill">
          <div class="billing-fields">
            <div class="field-group">
              <label class="field-label">Package Cost</label>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <input v-model.number="billForm.packageCost" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Import Fee</label>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <input v-model.number="billForm.customFee" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Processing Fee</label>
              <div class="input-with-prefix">
                <span class="prefix">$</span>
                <input v-model.number="billForm.processingFee" type="number" min="0" step="0.01" placeholder="0.00" />
              </div>
            </div>
          </div>
          <div class="billing-summary">
            <span class="summary-label">Total Cost</span>
            <span class="summary-value">{{ formatCurrency((billForm.packageCost || 0) + (billForm.customFee || 0) + (billForm.processingFee || 0)) }}</span>
          </div>
          <div class="modal-footer">
            <button class="pill ghost" type="button" @click="billingModals.bill = false">Cancel</button>
            <button class="pill" type="submit">Confirm Bill</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Collect Modal -->
    <div class="modal" v-if="billingModals.collect">
      <div class="modal-card billing-modal collect-modal">
        <header>
          <div>
            <h3>Collect Payment</h3>
            <p class="modal-subtitle">{{ collectForm.packageId }} • {{ collectForm.customerName }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="billingModals.collect = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmCollect">
          <div class="collect-summary">
            <div class="collect-row"><span>Total Due</span><span class="total-value">{{ formatCurrency(collectForm.totalDue) }}</span></div>
            <div class="collect-row"><span>Late Fee ({{ collectForm.lateDays }} days)</span><span>{{ formatCurrency(collectForm.lateFee || 0) }}</span></div>
            <div class="collect-row"><span>Previously Paid</span><span>{{ formatCurrency(collectForm.amountPreviouslyPaid || 0) }}</span></div>
            <div class="collect-row balance-row"><span>Balance</span><span>{{ formatCurrency(collectForm.balance) }}</span></div>
          </div>
          <div class="collect-fields">
            <div class="collect-field-row">
              <div class="field-group">
                <label class="field-label">Payment Type</label>
                <select v-model="collectForm.paymentMethod" required class="modern-select">
                  <option value="">Select type</option>
                  <option value="Cash">Cash</option>
                  <option value="POS">POS</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Loyalty">Loyalty</option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label">Amount</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input v-model.number="collectForm.amountPaid" type="number" min="0" step="0.01" :max="collectForm.balance" placeholder="0.00" required />
                </div>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Notes (optional)</label>
              <input v-model="collectForm.notes" type="text" placeholder="Payment notes..." class="modern-input" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="pill ghost" type="button" @click="billingModals.collect = false">Cancel</button>
            <button class="pill" type="submit">Collect Payment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Billing View Modal -->
    <div class="modal" v-if="billingModals.view">
      <div class="modal-card billing-modal" style="max-width: 520px;">
        <header>
          <div>
            <h3>Package Details</h3>
            <p class="modal-subtitle">{{ billingViewItem?.package_id || billingViewItem?.id }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="billingModals.view = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div style="padding: 20px 24px;">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Customer</span>
              <span class="info-value">{{ billingViewItem?.customer_name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Alt Name</span>
              <span class="info-value">{{ billingViewItem?.alt_name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tracking</span>
              <span class="info-value">{{ billingViewItem?.tracking_number }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Weight</span>
              <span class="info-value">{{ billingViewItem?.weight ? billingViewItem.weight + ' lb' : '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">SL Status</span>
              <span class="info-value">{{ billingViewItem?.status || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">BL Status</span>
              <span class="info-value">{{ billingViewItem?.billing_status || 'Unbilled' }}</span>
            </div>
          </div>
          <div class="section-divider"></div>
          <h4 class="section-title">Billing Information</h4>
          <div class="payment-info">
            <div class="payment-row"><span>Package Cost</span><span>{{ formatCurrency(billingViewItem?.package_cost || 0) }}</span></div>
            <div class="payment-row"><span>Import Fee</span><span>{{ formatCurrency(billingViewItem?.custom_fee || 0) }}</span></div>
            <div class="payment-row"><span>Processing Fee</span><span>{{ formatCurrency(billingViewItem?.processing_fee || 0) }}</span></div>
            <div class="payment-row"><span>Late Fee</span><span>{{ formatCurrency(billingViewItem?.late_fee || 0) }}</span></div>
            <div class="payment-row total"><span>Total Cost</span><span>{{ formatCurrency(calculateItemCost(billingViewItem)) }}</span></div>
            <div class="payment-row"><span>Amount Paid</span><span>{{ formatCurrency(billingViewItem?.amount_paid || 0) }}</span></div>
          </div>
          <div class="info-grid" style="margin-top: 16px;">
            <div class="info-item">
              <span class="info-label">Payment Method</span>
              <span class="info-value">{{ billingViewItem?.payment_method || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Bill Date</span>
              <span class="info-value">{{ billingViewItem?.bill_date ? new Date(billingViewItem.bill_date).toLocaleDateString() : '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Collection Date</span>
              <span class="info-value">{{ billingViewItem?.collection_date ? new Date(billingViewItem.collection_date).toLocaleDateString() : '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Billed By</span>
              <span class="info-value">{{ billingViewItem?.billed_by || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Collected By</span>
              <span class="info-value">{{ billingViewItem?.collected_by || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Notes</span>
              <span class="info-value">{{ billingViewItem?.billing_notes || '—' }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="pill ghost" type="button" @click="billingModals.view = false">Close</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Billing Edit Modal -->
    <div class="modal" v-if="billingModals.edit">
      <div class="modal-card billing-modal" style="max-width: 480px;">
        <header>
          <div>
            <h3>Edit Package</h3>
            <p class="modal-subtitle">{{ billingEditForm.packageId }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="billingModals.edit = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmBillingEdit">
          <div class="billing-fields">
            <div class="info-grid">
              <div class="field-group">
                <label class="field-label">Customer Name</label>
                <input v-model="billingEditForm.customerName" type="text" required class="modern-input" />
              </div>
              <div class="field-group">
                <label class="field-label">Alt Name</label>
                <input v-model="billingEditForm.altName" type="text" class="modern-input" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Weight (lb)</label>
              <input v-model.number="billingEditForm.weight" type="number" min="0" step="0.01" class="modern-input" />
            </div>
            <div class="section-divider"></div>
            <h4 class="section-title">Billing Details</h4>
            <div class="info-grid">
              <div class="field-group">
                <label class="field-label">Package Cost</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input v-model.number="billingEditForm.packageCost" type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Import Fee</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input v-model.number="billingEditForm.customFee" type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Processing Fee</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input v-model.number="billingEditForm.processingFee" type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Late Fee</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input v-model.number="billingEditForm.lateFee" type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Payment Method</label>
              <select v-model="billingEditForm.paymentMethod" class="modern-select">
                <option value="">None</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
                <option value="Transfer">Transfer</option>
                <option value="Loyalty">Loyalty</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Billing Notes</label>
              <textarea v-model="billingEditForm.billingNotes" rows="2" placeholder="Notes..." class="modern-textarea"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="pill ghost" type="button" @click="billingModals.edit = false">Cancel</button>
            <button class="pill" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Billing Delete Modal -->
    <div class="modal" v-if="billingModals.delete">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete Package</h3>
            <p class="modal-subtitle">{{ billingDeleteItem?.package_id || billingDeleteItem?.id }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="billingModals.delete = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div style="padding: 20px 24px;">
          <div class="delete-warning">
            <p>Are you sure you want to delete this package? This action cannot be undone.</p>
          </div>
          <div class="delete-info">
            <div class="delete-info-row">
              <span>Customer</span>
              <span>{{ billingDeleteItem?.customer_name }}</span>
            </div>
            <div class="delete-info-row">
              <span>Tracking</span>
              <span>{{ billingDeleteItem?.tracking_number }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="pill ghost" type="button" @click="billingModals.delete = false">Cancel</button>
            <button class="pill danger" type="button" @click="confirmBillingDelete">Delete Package</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal" v-if="userModals.add">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Add New User</h3>
            <p class="modal-subtitle">User management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="userModals.add = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmUserAdd">
          <div class="form-grid">
            <label>
              <span class="input-label">Full name</span>
              <input v-model="userForm.name" type="text" placeholder="John Doe" required />
            </label>
            <label>
              <span class="input-label">Email</span>
              <input v-model="userForm.email" type="email" placeholder="john@sgxpress.com" required />
            </label>
            <label>
              <span class="input-label">Password</span>
              <input v-model="userForm.password" type="password" placeholder="Enter password" required />
            </label>
            <label>
              <span class="input-label">Role</span>
              <select v-model="userForm.role" required>
                <option value="full_control">Full Control</option>
                <option value="editor">Editor</option>
                <option value="view_only">View Only</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="userModals.add = false">Cancel</button>
            <button class="pill" type="submit">Create user</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="userModals.edit">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit User</h3>
            <p class="modal-subtitle">User management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="userModals.edit = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmUserEdit">
          <div class="form-grid">
            <label>
              <span class="input-label">Full name</span>
              <input v-model="userEditForm.name" type="text" required />
            </label>
            <label>
              <span class="input-label">Email</span>
              <input v-model="userEditForm.email" type="email" required />
            </label>
            <label>
              <span class="input-label">New password (leave blank to keep current)</span>
              <input v-model="userEditForm.password" type="password" placeholder="Enter new password" />
            </label>
            <label>
              <span class="input-label">Role</span>
              <select v-model="userEditForm.role" required>
                <option value="full_control">Full Control</option>
                <option value="editor">Editor</option>
                <option value="view_only">View Only</option>
                <option value="custom">Custom</option>
              </select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="userModals.edit = false">Cancel</button>
            <button class="pill" type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </div>

    <div class="modal" v-if="userModals.delete">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete User</h3>
            <p class="modal-subtitle">{{ userDeleteTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="userModals.delete = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <p class="muted" style="margin-bottom: 20px;">Are you sure you want to delete this user? This action cannot be undone.</p>
        <div class="modal-footer">
          <button class="pill ghost" type="button" @click="userModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="confirmUserDelete">Delete User</button>
        </div>
      </div>
    </div>

    <div class="modal" v-if="userModals.permissions">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Configure Permissions</h3>
            <p class="modal-subtitle">{{ permissionTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="userModals.permissions = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div class="card">
          <p class="muted">Customize individual permissions for this user. Setting a predefined role will override custom permissions.</p>
          <div class="form-grid" style="margin-top: 16px;">
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.collect" />
              <div>
                <strong>Collect payments</strong>
                <p class="muted">Mark packages as collected and process payments</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.edit" />
              <div>
                <strong>Edit packages</strong>
                <p class="muted">Modify package details and tracking info</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.delete" />
              <div>
                <strong>Delete packages</strong>
                <p class="muted">Remove packages from the system</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.addPackage" />
              <div>
                <strong>Add packages</strong>
                <p class="muted">Create new package entries</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.manageOrders" />
              <div>
                <strong>Manage orders</strong>
                <p class="muted">Create, edit, and delete customer orders</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.manageShipments" />
              <div>
                <strong>Manage shipment logs</strong>
                <p class="muted">Upload, edit, and delete shipment logs</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.editShipmentItems" />
              <div>
                <strong>Edit shipment items</strong>
                <p class="muted">Modify package details in shipment logs</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.moveShipmentItems" />
              <div>
                <strong>Move shipment items</strong>
                <p class="muted">Transfer packages between shipment logs</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.scanPackages" />
              <div>
                <strong>Scan packages</strong>
                <p class="muted">Mark packages as received by scanning</p>
              </div>
            </label>
            <label class="toggle-row">
              <input type="checkbox" v-model="customPermissions.admin" />
              <div>
                <strong>Admin access</strong>
                <p class="muted">Access admin panel and manage users</p>
              </div>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="userModals.permissions = false">Cancel</button>
          <button class="pill" type="button" @click="saveCustomPermissions">Save permissions</button>
        </div>
      </div>
    </div>

    <!-- Shipment Upload Modal -->
    <div class="modal" v-if="shipmentModals.upload">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Upload Shipment Log</h3>
            <p class="modal-subtitle">Shipment Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.upload = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmShipmentUpload">
          <p class="muted">Upload a CSV file exported from Google Sheets with columns: Package ID, Code, Customer Name, Alt Name, Tracking Number, Weight, Description</p>
          <div class="form-grid" style="margin-top: 16px;">
            <label>
              <span class="input-label">Shipment Date</span>
              <input v-model="shipmentUploadForm.shipmentDate" type="date" required />
            </label>
            <label>
              <span class="input-label">Cargo Type</span>
              <select v-model="shipmentUploadForm.cargoType" required style="padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px;">
                <option value="Air Cargo">Air Cargo</option>
                <option value="Ocean Cargo">Ocean Cargo</option>
                <option value="China Cargo">China Cargo</option>
              </select>
            </label>
            <label style="grid-column: 1 / -1;">
              <span class="input-label">CSV File</span>
              <input type="file" accept=".csv" @change="handleFileSelect" required />
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="shipmentModals.upload = false">Cancel</button>
            <button class="pill" type="submit" :disabled="!shipmentUploadForm.file">Upload</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Move Package Confirmation Modal -->
    <div class="modal" v-if="shipmentModals.moveConfirm">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Move Package?</h3>
            <p class="modal-subtitle">Package Found in Another Log</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.moveConfirm = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p class="muted">This package was found in: <strong>{{ movePackageData.log?.log_name }} ({{ movePackageData.log?.shipment_date }})</strong></p>
          <p class="muted" style="margin-top: 12px;">Customer: <strong>{{ movePackageData.item?.customer_name }}</strong></p>
          <p class="muted">Tracking: <strong>{{ movePackageData.item?.tracking_number }}</strong></p>
          <p style="margin-top: 16px;">Do you want to move this package to the current shipment log?</p>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="shipmentModals.moveConfirm = false">Cancel</button>
          <button class="pill" type="button" @click="confirmMovePackage">Move to Current Log</button>
        </div>
      </div>
    </div>

    <!-- Edit Shipment Log Modal -->
    <div class="modal" v-if="shipmentModals.edit">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit Shipment Log</h3>
            <p class="modal-subtitle">Shipment Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.edit = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmShipmentEdit">
          <div class="form-grid">
            <label>
              <span class="input-label">Log Name</span>
              <input v-model="shipmentEditForm.logName" type="text" required />
            </label>
            <label>
              <span class="input-label">Shipment Date</span>
              <input v-model="shipmentEditForm.shipmentDate" type="date" required />
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="shipmentModals.edit = false">Cancel</button>
            <button class="pill" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Shipment Log Modal -->
    <div class="modal" v-if="shipmentModals.delete">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete Shipment Log</h3>
            <p class="modal-subtitle">This action cannot be undone</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.delete = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p class="muted">Are you sure you want to delete this shipment log?</p>
          <p style="margin-top: 12px;"><strong>{{ shipmentDeleteTarget?.log_name }}</strong> - {{ shipmentDeleteTarget?.shipment_date }}</p>
          <p class="error-text" style="margin-top: 16px;">This action cannot be undone. All associated shipment items will also be deleted.</p>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="shipmentModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="confirmShipmentDelete">Delete Shipment Log</button>
        </div>
      </div>
    </div>

    <!-- Add Shipment Item Modal -->
    <div class="modal" v-if="shipmentModals.addItem">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Add New Package</h3>
            <p class="modal-subtitle">Package Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.addItem = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmAddShipmentItem">
          <div class="form-grid">
            <label>
              <span class="input-label">Customer Name</span>
              <input v-model="itemAddForm.customerName" type="text" required />
            </label>
            <label>
              <span class="input-label">Alt Name</span>
              <input v-model="itemAddForm.altName" type="text" />
            </label>
            <label>
              <span class="input-label">Tracking Number</span>
              <input v-model="itemAddForm.trackingNumber" type="text" required />
            </label>
            <label>
              <span class="input-label">Package ID</span>
              <input v-model="itemAddForm.packageId" type="text" />
            </label>
            <label>
              <span class="input-label">Code</span>
              <input v-model="itemAddForm.code" type="text" placeholder="e.g., DHL, FedEx" />
            </label>
            <label>
              <span class="input-label">Weight (LB)</span>
              <input v-model="itemAddForm.weight" type="number" step="0.1" />
            </label>
            <label style="grid-column: 1 / -1;">
              <span class="input-label">Description</span>
              <textarea v-model="itemAddForm.description" rows="3"></textarea>
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="shipmentModals.addItem = false">Cancel</button>
            <button class="pill" type="submit">Add Package</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Shipment Item Modal -->
    <div class="modal" v-if="shipmentModals.editItem">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit Package</h3>
            <p class="modal-subtitle">Package Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.editItem = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <form @submit.prevent="confirmItemEdit">
          <div class="form-grid">
            <label>
              <span class="input-label">Customer Name</span>
              <input v-model="itemEditForm.customerName" type="text" required />
            </label>
            <label>
              <span class="input-label">Alt Name</span>
              <input v-model="itemEditForm.altName" type="text" />
            </label>
            <label>
              <span class="input-label">Tracking Number</span>
              <input v-model="itemEditForm.trackingNumber" type="text" required />
            </label>
            <label>
              <span class="input-label">Package ID</span>
              <input v-model="itemEditForm.packageId" type="text" />
            </label>
            <label>
              <span class="input-label">Weight (LB)</span>
              <input v-model="itemEditForm.weight" type="number" step="0.1" />
            </label>
          </div>
          <div class="modal-actions">
            <button class="pill ghost" type="button" @click="shipmentModals.editItem = false">Cancel</button>
            <button class="pill" type="submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Move Shipment Item Modal -->
    <div class="modal" v-if="shipmentModals.moveItem">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Move Package</h3>
            <p class="modal-subtitle">Move to Different Shipment</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="shipmentModals.moveItem = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p class="muted" style="margin-bottom: 16px;">Select the shipment log you want to move this package to:</p>
          <div style="padding: 16px; background: #f8fafb; border-radius: 12px; margin-bottom: 20px;">
            <p class="muted"><strong>Package Details:</strong></p>
            <p style="margin-top: 8px;"><strong>Customer:</strong> {{ itemMoveTarget?.customer_name }}</p>
            <p><strong>Tracking:</strong> {{ itemMoveTarget?.tracking_number }}</p>
            <p><strong>Package ID:</strong> {{ itemMoveTarget?.package_id || '—' }}</p>
          </div>
          <label>
            <span class="input-label">Destination Shipment Log</span>
            <select v-model="itemMoveDestination" required>
              <option value="">-- Select destination log --</option>
              <option
                v-for="log in shipmentLogs.filter(l => l.id !== activeShipmentLogId)"
                :key="log.id"
                :value="log.id"
              >
                {{ log.log_name }} - {{ log.shipment_date }}
              </option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="shipmentModals.moveItem = false">Cancel</button>
          <button class="pill" type="button" @click="confirmItemMove" :disabled="!itemMoveDestination">Move Package</button>
        </div>
      </div>
    </div>

  </div>

  <!-- SETTINGS PAGE MODALS -->

  <!-- Create Role Modal -->
  <div v-if="roleModals.add">
    <div class="modal" @click.self="roleModals.add = false">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Create New Role</h3>
            <p class="modal-subtitle">Role Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="roleModals.add = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div class="form-grid">
          <label>
            <span class="input-label">Role Name</span>
            <input v-model="roleForm.name" type="text" placeholder="Enter role name" required />
          </label>
          <label>
            <span class="input-label">Description</span>
            <textarea v-model="roleForm.description" placeholder="Describe this role..." rows="3"></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="roleModals.add = false">Cancel</button>
          <button class="pill" type="button" @click="createRole" :disabled="!roleForm.name">Create Role</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Role Modal -->
  <div v-if="roleModals.edit">
    <div class="modal" @click.self="roleModals.edit = false">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Edit Role</h3>
            <p class="modal-subtitle">Role Management</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="roleModals.edit = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div class="form-grid">
          <label>
            <span class="input-label">Role Name</span>
            <input v-model="roleEditForm.name" type="text" placeholder="Enter role name" required />
          </label>
          <label>
            <span class="input-label">Description</span>
            <textarea v-model="roleEditForm.description" placeholder="Describe this role..." rows="3"></textarea>
          </label>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="roleModals.edit = false">Cancel</button>
          <button class="pill" type="button" @click="updateRole" :disabled="!roleEditForm.name">Update Role</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Role Modal -->
  <div v-if="roleModals.delete">
    <div class="modal" @click.self="roleModals.delete = false">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Delete Role</h3>
            <p class="modal-subtitle">{{ roleDeleteTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="roleModals.delete = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p style="margin-bottom: 16px;">Are you sure you want to delete the role <strong>{{ roleDeleteTarget?.name }}</strong>?</p>
          <p class="muted">This action cannot be undone. Users with this role will need to be reassigned.</p>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="roleModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="deleteRole">Delete Role</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Duplicate Role Modal -->
  <div v-if="roleModals.duplicate">
    <div class="modal" @click.self="roleModals.duplicate = false">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Duplicate Role</h3>
            <p class="modal-subtitle">{{ roleDuplicateTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="roleModals.duplicate = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p class="muted" style="margin-bottom: 16px;">Duplicating role: <strong>{{ roleDuplicateTarget?.name }}</strong></p>
          <label>
            <span class="input-label">New Role Name</span>
            <input v-model="duplicateRoleName" type="text" placeholder="Enter new role name" required />
          </label>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="roleModals.duplicate = false">Cancel</button>
          <button class="pill" type="button" @click="duplicateRole" :disabled="!duplicateRoleName">Duplicate Role</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Role Permissions Modal -->
  <div v-if="roleModals.permissions">
    <div class="modal" @click.self="roleModals.permissions = false">
      <div class="modal-card billing-modal large">
        <header>
          <div>
            <h3>Manage Permissions</h3>
            <p class="modal-subtitle">{{ rolePermissionsTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="roleModals.permissions = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div style="max-height: 500px; overflow-y: auto; padding-right: 8px;">
          <div v-for="(perms, category) in permissionsByCategory" :key="category" style="margin-bottom: 24px;">
            <h4 style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9;">
              {{ category }}
            </h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <label v-for="perm in perms" :key="perm.id" class="permission-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedPermissions.includes(perm.id)"
                  @change="togglePermission(perm.id)"
                />
                <div>
                  <strong>{{ perm.name }}</strong>
                  <p class="muted" style="font-size: 13px;">{{ perm.description }}</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="roleModals.permissions = false">Cancel</button>
          <button class="pill" type="button" @click="saveRolePermissions">Save Permissions</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Password Reset Modal -->
  <div v-if="passwordResetModal">
    <div class="modal" @click.self="passwordResetModal = false">
      <div class="modal-card billing-modal">
        <header>
          <div>
            <h3>Reset Password</h3>
            <p class="modal-subtitle">{{ passwordResetTarget?.name }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="passwordResetModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>
        <div>
          <p class="muted" style="margin-bottom: 16px;">Resetting password for: <strong>{{ passwordResetTarget?.name }}</strong></p>
          <label>
            <span class="input-label">New Password</span>
            <input v-model="newPassword" type="password" placeholder="Enter new password" required />
          </label>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="passwordResetModal = false">Cancel</button>
          <button class="pill" type="button" @click="resetUserPassword" :disabled="!newPassword">Reset Password</button>
        </div>
      </div>
    </div>

    <!-- Role Permission Modal -->
    <div v-if="rolePermissionModal" class="modal" @click.self="rolePermissionModal = false">
      <div class="modal-card billing-modal" style="max-width: 700px;">
        <header>
          <div>
            <h3>Role Permissions</h3>
            <p class="modal-subtitle">{{ selectedRoleForPermissions }}</p>
          </div>
          <button class="close-btn" aria-label="Close modal" @click="rolePermissionModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>

        <div style="max-height: 500px; overflow-y: auto; padding-right: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px; background: #f1f5f9; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px; font-weight: 600; color: var(--text-main);">Administrator Access</span>
              <span style="font-size: 14px; color: #64748b;">ⓘ</span>
            </div>
            <label style="margin: 0; cursor: pointer;">
              <input
                type="checkbox"
                :checked="Object.values(rolePermissionSettings).every(p => p.read && p.write && p.create)"
                @change="e => Object.keys(rolePermissionSettings).forEach(k => toggleAllPermissions(k, e.target.checked))"
              />
              <span style="margin-left: 8px; font-size: 14px; font-weight: 600;">Select All</span>
            </label>
          </div>

          <!-- Permission Categories -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Package Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Package Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.packageManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.packageManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.packageManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Customer Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Customer Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.customerManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.customerManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.customerManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Order Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Order Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.orderManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.orderManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.orderManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Collection Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Collection Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.collectionManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.collectionManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.collectionManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Shipment Bin Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Shipment Bin Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.shipmentBinManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.shipmentBinManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.shipmentBinManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Dashboard/Reporting -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Dashboard/Reporting</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.dashboardReporting.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.dashboardReporting.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.dashboardReporting.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- API Configuration -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">API Configuration</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.apiConfiguration.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.apiConfiguration.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.apiConfiguration.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Settings Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">Settings Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.settingsManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.settingsManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.settingsManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- User Management -->
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 15px; color: var(--text-main);">User Management</strong>
                <div style="display: flex; gap: 32px;">
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.userManagement.read" />
                    <span style="font-size: 14px;">Read</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.userManagement.write" />
                    <span style="font-size: 14px;">Write</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" v-model="rolePermissionSettings.userManagement.create" />
                    <span style="font-size: 14px;">Create</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 24px;">
          <button class="pill ghost" type="button" @click="rolePermissionModal = false">Cancel</button>
          <button class="pill" type="button" @click="submitRolePermissionSettings" style="background: #3b82f6;">Submit</button>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, nextTick } from "vue";
import logo from "./logo-icon.png";
import homeIcon from "./assets/home.png";
import editIcon from "./assets/edit.png";
import userIcon from "./assets/user.png";
import settingsIcon from "./assets/settings.png";
import shoppingCartIcon from "./assets/shopping-cart.png";
import planeIcon from "./assets/plane-alt.png";
import shipIcon from "./assets/ship.png";

const employees = reactive([
  { id: "emp-0", name: "Warren Walker", email: "warren@sgxpress.com", password: "admin123", photo: "", location: "", role: "full_control", customPermissions: null, active: 1, lastLogin: "2025-11-27 20:45:00" },
  { id: "emp-1", name: "Jordan Lee", email: "jordan@sgxpress.com", password: "pass123", photo: "", location: "", role: "full_control", customPermissions: null, active: 1, lastLogin: "2025-11-27 19:30:00" },
  { id: "emp-2", name: "Nina Patel", email: "nina@sgxpress.com", password: "pass123", photo: "", location: "", role: "editor", customPermissions: null, active: 1, lastLogin: "2025-11-27 18:15:00" },
  { id: "emp-3", name: "Carlos Martinez", email: "carlos@sgxpress.com", password: "pass123", photo: "", location: "", role: "view_only", customPermissions: null, active: 1, lastLogin: "2025-11-26 14:20:00" },
  { id: "emp-4", name: "Amara Jones", email: "amara@sgxpress.com", password: "pass123", photo: "", location: "", role: "view_only", customPermissions: null, active: 0, lastLogin: "2025-11-20 10:00:00" },
]);

const initialCustomers = [
  {
    id: "C-1201",
    name: "Amelia Brown",
    packages: [
      {
        packageId: "PKG-1001",
        trackingNumber: "TRK-993240",
        status: "Ready for Pickup",
        weight: 9.3,
        dateUpdated: "2023-11-25",
        description: "Audio equipment",
        cost: 128.4,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Air",
        notes: ["Cleared by billing"],
        collected: false,
        deleted: false,
      },
      {
        packageId: "PKG-1002",
        trackingNumber: "TRK-993241",
        status: "Processing at Customs",
        weight: 21.6,
        dateUpdated: "2023-11-24",
        description: "Household goods",
        cost: 312.0,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Sea",
        notes: [],
        collected: false,
        deleted: false,
      },
    ],
  },
  {
    id: "C-1202",
    name: "Elias Carter",
    packages: [
      {
        packageId: "PKG-2031",
        trackingNumber: "TRK-778340",
        status: "Ready for Pickup",
        weight: 5.3,
        dateUpdated: "2023-11-24",
        description: "Clothing samples",
        cost: 78.5,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Air",
        notes: ["Fragile"],
        collected: false,
        deleted: false,
      },
      {
        packageId: "PKG-2032",
        trackingNumber: "TRK-778341",
        status: "Ready for Pickup",
        weight: 13.9,
        dateUpdated: "2023-11-23",
        description: "Home decor",
        cost: 156.75,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Sea",
        notes: [],
        collected: false,
        deleted: false,
      },
    ],
  },
  {
    id: "C-1203",
    name: "Priya Desai",
    packages: [
      {
        packageId: "PKG-3110",
        trackingNumber: "TRK-449990",
        status: "Processing in Office",
        weight: 7.7,
        dateUpdated: "2023-11-25",
        description: "Laptop accessories",
        cost: 210.0,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Air",
        notes: ["Awaiting invoice approval"],
        collected: false,
        deleted: false,
      },
      {
        packageId: "PKG-3111",
        trackingNumber: "TRK-449991",
        status: "Ready for Pickup",
        weight: 26.4,
        dateUpdated: "2023-11-24",
        description: "Furniture piece",
        cost: 520.0,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Sea",
        notes: [],
        collected: false,
        deleted: false,
      },
    ],
  },
  {
    id: "C-1204",
    name: "Marcus Reed",
    packages: [
      {
        packageId: "PKG-4110",
        trackingNumber: "TRK-559001",
        status: "Ready for Pickup",
        weight: 3.1,
        dateUpdated: "2023-11-23",
        description: "Documents",
        cost: 25.0,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Air",
        notes: ["Handle with care"],
        collected: false,
        deleted: false,
      },
      {
        packageId: "PKG-4111",
        trackingNumber: "TRK-559002",
        status: "In Transit",
        weight: 33.1,
        dateUpdated: "2023-11-22",
        description: "Gym equipment",
        cost: 340.0,
        paymentMethod: "",
        updatedBy: "",
        billingStatus: "Open",
        amountPaid: 0,
        freightType: "Sea",
        notes: [],
        collected: false,
        deleted: false,
      },
    ],
  },
];

const initialOrders = [
  {
    id: "ORD-1001",
    date: "2023-11-25",
    customerName: "Liam Chen",
    description: "Electronics accessories",
    cost: 240.5,
    status: "Ordered",
    merchant: "TechSupply",
    method: "Credit Card",
    updatedBy: "",
  },
  {
    id: "ORD-1002",
    date: "2023-11-24",
    customerName: "Sara Mills",
    description: "Home goods",
    cost: 180.0,
    status: "Received",
    merchant: "HomeNest",
    method: "Credit Card",
    updatedBy: "",
  },
];

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const customers = ref(clone(initialCustomers));
const orders = ref(clone(initialOrders));
const activeCustomerId = ref(null);
const showAll = ref(false);
const searchQuery = ref("");
const showAutocomplete = ref(false);
const selectedPackages = ref([]);
const selectedPackageIds = ref([]);
const selectedOrderIds = ref([]);
const collectedToday = ref(0);
const modals = reactive({
  collection: false,
  edit: false,
  delete: false,
  add: false,
  view: false,
  adminAdd: false,
  adminEdit: false,
});

// ==================== BILLING CONSOLE STATE ====================
const billingItems = ref([]);
const billingSearchQuery = ref('');
const billingStatusFilter = ref('all');
const billingCurrentPage = ref(1);
const billingItemsPerPage = 25;
const billingStats = reactive({
  unbilled: 0,
  open: 0,
  closedToday: 0,
  amountCollectedToday: 0
});

const billingModals = reactive({
  bill: false,
  collect: false,
  view: false,
  edit: false,
  delete: false,
});

const billForm = reactive({
  id: null,
  packageId: '',
  customerName: '',
  trackingNumber: '',
  packageCost: 0,
  customFee: 0,
  processingFee: 0,
});

const collectForm = reactive({
  id: null,
  packageId: '',
  customerName: '',
  packageCost: 0,
  customFee: 0,
  processingFee: 0,
  lateFee: 0,
  lateDays: 0,
  totalDue: 0,
  amountPreviouslyPaid: 0,
  balance: 0,
  paymentMethod: '',
  amountPaid: 0,
  notes: '',
});

const billingViewItem = ref(null);
const billingDeleteItem = ref(null);

const billingEditForm = reactive({
  id: null,
  packageId: '',
  customerName: '',
  altName: '',
  weight: 0,
  packageCost: 0,
  customFee: 0,
  processingFee: 0,
  lateFee: 0,
  paymentMethod: '',
  billingNotes: '',
});

const openBillingKebabId = ref(null);
const openBLStatusDropdownId = ref(null);

const collectionForm = reactive({
  amount: "",
  method: "Cash",
  note: "",
  lateFee: 0,
});

const editForm = reactive({
  packageId: null,
  trackingNumber: "",
  weight: 0,
  description: "",
  cost: 0,
  note: "",
});

const deleteForm = reactive({
  packageId: null,
  note: "",
});

const searchBox = ref(null);
const currentUser = ref(null);
const currentPage = ref("login");
// Load saved credentials from localStorage
const savedCreds = localStorage.getItem('sgx_remember_me');
const initialCreds = savedCreds ? JSON.parse(savedCreds) : { username: "", password: "", rememberMe: false };

const loginForm = reactive({
  username: initialCreds.username || "",
  password: initialCreds.password || "",
  rememberMe: initialCreds.rememberMe || false
});
const loginError = ref("");
const profileForm = reactive({ email: "", password: "", photo: "" });
const placeholderPhoto = "https://via.placeholder.com/120x120.png?text=Photo";
const settings = reactive({ notifyEmail: true, notifySms: false, notifyDesktop: true });
const activeSettingsTab = ref('roles');
const activeDailyMethod = ref(null); // null means show all, or 'cash', 'pos', 'transfer', 'creditCard'
const dailySummaryDateFilter = ref('');
const dailyTimeFilter = ref('today'); // 'today', '7days', '1month', '90days', 'year'
const collectionLog = ref([]);
const statusOptions = ["Ready for Pickup", "Processing at Customs", "Processing in Office", "In Transit"];
const ordersSearch = ref("");
const orderStatusOptions = ["Ordered", "Received"];
const orderModals = reactive({ add: false, edit: false, delete: false });
const orderAddForm = reactive({
  id: "",
  date: "",
  customerName: "",
  description: "",
  cost: "",
  status: "Ordered",
  merchant: "",
  method: "Credit Card",
  currency: "JMD",
});
const orderEditForm = reactive({ ...orderAddForm });
const orderDeleteId = ref("");
const apiForm = reactive({
  baseUrl: "",
  apiKey: "",
  path: "/packages",
  method: "GET",
  payload: "",
});
const apiStatus = ref("Not connected");
const apiUpdateForm = reactive({
  packageId: "",
  status: "Ready for Pickup",
  billingStatus: "Open",
  cost: "",
  method: "",
  freightType: "Air",
  note: "",
});
const apiMessage = ref("");

// Courier Depot API Integration (credentials now stored in backend)
const courierDepotApi = reactive({
  accessToken: null,
  tokenExpiry: null,
  isAuthenticated: false,
});
const apiSyncStatus = ref(""); // For showing sync messages
const isSyncing = ref(false);

// Packages page state
const packagesSearchQuery = ref("");
const packagesActiveFilter = ref("all");
const lastSyncTime = ref("");
const lastSyncDetails = ref("");

const profileMenuOpen = ref(false);
const viewPackage = ref(null);
const adminEditId = ref("");
const adminUserForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "view_only",
});
const userModals = reactive({ add: false, edit: false, delete: false, permissions: false });
const userForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "view_only",
});
const userEditForm = reactive({
  id: "",
  name: "",
  email: "",
  password: "",
  role: "view_only",
});
const userDeleteTarget = ref(null);
const permissionTarget = ref(null);
const customPermissions = reactive({
  collect: false,
  edit: false,
  delete: false,
  addPackage: false,
  manageOrders: false,
  manageShipments: false,
  editShipmentItems: false,
  moveShipmentItems: false,
  scanPackages: false,
  admin: false,
});

// Settings Page State - Roles & Permissions
const roles = ref([]);
const permissions = ref([]);
const roleModals = reactive({ add: false, edit: false, delete: false, duplicate: false, permissions: false });
const roleForm = reactive({ name: "", description: "" });
const roleEditForm = reactive({ id: "", name: "", description: "" });
const roleDeleteTarget = ref(null);
const roleDuplicateTarget = ref(null);
const duplicateRoleName = ref("");
// Settings Page State - Role Permission Modal
const rolePermissionModal = ref(false);
const selectedRoleForPermissions = ref(null);
const rolePermissionSettings = reactive({
  packageManagement: { read: false, write: false, create: false },
  customerManagement: { read: false, write: false, create: false },
  orderManagement: { read: false, write: false, create: false },
  collectionManagement: { read: false, write: false, create: false },
  shipmentBinManagement: { read: false, write: false, create: false },
  dashboardReporting: { read: false, write: false, create: false },
  apiConfiguration: { read: false, write: false, create: false },
  settingsManagement: { read: false, write: false, create: false },
  userManagement: { read: false, write: false, create: false }
});
const userRoleFilter = ref('');
const userStatusFilter = ref('');
const userSearchFilter = ref('');

// Settings Page State - User Management
const passwordResetModal = ref(false);
const passwordResetTarget = ref(null);
const newPassword = ref("");

// Settings Page State - API Configuration
const apiConfig = ref(null);
const apiSyncLogs = ref([]);
const apiConfigForm = reactive({
  baseUrl: "",
  apiKey: "",
  email: "",
  password: "",
  timeout: 30000,
  environment: "production",
});
const showApiPassword = ref(false);
const apiTestStatus = ref("");
const apiTestMessage = ref("");
const isEditingApiConfig = ref(false);

// Settings Page State - Maintenance Mode
const maintenanceMode = ref(false);

// Shipment Bin State
const shipmentLogs = ref([]);
const activeShipmentLogId = ref("");
const shipmentItems = ref([]);
const shipmentFilter = ref("all");
const shipmentCourierFilter = ref("");
const shipmentSearchQuery = ref("");
const shipmentSortColumn = ref("");
const shipmentSortDirection = ref("asc");
const scanTrackingNumber = ref("");
const scanMessage = ref("");
const scanStatus = ref("info");
const scanInput = ref(null);
const notFoundCount = ref(0);
const notFoundScans = ref([]);
const showNotFoundScans = ref(false);

// Kebab Menu State
const openUserKebabId = ref(null);
const openShipmentItemKebabId = ref(null);

const shipmentModals = reactive({ upload: false, moveConfirm: false, edit: false, delete: false, editItem: false, moveItem: false, addItem: false });
const shipmentUploadForm = reactive({
  shipmentDate: new Date().toISOString().split('T')[0],
  cargoType: 'Air Cargo',
  file: null,
});
const shipmentEditForm = reactive({
  id: '',
  logName: '',
  shipmentDate: '',
});
const shipmentDeleteTarget = ref(null);
const movePackageData = reactive({
  item: null,
  log: null,
});
const itemEditForm = reactive({
  id: '',
  customerName: '',
  altName: '',
  trackingNumber: '',
  packageId: '',
  weight: '',
});
const itemAddForm = reactive({
  customerName: '',
  altName: '',
  trackingNumber: '',
  packageId: '',
  code: '',
  weight: '',
  description: '',
});
const itemMoveTarget = ref(null);
const itemMoveDestination = ref('');

const shipmentStats = computed(() => {
  const total = shipmentItems.value.length;
  const received = shipmentItems.value.filter(item => item.status === 'received').length;
  const pending = shipmentItems.value.filter(item => item.status === 'pending').length;
  const couriers = uniqueCourierCodes.value.length;
  return { total, received, pending, couriers };
});

// Computed: Unique courier codes from shipment items
const uniqueCourierCodes = computed(() => {
  const codes = new Set();
  shipmentItems.value.forEach(item => {
    const code = item.code || item.courier_code || 'RSC';
    codes.add(code);
  });
  return Array.from(codes).sort();
});

const filteredShipmentItems = computed(() => {
  let filtered = shipmentItems.value;

  // Apply courier filter
  if (shipmentCourierFilter.value) {
    filtered = filtered.filter(item => {
      const code = item.code || item.courier_code || 'RSC';
      return code === shipmentCourierFilter.value;
    });
  }

  // Apply status filter
  if (shipmentFilter.value !== 'all') {
    filtered = filtered.filter(item => item.status === shipmentFilter.value);
  }

  // Apply search filter
  if (shipmentSearchQuery.value.trim()) {
    const query = shipmentSearchQuery.value.toLowerCase();
    filtered = filtered.filter(item => {
      return (
        item.customer_name?.toLowerCase().includes(query) ||
        item.alt_name?.toLowerCase().includes(query) ||
        item.tracking_number?.toLowerCase().includes(query) ||
        item.package_id?.toLowerCase().includes(query) ||
        item.weight?.toString().includes(query) ||
        item.status?.toLowerCase().includes(query) ||
        (item.scanned_at && new Date(item.scanned_at).toLocaleString().toLowerCase().includes(query))
      );
    });
  }

  // Apply sorting
  if (shipmentSortColumn.value) {
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[shipmentSortColumn.value];
      let bVal = b[shipmentSortColumn.value];

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Convert to strings for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (shipmentSortDirection.value === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  return filtered;
});

const rolePermissions = {
  full_control: {
    collect: true,
    edit: true,
    delete: true,
    addPackage: true,
    manageOrders: true,
    manageShipments: true,
    editShipmentItems: true,
    moveShipmentItems: true,
    scanPackages: true,
    admin: true,
  },
  editor: {
    collect: true,
    edit: true,
    delete: false,
    addPackage: true,
    manageOrders: true,
    manageShipments: true,
    editShipmentItems: true,
    moveShipmentItems: true,
    scanPackages: true,
    admin: false,
  },
  view_only: {
    collect: false,
    edit: false,
    delete: false,
    addPackage: false,
    manageOrders: false,
    manageShipments: false,
    editShipmentItems: false,
    moveShipmentItems: false,
    scanPackages: false,
    admin: false,
  },
};
const addForm = reactive({
  customerId: "",
  packageId: "",
  trackingNumber: "",
  status: "Ready for Pickup",
  weight: "",
  description: "",
  cost: "",
  freightType: "Air",
  note: "",
});

const activeCustomer = computed(
  () => customers.value.find((c) => c.id === activeCustomerId.value) || null
);

const filteredCustomers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return customers.value.slice(0, 6);
  return customers.value
    .filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const pkgMatch = c.packages.some(
        (p) =>
          p.packageId.toLowerCase().includes(q) ||
          p.trackingNumber.toLowerCase().includes(q)
      );
      return nameMatch || pkgMatch;
    })
    .slice(0, 6);
});

const filteredOrders = computed(() => {
  const q = ordersSearch.value.trim().toLowerCase();
  if (!q) return orders.value;
  return orders.value.filter(
    (o) =>
      o.customerName.toLowerCase().includes(q) ||
      o.merchant.toLowerCase().includes(q)
  );
});

const visiblePackages = computed(() => {
  if (!activeCustomer.value) return [];
  return activeCustomer.value.packages.filter((pkg) => {
    if (pkg.deleted) return false;
    if (showAll.value) return true;
    return pkg.status === "Ready for Pickup" && !pkg.collected;
  });
});

const allPackagesSelected = computed(() => {
  if (!visiblePackages.value.length) return false;
  const ids = visiblePackages.value.map((p) => p.packageId);
  return ids.every((id) => selectedPackageIds.value.includes(id));
});

const stats = computed(() => {
  const ready = customers.value
    .flatMap((c) => c.packages)
    .filter(
      (pkg) =>
        !pkg.deleted && !pkg.collected && pkg.status === "Ready for Pickup"
    ).length;
  return {
    ready,
    collectedToday: collectedToday.value,
  };
});

// ==================== BILLING CONSOLE COMPUTED ====================
const filteredBillingItems = computed(() => {
  const query = billingSearchQuery.value.trim().toLowerCase();

  // Only show results when there's a search query
  if (!query) {
    return [];
  }

  let items = billingItems.value;

  // Filter by search query
  items = items.filter(item =>
    (item.customer_name && item.customer_name.toLowerCase().includes(query)) ||
    (item.package_id && item.package_id.toLowerCase().includes(query)) ||
    (item.tracking_number && item.tracking_number.toLowerCase().includes(query))
  );

  // Filter by billing status
  if (billingStatusFilter.value !== 'all') {
    items = items.filter(item => item.billing_status === billingStatusFilter.value);
  }

  return items;
});

const billingTotalPages = computed(() => {
  return Math.ceil(filteredBillingItems.value.length / billingItemsPerPage);
});

const paginatedBillingItems = computed(() => {
  const start = (billingCurrentPage.value - 1) * billingItemsPerPage;
  const end = start + billingItemsPerPage;
  return filteredBillingItems.value.slice(start, end);
});

// Packages page computed properties
const allPackagesForPackagesPage = computed(() => {
  return customers.value.flatMap(c => c.packages.map(pkg => ({
    ...pkg,
    customer: c.name
  }))).filter(pkg => !pkg.deleted);
});

const syncedPackagesCount = computed(() => {
  return allPackagesForPackagesPage.value.length;
});

const packageFilters = computed(() => {
  const all = allPackagesForPackagesPage.value;
  return [
    { key: 'all', label: 'All', count: all.length },
    { key: 'pending', label: 'Pending', count: all.filter(p => p.status?.toLowerCase().includes('pending')).length },
    { key: 'received', label: 'Received', count: all.filter(p => p.status?.toLowerCase().includes('received')).length },
    { key: 'in_transit', label: 'In Transit', count: all.filter(p => p.status?.toLowerCase().includes('transit')).length },
    { key: 'delivered', label: 'Delivered', count: all.filter(p => p.status?.toLowerCase().includes('delivered')).length }
  ];
});

const filteredPackagesForPage = computed(() => {
  let filtered = allPackagesForPackagesPage.value;

  // Apply status filter
  if (packagesActiveFilter.value !== 'all') {
    const filterMap = {
      'pending': 'pending',
      'received': 'received',
      'in_transit': 'transit',
      'delivered': 'delivered'
    };
    const searchTerm = filterMap[packagesActiveFilter.value];
    filtered = filtered.filter(p => p.status?.toLowerCase().includes(searchTerm));
  }

  // Apply search
  if (packagesSearchQuery.value.trim()) {
    const query = packagesSearchQuery.value.toLowerCase();
    filtered = filtered.filter(p =>
      p.packageId?.toLowerCase().includes(query) ||
      p.trackingNumber?.toLowerCase().includes(query) ||
      p.customer?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

const readyCountLabel = computed(() => `${stats.value.ready} ready`);

const collectionTitle = computed(() => {
  if (selectedPackages.value.length > 1) {
    return `Collect ${selectedPackages.value.length} packages`;
  }
  return selectedPackages.value.length
    ? `Collect ${selectedPackages.value[0]}`
    : "Mark package collected";
});

const editTitle = computed(() =>
  editForm.packageId ? `Edit ${editForm.packageId}` : "Edit package"
);

const deleteTitle = computed(() =>
  deleteForm.packageId ? `Delete ${deleteForm.packageId}` : "Delete package"
);

const currentRole = computed(() => currentUser.value?.role || "view_only");
const can = (perm) => {
  const user = currentUser.value;
  if (!user) return false;
  // If user has custom permissions, use those
  if (user.role === 'custom' && user.customPermissions) {
    return !!user.customPermissions[perm];
  }
  // Otherwise use role-based permissions
  return !!rolePermissions[user.role]?.[perm];
};
const hasPermission = can; // Alias for template usage
const isAdmin = computed(() => can('admin'));
const allowedPages = computed(() => {
  if (isAdmin.value) return ["dashboard", "shipment-bin", "orders", "packages", "summary", "api", "profile", "settings", "admin"];
  if (currentRole.value === "editor") return ["dashboard", "shipment-bin", "orders", "packages", "summary", "profile"];
  return ["dashboard", "shipment-bin", "summary", "profile", "orders", "packages"];
});

const dailySummary = computed(() => {
  const map = new Map();

  // Add collection log entries (Cash, POS, Transfer)
  collectionLog.value.forEach((entry) => {
    if (!map.has(entry.date)) {
      map.set(entry.date, {
        date: entry.date,
        cash: 0,
        pos: 0,
        transfer: 0,
        creditCard: 0,
        users: new Set(),
      });
    }
    const row = map.get(entry.date);
    if (entry.method === "Cash") row.cash += entry.amount;
    if (entry.method === "POS") row.pos += entry.amount;
    if (entry.method === "Transfer") row.transfer += entry.amount;
    if (entry.user) row.users.add(entry.user);
  });

  // Add SGX Order (Credit Card) amounts
  orders.value.forEach((order) => {
    if (order.method === "Credit Card") {
      if (!map.has(order.date)) {
        map.set(order.date, {
          date: order.date,
          cash: 0,
          pos: 0,
          transfer: 0,
          creditCard: 0,
          users: new Set(),
        });
      }
      const row = map.get(order.date);
      row.creditCard += Number(order.cost || 0);
      if (order.updated_by) row.users.add(order.updated_by);
    }
  });

  return Array.from(map.values()).map((row) => ({
    ...row,
    users: Array.from(row.users),
  }));
});

// Filtered daily summary based on date
const filteredDailySummary = computed(() => {
  let results = dailySummary.value;

  // Filter by date if specified
  if (dailySummaryDateFilter.value) {
    results = results.filter(row => row.date === dailySummaryDateFilter.value);
  }

  // Sort by date descending (most recent first)
  results = [...results].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Limit to last 5 transactions for "All Collections" view when no date filter
  if (!dailySummaryDateFilter.value && !activeDailyMethod.value) {
    return results.slice(0, 5);
  }

  return results;
});

// Calculate totals for each payment method
const dailyMethodTotals = computed(() => {
  const data = dailySummaryDateFilter.value ? filteredDailySummary.value : dailySummary.value;

  return {
    cash: data.reduce((sum, row) => sum + row.cash, 0),
    pos: data.reduce((sum, row) => sum + row.pos, 0),
    transfer: data.reduce((sum, row) => sum + row.transfer, 0),
    creditCard: data.reduce((sum, row) => sum + row.creditCard, 0),
  };
});

// Get individual transactions (for Transactions table)
const allTransactions = computed(() => {
  const transactions = [];

  // Add collection log entries (Cash, POS, Transfer)
  collectionLog.value.forEach((entry) => {
    // Find the customer name from the package
    let customerName = '—';
    if (entry.package_id) {
      // Look for the package in customers' packages
      for (const customer of customers.value) {
        const pkg = customer.packages.find(p => p.packageId === entry.package_id);
        if (pkg) {
          customerName = customer.name;
          break;
        }
      }
    }

    transactions.push({
      date: entry.date,
      userName: customerName,
      amount: entry.amount,
      method: entry.method,
    });
  });

  // Add SGX Orders (Credit Card)
  orders.value.forEach((order) => {
    if (order.method === "Credit Card") {
      transactions.push({
        date: order.date,
        userName: order.customer_name || '—',
        amount: Number(order.cost || 0),
        method: 'Credit Card',
      });
    }
  });

  // Sort by date descending
  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
});

// Filter transactions by time period
const filteredTransactions = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let cutoffDate;

  switch (dailyTimeFilter.value) {
    case 'today':
      cutoffDate = today;
      break;
    case '7days':
      cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      break;
    case '1month':
      cutoffDate = new Date(today);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case '90days':
      cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      break;
    case 'year':
      cutoffDate = new Date(today);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    default:
      cutoffDate = new Date(0); // All time
  }

  return allTransactions.value
    .filter(t => new Date(t.date) >= cutoffDate)
    .slice(0, 5); // Limit to last 5 transactions
});

// Filter credit card orders by time period for breakdown view
const filteredCreditCardOrders = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let cutoffDate;

  switch (dailyTimeFilter.value) {
    case 'today':
      cutoffDate = today;
      break;
    case '7days':
      cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      break;
    case '1month':
      cutoffDate = new Date(today);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case '90days':
      cutoffDate = new Date(today);
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      break;
    case 'year':
      cutoffDate = new Date(today);
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    default:
      cutoffDate = new Date(0); // All time
  }

  return orders.value
    .filter(o => o.method === 'Credit Card' && new Date(o.date) >= cutoffDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});

const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const latestNote = (pkg) => (pkg.notes?.length ? pkg.notes[pkg.notes.length - 1] : "—");

// Helper function to display readable role names
const getRoleDisplayName = (roleId) => {
  const roleNames = {
    'full_control': 'Full Control',
    'editor': 'Editor',
    'view_only': 'View Only'
  };
  return roleNames[roleId] || roleId;
};

const computeLateFee = (pkg) => {
  if (!pkg || pkg.collected) return 0;
  const readyStatuses = ["Ready for Pickup", "Processing in Office", "Processing at Customs", "In Transit"];
  if (!readyStatuses.includes(pkg.status)) return 0;
  const updated = new Date(pkg.dateUpdated);
  if (isNaN(updated)) return 0;
  const today = new Date();
  const diffDays = Math.floor((today - updated) / (1000 * 60 * 60 * 24));
  const lateDays = Math.min(30, Math.max(0, diffDays - 7));
  return Math.min(1500, lateDays * 50);
};

const getBaseTotal = (packageIds) =>
  packageIds
    .map((id) => findPackage(id))
    .filter(Boolean)
    .reduce((sum, pkg) => sum + Number(pkg.cost || 0), 0);

const setActiveCustomer = (customer) => {
  activeCustomerId.value = customer?.id ?? null;
  searchQuery.value = customer ? customer.name : "";
  showAutocomplete.value = false;
};

const selectFirstMatch = () => {
  const match = filteredCustomers.value[0];
  if (match) setActiveCustomer(match);
};

const toggleView = () => {
  showAll.value = !showAll.value;
};

const openCollection = (packageIds) => {
  if (!packageIds.length) return;
  selectedPackageIds.value = packageIds;
  selectedPackages.value = packageIds;
  const baseLateFee = packageIds
    .map((id) => findPackage(id))
    .filter(Boolean)
    .reduce((sum, pkg) => sum + computeLateFee(pkg), 0);
  collectionForm.lateFee = baseLateFee;
  collectionForm.amount = String(getBaseTotal(packageIds) + baseLateFee);
  modals.collection = true;
};

const openBulkCollection = () => {
  if (!activeCustomer.value) return;
  const ids = visiblePackages.value.map((p) => p.packageId);
  openCollection(ids);
};

const openAddPackage = () => {
  addForm.customerId = activeCustomer.value?.id || "";
  addForm.packageId = "";
  addForm.trackingNumber = "";
  addForm.status = "Ready for Pickup";
  addForm.weight = "";
  addForm.description = "";
  addForm.cost = "";
  addForm.freightType = "Air";
  addForm.note = "";
  modals.add = true;
};

const findPackage = (packageId) => {
  for (const customer of customers.value) {
    const pkg = customer.packages.find((p) => p.packageId === packageId);
    if (pkg) return pkg;
  }
  return null;
};

const confirmCollection = () => {
  if (!currentUser.value) return;
  const today = new Date().toISOString().split("T")[0];
  const lateFeeValue = Math.min(1500, Math.max(0, Number(collectionForm.lateFee || 0)));
  selectedPackages.value.forEach((id) => {
    const pkg = findPackage(id);
    if (!pkg) return;
    pkg.collected = true;
    pkg.status = "Pickup";
    pkg.paymentMethod = collectionForm.method;
    pkg.updatedBy = currentUser.value.name;
    pkg.amountPaid = Number(collectionForm.amount || 0);
    const totalDue = Number(pkg.cost || 0) + lateFeeValue;
    if (pkg.amountPaid >= totalDue) {
      pkg.billingStatus = "Closed";
    } else if (pkg.amountPaid > 0 && pkg.amountPaid < totalDue) {
      pkg.billingStatus = "Partial";
    } else {
      pkg.billingStatus = "Open";
    }
    const note = collectionForm.note?.trim();
    if (note) {
      pkg.notes = pkg.notes || [];
      pkg.notes.push(note);
    }
    collectionLog.value.push({
      date: today,
      method: collectionForm.method,
      amount: Number(collectionForm.amount || 0),
      user: currentUser.value.name,
    });
  });
  collectedToday.value += selectedPackages.value.length;
  // send to backend
  const payload = {
    packageId: selectedPackages.value[0],
    amountPaid: Number(collectionForm.amount || 0),
    paymentMethod: collectionForm.method,
  };
  fetch('/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => console.error('Collect sync failed', err));
  closeModal("collection");
};

const openEdit = (pkg) => {
  editForm.packageId = pkg.packageId;
  editForm.trackingNumber = pkg.trackingNumber;
  editForm.weight = pkg.weight;
  editForm.description = pkg.description;
  editForm.cost = pkg.cost;
  editForm.note = "";
  modals.edit = true;
};

const confirmEdit = () => {
  const pkg = findPackage(editForm.packageId);
  if (!pkg) return;
  pkg.trackingNumber = editForm.trackingNumber;
  pkg.weight = Number(editForm.weight);
  pkg.description = editForm.description;
  pkg.cost = Number(editForm.cost);
  if (editForm.note.trim()) {
    pkg.notes = pkg.notes || [];
    pkg.notes.push(editForm.note.trim());
  }
  pkg.updatedBy = currentUser.value?.name || pkg.updatedBy;
  closeModal("edit");
};

const openDelete = (pkg) => {
  deleteForm.packageId = pkg.packageId;
  deleteForm.note = "";
  modals.delete = true;
};

const confirmDelete = () => {
  const pkg = findPackage(deleteForm.packageId);
  if (!pkg) return;
  pkg.deleted = true;
  pkg.notes = pkg.notes || [];
  pkg.notes.push(`Deleted: ${deleteForm.note.trim()}`);
  pkg.updatedBy = currentUser.value?.name || pkg.updatedBy;
  closeModal("delete");
};

const refreshData = () => {
  searchQuery.value = "";
  activeCustomerId.value = null;
  showAutocomplete.value = false;
};

// ==================== BILLING CONSOLE FUNCTIONS ====================
const loadBillingItems = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/billing/all');
    const data = await response.json();
    if (data.success) {
      billingItems.value = data.items;
    }
  } catch (error) {
    console.error('Error loading billing items:', error);
  }
};

const loadBillingStats = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/billing/stats');
    const data = await response.json();
    if (data.success) {
      billingStats.unbilled = data.stats.unbilled;
      billingStats.open = data.stats.open;
      billingStats.closedToday = data.stats.closedToday;
      billingStats.amountCollectedToday = data.stats.amountCollectedToday;
    }
  } catch (error) {
    console.error('Error loading billing stats:', error);
  }
};

const calculateItemCost = (item) => {
  if (!item) return 0;
  return (item.package_cost || 0) + (item.custom_fee || 0) + (item.processing_fee || 0) + (item.late_fee || 0);
};

const calculateLateFee = (item) => {
  if (!item || !item.bill_date || item.billing_status !== 'Open') return { fee: 0, days: 0 };
  const billDate = new Date(item.bill_date);
  const now = new Date();
  const daysDiff = Math.floor((now - billDate) / (1000 * 60 * 60 * 24));
  const lateFee = daysDiff > 7 ? (daysDiff - 7) * 50 : 0;
  return { fee: lateFee, days: daysDiff > 7 ? daysDiff - 7 : 0 };
};

const getBLStatusClass = (status) => {
  switch (status) {
    case 'unbilled': return 'bl-unbilled';
    case 'Open': return 'bl-open';
    case 'Partial': return 'bl-partial';
    case 'Closed': return 'bl-closed';
    default: return 'bl-unbilled';
  }
};

const toggleBLStatusDropdown = (id) => {
  if (openBLStatusDropdownId.value === id) {
    openBLStatusDropdownId.value = null;
  } else {
    openBLStatusDropdownId.value = id;
    openBillingKebabId.value = null;
  }
};

const toggleBillingKebab = (id) => {
  if (openBillingKebabId.value === id) {
    openBillingKebabId.value = null;
  } else {
    openBillingKebabId.value = id;
    openBLStatusDropdownId.value = null;
  }
};

const closeBillingKebab = () => {
  openBillingKebabId.value = null;
};

const updateBillingStatus = async (item, status) => {
  try {
    const response = await fetch(`http://localhost:4000/api/billing/status/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updatedBy: currentUser.value?.name || 'System' })
    });
    const data = await response.json();
    if (data.success) {
      item.billing_status = status;
      openBLStatusDropdownId.value = null;
      await loadBillingStats();
    }
  } catch (error) {
    console.error('Error updating billing status:', error);
  }
};

const openBillModal = (item) => {
  billForm.id = item.id;
  billForm.packageId = item.package_id || item.id;
  billForm.customerName = item.customer_name;
  billForm.trackingNumber = item.tracking_number;
  billForm.packageCost = 0;
  billForm.customFee = 0;
  billForm.processingFee = 0;
  billingModals.bill = true;
};

const confirmBill = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/billing/bill/${billForm.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageCost: billForm.packageCost,
        customFee: billForm.customFee,
        processingFee: billForm.processingFee,
        billedBy: currentUser.value?.name || 'System'
      })
    });
    const data = await response.json();
    if (data.success) {
      billingModals.bill = false;
      await loadBillingItems();
      await loadBillingStats();
    }
  } catch (error) {
    console.error('Error billing item:', error);
  }
};

const openCollectModal = (item) => {
  const lateInfo = calculateLateFee(item);
  const baseCost = (item.package_cost || 0) + (item.custom_fee || 0) + (item.processing_fee || 0);
  const totalWithLate = baseCost + lateInfo.fee;
  const previouslyPaid = item.amount_paid || 0;

  collectForm.id = item.id;
  collectForm.packageId = item.package_id || item.id;
  collectForm.customerName = item.customer_name;
  collectForm.packageCost = item.package_cost || 0;
  collectForm.customFee = item.custom_fee || 0;
  collectForm.processingFee = item.processing_fee || 0;
  collectForm.lateFee = lateInfo.fee;
  collectForm.lateDays = lateInfo.days;
  collectForm.totalDue = totalWithLate;
  collectForm.amountPreviouslyPaid = previouslyPaid;
  collectForm.balance = totalWithLate - previouslyPaid;
  collectForm.paymentMethod = '';
  collectForm.amountPaid = collectForm.balance;
  collectForm.notes = '';
  billingModals.collect = true;
};

const confirmCollect = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/billing/collect/${collectForm.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: collectForm.paymentMethod,
        amountPaid: collectForm.amountPaid,
        lateFee: collectForm.lateFee,
        notes: collectForm.notes,
        collectedBy: currentUser.value?.name || 'System'
      })
    });
    const data = await response.json();
    if (data.success) {
      billingModals.collect = false;
      await loadBillingItems();
      await loadBillingStats();
    }
  } catch (error) {
    console.error('Error collecting payment:', error);
  }
};

const openBillingViewModal = (item) => {
  billingViewItem.value = item;
  billingModals.view = true;
};

const openBillingEditModal = (item) => {
  billingEditForm.id = item.id;
  billingEditForm.packageId = item.package_id || item.id;
  billingEditForm.customerName = item.customer_name;
  billingEditForm.altName = item.alt_name || '';
  billingEditForm.weight = item.weight || 0;
  billingEditForm.packageCost = item.package_cost || 0;
  billingEditForm.customFee = item.custom_fee || 0;
  billingEditForm.processingFee = item.processing_fee || 0;
  billingEditForm.lateFee = item.late_fee || 0;
  billingEditForm.paymentMethod = item.payment_method || '';
  billingEditForm.billingNotes = item.billing_notes || '';
  billingModals.edit = true;
};

const confirmBillingEdit = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/billing/edit/${billingEditForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: billingEditForm.customerName,
        altName: billingEditForm.altName,
        weight: billingEditForm.weight,
        customFee: billingEditForm.customFee,
        processingFee: billingEditForm.processingFee,
        packageCost: billingEditForm.packageCost,
        lateFee: billingEditForm.lateFee,
        paymentMethod: billingEditForm.paymentMethod,
        billingNotes: billingEditForm.billingNotes,
        updatedBy: currentUser.value?.name || 'System'
      })
    });
    const data = await response.json();
    if (data.success) {
      billingModals.edit = false;
      await loadBillingItems();
      await loadBillingStats();
    }
  } catch (error) {
    console.error('Error editing billing item:', error);
  }
};

const openBillingDeleteModal = (item) => {
  billingDeleteItem.value = item;
  billingModals.delete = true;
};

const confirmBillingDelete = async () => {
  if (!billingDeleteItem.value) return;
  try {
    const response = await fetch(`http://localhost:4000/api/shipment-items/${billingDeleteItem.value.id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      billingModals.delete = false;
      billingDeleteItem.value = null;
      await loadBillingItems();
      await loadBillingStats();
    }
  } catch (error) {
    console.error('Error deleting billing item:', error);
  }
};

// Close dropdowns when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.bl-status-dropdown') && !event.target.closest('.kebab-menu-container')) {
    openBLStatusDropdownId.value = null;
    openBillingKebabId.value = null;
  }
};

const openView = (pkg) => {
  viewPackage.value = pkg;
  modals.view = true;
};

const confirmAddPackage = () => {
  if (!currentUser.value) return;
  const customer = customers.value.find((c) => c.id === addForm.customerId);
  if (!customer) return;
  const today = new Date().toISOString().split("T")[0];
  const newPkg = {
    packageId: addForm.packageId || `PKG-${Math.floor(Math.random() * 9000 + 1000)}`,
    trackingNumber: addForm.trackingNumber || "TBD",
    status: addForm.status,
    weight: Number(addForm.weight) || 0,
    dateUpdated: today,
    description: addForm.description,
    cost: Number(addForm.cost) || 0,
    paymentMethod: "",
    updatedBy: currentUser.value.name,
    billingStatus: "Open",
    amountPaid: 0,
    freightType: addForm.freightType,
    notes: [],
    collected: false,
    deleted: false,
  };
  if (addForm.note.trim()) {
    newPkg.notes.push(addForm.note.trim());
  }
  customer.packages.push(newPkg);
  if (!activeCustomer.value) {
    activeCustomerId.value = customer.id;
  }
  closeModal("add");
};

const closeModal = (modal) => {
  modals[modal] = false;
  if (modal === "collection") {
    collectionForm.amount = "";
    collectionForm.method = "Cash";
    collectionForm.note = "";
    collectionForm.lateFee = 0;
    selectedPackages.value = [];
    selectedPackageIds.value = [];
  }
  if (modal === "edit") {
    editForm.packageId = null;
    editForm.trackingNumber = "";
    editForm.weight = 0;
    editForm.description = "";
    editForm.cost = 0;
    editForm.note = "";
  }
  if (modal === "delete") {
    deleteForm.packageId = null;
    deleteForm.note = "";
  }
  if (modal === "add") {
    addForm.customerId = "";
    addForm.packageId = "";
    addForm.trackingNumber = "";
    addForm.status = "Ready for Pickup";
    addForm.weight = "";
    addForm.description = "";
    addForm.cost = "";
    addForm.freightType = "Air";
    addForm.note = "";
  }
};

const toggleOrderSelection = (id) => {
  if (selectedOrderIds.value.includes(id)) {
    selectedOrderIds.value = selectedOrderIds.value.filter((oid) => oid !== id);
  } else {
    selectedOrderIds.value.push(id);
  }
};

const toggleAllOrders = () => {
  const ids = filteredOrders.value.map((o) => o.id);
  const allSelected = ids.every((id) => selectedOrderIds.value.includes(id));
  selectedOrderIds.value = allSelected ? [] : ids;
};

const togglePackageSelection = (id) => {
  if (selectedPackageIds.value.includes(id)) {
    selectedPackageIds.value = selectedPackageIds.value.filter((pid) => pid !== id);
  } else {
    selectedPackageIds.value.push(id);
  }
};

const toggleAllPackages = () => {
  const ids = visiblePackages.value.map((p) => p.packageId);
  const allSelected = ids.length && ids.every((id) => selectedPackageIds.value.includes(id));
  selectedPackageIds.value = allSelected ? [] : ids;
};

const bulkOrderReceive = () => {
  if (!currentUser.value) return;
  orders.value.forEach((o) => {
    if (selectedOrderIds.value.includes(o.id)) {
      o.status = "Received";
      o.updatedBy = currentUser.value.name;
      o.date = new Date().toISOString().split("T")[0];
    }
  });
  selectedOrderIds.value = [];
};

const openOrderAdd = () => {
  const today = new Date().toISOString().split("T")[0];
  orderAddForm.id = "";
  orderAddForm.date = today;
  orderAddForm.customerName = "";
  orderAddForm.description = "";
  orderAddForm.cost = "";
  orderAddForm.status = "Ordered";
  orderAddForm.merchant = "";
  orderAddForm.method = "Credit Card";
  orderModals.add = true;
};

const confirmOrderAdd = () => {
  if (!currentUser.value) return;
  const newOrder = {
    id: `ORD-${Date.now()}`,
    date: orderAddForm.date,
    customerName: orderAddForm.customerName,
    description: orderAddForm.description,
    cost: Number(orderAddForm.cost) || 0,
    status: orderAddForm.status,
    merchant: orderAddForm.merchant,
    method: orderAddForm.method,
    updatedBy: currentUser.value.name,
  };
  orders.value.push(newOrder);
  orderModals.add = false;
};

const openOrderEdit = (order) => {
  orderEditForm.id = order.id;
  orderEditForm.date = order.date;
  orderEditForm.customerName = order.customerName;
  orderEditForm.description = order.description;
  orderEditForm.cost = order.cost;
  orderEditForm.status = order.status;
  orderEditForm.merchant = order.merchant;
  orderEditForm.method = order.method;
  orderModals.edit = true;
};

const confirmOrderEdit = () => {
  if (!currentUser.value) return;
  const order = orders.value.find((o) => o.id === orderEditForm.id);
  if (order) {
    order.date = orderEditForm.date;
    order.customerName = orderEditForm.customerName;
    order.description = orderEditForm.description;
    order.cost = Number(orderEditForm.cost) || 0;
    order.status = orderEditForm.status;
    order.merchant = orderEditForm.merchant;
    order.method = orderEditForm.method;
    order.updatedBy = currentUser.value.name;
  }
  orderModals.edit = false;
};

const markOrderReceived = (order) => {
  if (!currentUser.value) return;
  order.status = "Received";
  order.updatedBy = currentUser.value.name;
  order.date = new Date().toISOString().split("T")[0];
};

const openOrderDelete = (orderId) => {
  orderDeleteId.value = orderId;
  orderModals.delete = true;
};

const confirmOrderDelete = () => {
  if (!currentUser.value) return;
  if (orderDeleteId.value) {
    // Single delete
    const index = orders.value.findIndex((o) => o.id === orderDeleteId.value);
    if (index !== -1) {
      orders.value.splice(index, 1);
    }
  } else {
    // Bulk delete
    orders.value = orders.value.filter((o) => !selectedOrderIds.value.includes(o.id));
    selectedOrderIds.value = [];
  }
  orderModals.delete = false;
  orderDeleteId.value = "";
};

const testApi = (runTest) => {
  apiStatus.value = runTest ? "Sending test call (mock)" : "Saved";
  setTimeout(() => {
    apiStatus.value = runTest ? "Test call queued" : "Not connected";
  }, 800);
  profileMenuOpen.value = false;
};

const handleClickAway = (event) => {
  if (searchBox.value && !searchBox.value.contains(event.target)) {
    showAutocomplete.value = false;
  }
  if (!event.target.closest('.profile-chip') && !event.target.closest('.profile-menu')) {
    profileMenuOpen.value = false;
  }
};

const applyApiUpdate = () => {
  const pkg = findPackage(apiUpdateForm.packageId.trim());
  if (!pkg) {
    apiMessage.value = "Package not found";
    return;
  }
  if (apiUpdateForm.cost !== "" && !Number.isNaN(Number(apiUpdateForm.cost))) {
    pkg.cost = Number(apiUpdateForm.cost);
  }
  if (apiUpdateForm.method) pkg.paymentMethod = apiUpdateForm.method;
  pkg.status = apiUpdateForm.status;
  pkg.billingStatus = apiUpdateForm.billingStatus;
  pkg.freightType = apiUpdateForm.freightType;
  pkg.updatedBy = currentUser.value?.name || "API";
  if (apiUpdateForm.note.trim()) {
    pkg.notes = pkg.notes || [];
    pkg.notes.push(apiUpdateForm.note.trim());
  }
  apiMessage.value = "Applied to local package";
};

const resetApiUpdate = () => {
  Object.assign(apiUpdateForm, {
    packageId: "",
    status: "Ready for Pickup",
    billingStatus: "Open",
    cost: "",
    method: "",
    freightType: "Air",
    note: "",
  });
  apiMessage.value = "";
};

// Courier Depot API Functions (via backend proxy)
const courierDepotSignin = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/courier-depot/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Authentication failed: ${response.status}`);
    }

    const result = await response.json();
    courierDepotApi.accessToken = result.data.accessToken;
    courierDepotApi.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // Token valid for 24 hours
    courierDepotApi.isAuthenticated = true;

    return true;
  } catch (error) {
    console.error('Courier Depot signin error:', error);
    apiSyncStatus.value = `Authentication failed: ${error.message}`;
    courierDepotApi.isAuthenticated = false;
    return false;
  }
};

const syncPackagesFromCourierDepot = async () => {
  if (isSyncing.value) return;

  isSyncing.value = true;
  apiSyncStatus.value = "Syncing packages...";

  try {
    // Check if token exists and is valid
    if (!courierDepotApi.accessToken || Date.now() > courierDepotApi.tokenExpiry) {
      apiSyncStatus.value = "Authenticating...";
      const authenticated = await courierDepotSignin();
      if (!authenticated) {
        throw new Error('Authentication failed');
      }
    }

    // Fetch packages via backend proxy
    apiSyncStatus.value = "Fetching packages from Courier Depot...";
    const response = await fetch('http://localhost:4000/api/courier-depot/sync-packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: courierDepotApi.accessToken,
        syncedBy: currentUser.value?.name || 'System',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch packages: ${response.status}`);
    }

    const result = await response.json();
    const apiPackages = result.packages?.packlist || result.packages;

    if (!Array.isArray(apiPackages)) {
      throw new Error('Invalid response format - expected array of packages');
    }

    // Sort packages by date/ID to get most recent first
    const sortedPackages = [...apiPackages].sort((a, b) => {
      // Try to sort by date fields first (newest first)
      const dateA = a.created_at || a.createdAt || a.warehouse_date || a.warehouseDate;
      const dateB = b.created_at || b.createdAt || b.warehouse_date || b.warehouseDate;

      if (dateA && dateB) {
        return new Date(dateB) - new Date(dateA); // Descending (newest first)
      }

      // Fallback to ID (assuming higher ID = newer package)
      return (b.id || 0) - (a.id || 0);
    });

    // Take the most recent 50 packages
    const recentPackages = sortedPackages.slice(0, 50);

    // Log package IDs for verification
    console.log(`Fetching ${recentPackages.length} most recent packages:`);
    console.log(`Package IDs: ${recentPackages.slice(0, 10).map(p => p.id).join(', ')}${recentPackages.length > 10 ? '...' : ''}`);

    apiSyncStatus.value = `Processing ${recentPackages.length} packages...`;

    // Map API packages to local package format
    let imported = 0;
    let updated = 0;

    // Keep track of created customers to avoid duplicates
    const createdCustomers = new Set();

    // Process packages sequentially to persist to database
    for (const apiPkg of recentPackages) {
      try {
        // Ensure customer exists in database before creating package
        const customerName = apiPkg.userId?.name || 'Unknown Customer';
        const customerId = customerName.replace(/\s+/g, '-').toUpperCase();

        if (!createdCustomers.has(customerId)) {
          // Check if customer exists, create if not
          const customerExists = await fetch(`http://localhost:4000/api/customers`)
            .then(r => r.json())
            .then(data => data.customers?.some(c => c.id === customerId))
            .catch(() => false);

          if (!customerExists) {
            // Create new customer
            await fetch('http://localhost:4000/api/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: customerId,
                name: customerName,
                email: `${customerId.toLowerCase()}@customer.com`,
                phone: '',
                address: '',
              }),
            }).catch(err => console.error(`Failed to create customer ${customerId}:`, err));
          }
          createdCustomers.add(customerId);
        }

        // Check if package already exists in database
        const existingPkg = await fetch(`http://localhost:4000/api/packages/${apiPkg.trackingNumber || apiPkg.id}`).then(r => r.ok ? r.json() : null).catch(() => null);

        const mappedPackage = {
          packageId: String(apiPkg.id),
          externalPackageId: String(apiPkg.id),
          customerId: customerId,
          trackingNumber: apiPkg.trackingNumber || '', // Actual tracking number
          weight: apiPkg.weight || 0,
          description: apiPkg.description || '',
          cost: apiPkg.value || apiPkg.cost || 0,
          status: apiPkg.status || 'Processing in Office',
          billingStatus: apiPkg.paid ? 'Closed' : 'Open',
          paymentMethod: apiPkg.packageMethod || 'Cash',
          freightType: apiPkg.type || 'AIR',
          dateUpdated: new Date().toISOString().split('T')[0],
          updatedBy: 'Courier Depot API',
          collected: apiPkg.packageRecieved || false,
          archived: false, // Don't auto-archive synced packages
          // New Courier Depot fields
          altName: apiPkg.altName || '',
          reason: apiPkg.reason || '',
          seller: apiPkg.seller || '',
          length: apiPkg.length || 0,
          width: apiPkg.width || 0,
          height: apiPkg.height || 0,
          cubicFeet: apiPkg.cubicFeet || 0,
          location: apiPkg.location || '',
          invoiceUrl: apiPkg.invoceUrl || '', // Note: API has typo "invoceUrl"
          packageImageUrl: apiPkg.packageImg || '',
          preAlert: apiPkg.preAlert || false,
          emailSent: apiPkg.emailSent || false,
          paid: apiPkg.paid || false,
          warehouseDate: apiPkg.warehousedate || null,
        };

        if (existingPkg) {
          // Update existing package in database
          await fetch(`http://localhost:4000/api/packages/${mappedPackage.packageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mappedPackage),
          });
          updated++;
        } else {
          // Create new package in database
          await fetch('http://localhost:4000/api/packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mappedPackage),
          });
          imported++;
        }

        apiSyncStatus.value = `Processing... ${imported + updated}/${recentPackages.length}`;
      } catch (pkgError) {
        console.error(`Error processing package ${apiPkg.id}:`, pkgError);
      }
    }

    apiSyncStatus.value = `Sync complete! Imported ${imported} new packages, updated ${updated} existing packages. Reloading...`;

    // Reload packages from backend to update the UI
    await loadPackagesFromBackend();

    apiSyncStatus.value = `Sync complete! Imported ${imported} new packages, updated ${updated} existing packages.`;
    setTimeout(() => { apiSyncStatus.value = ""; }, 5000);

  } catch (error) {
    console.error('Sync error:', error);
    apiSyncStatus.value = `Sync failed: ${error.message}`;
    setTimeout(() => { apiSyncStatus.value = ""; }, 5000);
  } finally {
    isSyncing.value = false;
  }
};

// API Sync function for Packages page
const apiSyncPackages = async () => {
  if (isSyncing.value) return;

  try {
    // Call the main sync function
    await syncPackagesFromCourierDepot();

    // Update last sync time and details for Packages page
    const now = new Date();
    lastSyncTime.value = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Extract sync results from apiSyncStatus
    const statusMatch = apiSyncStatus.value.match(/Imported (\d+) new packages, updated (\d+) existing packages/);
    if (statusMatch) {
      const imported = parseInt(statusMatch[1]);
      const updated = parseInt(statusMatch[2]);
      lastSyncDetails.value = `Pulled: ${imported} added, ${updated} updated`;
    } else {
      lastSyncDetails.value = 'Sync completed successfully';
    }

  } catch (error) {
    console.error('Packages sync error:', error);
    lastSyncDetails.value = `Sync failed: ${error.message}`;
  }
};

const login = () => {
  // Find employee by username (name) or email
  const employee = employees.find(
    (e) =>
      e.name.toLowerCase() === loginForm.username.toLowerCase() ||
      e.email.toLowerCase() === loginForm.username.toLowerCase()
  );

  if (!employee || employee.password !== loginForm.password) {
    loginError.value = "Invalid username or password. Please try again.";
    return;
  }

  // Save credentials to localStorage if "Remember Me" is checked
  if (loginForm.rememberMe) {
    localStorage.setItem('sgx_remember_me', JSON.stringify({
      username: loginForm.username,
      password: loginForm.password,
      rememberMe: true
    }));
  } else {
    // Clear saved credentials if not remembering
    localStorage.removeItem('sgx_remember_me');
  }

  currentUser.value = { ...employee };
  profileForm.email = employee.email;
  profileForm.photo = employee.photo;
  profileForm.password = employee.password;
  currentPage.value = allowedPages.value.includes("dashboard") ? "dashboard" : allowedPages.value[0];
  loginError.value = "";
};

const signOut = () => {
  currentUser.value = null;
  currentPage.value = "login";
};

const goTo = (page) => {
  if (allowedPages.value.includes(page)) {
    currentPage.value = page;
    // Load shipment logs when navigating to shipment-bin
    if (page === 'shipment-bin') {
      loadShipmentLogs();
    }
  } else {
    currentPage.value = allowedPages.value[0];
  }
};

const saveProfile = () => {
  if (!currentUser.value) return;
  const idx = employees.findIndex((e) => e.id === currentUser.value.id);
  if (idx !== -1) {
    employees[idx].email = profileForm.email;
    employees[idx].photo = profileForm.photo;
    if (profileForm.password) {
      employees[idx].password = profileForm.password;
    }
    currentUser.value = { ...employees[idx] };
  }
};

const updateUserRole = (userId, role) => {
  const user = employees.find((e) => e.id === userId);
  if (user) {
    user.role = role;
    // Clear custom permissions when switching to predefined role
    if (role !== 'custom') {
      user.customPermissions = null;
    }
    if (currentUser.value?.id === userId) {
      currentUser.value.role = role;
      currentUser.value.customPermissions = user.customPermissions;
    }
  }
};

const openUserAdd = () => {
  userForm.name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "view_only";
  userModals.add = true;
};

const confirmUserAdd = () => {
  const newId = `emp-${Date.now()}`;
  const newUser = {
    id: newId,
    name: userForm.name,
    email: userForm.email,
    password: userForm.password,
    photo: "",
    location: "",
    role: userForm.role,
    customPermissions: null,
  };
  employees.push(newUser);
  userModals.add = false;
  userForm.name = "";
  userForm.email = "";
  userForm.password = "";
  userForm.role = "view_only";
};

const confirmUserEdit = () => {
  const user = employees.find((e) => e.id === userEditForm.id);
  if (user) {
    user.name = userEditForm.name;
    user.email = userEditForm.email;
    if (userEditForm.password) {
      user.password = userEditForm.password;
    }
    user.role = userEditForm.role;
    // Clear custom permissions when switching to predefined role
    if (userEditForm.role !== 'custom') {
      user.customPermissions = null;
    }
    if (currentUser.value?.id === userEditForm.id) {
      currentUser.value.name = user.name;
      currentUser.value.email = user.email;
      currentUser.value.role = user.role;
      currentUser.value.customPermissions = user.customPermissions;
    }
  }
  userModals.edit = false;
};

const confirmUserDelete = () => {
  if (!userDeleteTarget.value) return;
  const index = employees.findIndex((e) => e.id === userDeleteTarget.value.id);
  if (index !== -1) {
    employees.splice(index, 1);
  }
  userModals.delete = false;
  userDeleteTarget.value = null;
};

const openPermissions = (user) => {
  permissionTarget.value = user;
  // Load current permissions
  if (user.customPermissions) {
    Object.assign(customPermissions, user.customPermissions);
  } else if (user.role !== 'custom') {
    // Load role-based permissions as default
    Object.assign(customPermissions, rolePermissions[user.role] || rolePermissions.view_only);
  }
  userModals.permissions = true;
};

const saveCustomPermissions = () => {
  if (!permissionTarget.value) return;
  const user = employees.find((e) => e.id === permissionTarget.value.id);
  if (user) {
    // Save custom permissions
    user.customPermissions = { ...customPermissions };
    // Set role to custom if not already
    if (user.role !== 'custom') {
      user.role = 'custom';
    }
    // Update current user if it's them
    if (currentUser.value?.id === user.id) {
      currentUser.value.role = 'custom';
      currentUser.value.customPermissions = user.customPermissions;
    }
  }
  userModals.permissions = false;
  permissionTarget.value = null;
};

// ==================== SHIPMENT BIN FUNCTIONS ====================

// Load all shipment logs
const loadShipmentLogs = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/shipment-logs');
    const data = await response.json();
    if (data.success) {
      shipmentLogs.value = data.logs;
    }
  } catch (error) {
    console.error('Failed to load shipment logs:', error);
  }
};

// Select a shipment log from the card view
const selectShipmentLog = (logId) => {
  activeShipmentLogId.value = logId;
  loadShipmentItems();
};

// Load items for selected shipment log
const loadShipmentItems = async () => {
  if (!activeShipmentLogId.value) {
    shipmentItems.value = [];
    notFoundScans.value = [];
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/api/shipment-logs/${activeShipmentLogId.value}`);
    const data = await response.json();
    if (data.success) {
      shipmentItems.value = data.items;
      notFoundScans.value = data.notFoundScans || [];
      notFoundCount.value = data.notFoundCount || 0;
      // Auto-focus scan input
      nextTick(() => {
        if (scanInput.value) {
          scanInput.value.focus();
        }
      });
    }
  } catch (error) {
    console.error('Failed to load shipment items:', error);
  }
};

// Open upload modal
const openShipmentUpload = () => {
  shipmentUploadForm.shipmentDate = new Date().toISOString().split('T')[0];
  shipmentUploadForm.cargoType = 'Air Cargo';
  shipmentUploadForm.file = null;
  shipmentModals.upload = true;
};

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  shipmentUploadForm.file = file;
};

// Confirm shipment upload
const confirmShipmentUpload = async () => {
  if (!shipmentUploadForm.file) return;

  const formData = new FormData();
  formData.append('file', shipmentUploadForm.file);
  formData.append('shipmentDate', shipmentUploadForm.shipmentDate);
  formData.append('cargoType', shipmentUploadForm.cargoType);
  formData.append('uploadedBy', currentUser.value?.name || 'System');

  try {
    const response = await fetch('http://localhost:4000/api/shipment-logs/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.upload = false;
      // Reload shipment logs
      await loadShipmentLogs();
      // Auto-select the new log
      activeShipmentLogId.value = data.shipmentLogId.toString();
      await loadShipmentItems();

      // Show success message
      scanMessage.value = `Successfully uploaded ${data.itemsProcessed} packages`;
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 5000);
    }
  } catch (error) {
    console.error('Failed to upload shipment log:', error);
    scanMessage.value = 'Failed to upload shipment log';
    scanStatus.value = 'error';
  }
};

// Scan package
const scanPackage = async () => {
  if (!scanTrackingNumber.value.trim() || !activeShipmentLogId.value) return;

  const tracking = scanTrackingNumber.value.trim();

  try {
    const response = await fetch('http://localhost:4000/api/shipment-logs/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingNumber: tracking,
        currentLogId: activeShipmentLogId.value,
        scannedBy: currentUser.value?.name || 'System',
      }),
    });

    const data = await response.json();

    if (data.status === 'not_found') {
      // Not found in any log
      scanMessage.value = 'Tracking number not found in any shipment log';
      scanStatus.value = 'error';
      notFoundCount.value += 1;
    } else if (data.status === 'received') {
      // Found and marked as received
      scanMessage.value = `Package received: ${data.item.customer_name}`;
      scanStatus.value = 'info';
      // Reload items to show updated status
      await loadShipmentItems();
    } else if (data.status === 'found_in_other_log') {
      // Found in another log - ask to move
      movePackageData.item = data.item;
      movePackageData.log = data.log;
      shipmentModals.moveConfirm = true;
    }

    // Clear input and auto-focus
    scanTrackingNumber.value = '';
    nextTick(() => {
      if (scanInput.value) {
        scanInput.value.focus();
      }
    });

    // Clear message after 3 seconds
    setTimeout(() => {
      scanMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('Failed to scan package:', error);
    scanMessage.value = 'Scan failed';
    scanStatus.value = 'error';
  }
};

// Confirm moving package to current log
const confirmMovePackage = async () => {
  if (!movePackageData.item || !activeShipmentLogId.value) return;

  try {
    const response = await fetch('http://localhost:4000/api/shipment-logs/move-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: movePackageData.item.id,
        newLogId: activeShipmentLogId.value,
      }),
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.moveConfirm = false;
      scanMessage.value = `Package moved to current log`;
      scanStatus.value = 'info';
      // Reload items
      await loadShipmentItems();

      // Now scan it to mark as received
      await fetch('http://localhost:4000/api/shipment-logs/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: movePackageData.item.tracking_number,
          currentLogId: activeShipmentLogId.value,
          scannedBy: currentUser.value?.name || 'System',
        }),
      });

      await loadShipmentItems();

      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to move package:', error);
    scanMessage.value = 'Failed to move package';
    scanStatus.value = 'error';
  }
};

// Sort shipment table
const sortShipmentTable = (column) => {
  if (shipmentSortColumn.value === column) {
    // Toggle direction if same column
    shipmentSortDirection.value = shipmentSortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to ascending
    shipmentSortColumn.value = column;
    shipmentSortDirection.value = 'asc';
  }
};

// Open edit shipment log modal
const openShipmentEdit = (log) => {
  shipmentEditForm.id = log.id;
  shipmentEditForm.logName = log.log_name;
  shipmentEditForm.shipmentDate = log.shipment_date;
  shipmentModals.edit = true;
};

// Confirm shipment log edit
const confirmShipmentEdit = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/shipment-logs/${shipmentEditForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logName: shipmentEditForm.logName,
        shipmentDate: shipmentEditForm.shipmentDate,
      }),
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.edit = false;
      await loadShipmentLogs();
      scanMessage.value = 'Shipment log updated successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to update shipment log:', error);
    scanMessage.value = 'Failed to update shipment log';
    scanStatus.value = 'error';
  }
};

// Open delete shipment log modal
const openShipmentDelete = (log) => {
  shipmentDeleteTarget.value = log;
  shipmentModals.delete = true;
};

// Confirm shipment log delete
const confirmShipmentDelete = async () => {
  if (!shipmentDeleteTarget.value) return;

  try {
    const response = await fetch(`http://localhost:4000/api/shipment-logs/${shipmentDeleteTarget.value.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.delete = false;

      // If the deleted log was the active one, clear it
      if (activeShipmentLogId.value === shipmentDeleteTarget.value.id.toString()) {
        activeShipmentLogId.value = '';
        shipmentItems.value = [];
      }

      await loadShipmentLogs();
      scanMessage.value = 'Shipment log deleted successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to delete shipment log:', error);
    scanMessage.value = 'Failed to delete shipment log';
    scanStatus.value = 'error';
  }
};

// Get item count for a log
const getLogItemCount = (logId) => {
  // This will be calculated from backend data when logs are loaded
  // For now, return 0 as a placeholder - we'll add this to the log data
  const log = shipmentLogs.value.find(l => l.id === logId);
  return log?.itemCount || 0;
};

// Open edit item modal
const openItemEdit = (item) => {
  itemEditForm.id = item.id;
  itemEditForm.customerName = item.customer_name;
  itemEditForm.altName = item.alt_name || '';
  itemEditForm.trackingNumber = item.tracking_number;
  itemEditForm.packageId = item.package_id || '';
  itemEditForm.weight = item.weight || '';
  shipmentModals.editItem = true;
};

// Confirm item edit
const confirmItemEdit = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/shipment-items/${itemEditForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: itemEditForm.customerName,
        altName: itemEditForm.altName,
        trackingNumber: itemEditForm.trackingNumber,
        packageId: itemEditForm.packageId,
        weight: parseFloat(itemEditForm.weight) || null,
      }),
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.editItem = false;
      await loadShipmentItems();
      scanMessage.value = 'Package updated successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to update item:', error);
    scanMessage.value = 'Failed to update package';
    scanStatus.value = 'error';
  }
};

// Open add item modal
const openAddShipmentItem = () => {
  if (!activeShipmentLogId.value) {
    scanMessage.value = 'Please select a shipment log first';
    scanStatus.value = 'error';
    setTimeout(() => {
      scanMessage.value = '';
    }, 3000);
    return;
  }

  // Reset form
  itemAddForm.customerName = '';
  itemAddForm.altName = '';
  itemAddForm.trackingNumber = '';
  itemAddForm.packageId = '';
  itemAddForm.code = '';
  itemAddForm.weight = '';
  itemAddForm.description = '';

  shipmentModals.addItem = true;
};

// Confirm add item
const confirmAddShipmentItem = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/shipment-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipmentLogId: activeShipmentLogId.value,
        customerName: itemAddForm.customerName,
        altName: itemAddForm.altName,
        trackingNumber: itemAddForm.trackingNumber,
        packageId: itemAddForm.packageId,
        code: itemAddForm.code,
        weight: parseFloat(itemAddForm.weight) || null,
        description: itemAddForm.description,
      }),
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.addItem = false;
      await loadShipmentItems();
      await loadShipmentLogs(); // Refresh card counts
      scanMessage.value = 'Package added successfully';
      scanStatus.value = 'success';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to add item:', error);
    scanMessage.value = 'Failed to add package';
    scanStatus.value = 'error';
  }
};

// Open move item modal
const openItemMove = (item) => {
  itemMoveTarget.value = item;
  itemMoveDestination.value = '';
  shipmentModals.moveItem = true;
};

// Confirm item move
const confirmItemMove = async () => {
  if (!itemMoveTarget.value || !itemMoveDestination.value) return;

  try {
    const response = await fetch('http://localhost:4000/api/shipment-logs/move-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: itemMoveTarget.value.id,
        newLogId: itemMoveDestination.value,
      }),
    });

    const data = await response.json();
    if (data.success) {
      shipmentModals.moveItem = false;
      await loadShipmentItems();
      await loadShipmentLogs(); // Refresh card counts
      scanMessage.value = 'Package moved successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to move item:', error);
    scanMessage.value = 'Failed to move package';
    scanStatus.value = 'error';
  }
};

// Delete shipment item
const deleteShipmentItem = async (item) => {
  if (!confirm(`Are you sure you want to delete this package?\n\nTracking: ${item.tracking_number}\nCustomer: ${item.customer_name}`)) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/api/shipment-items/${item.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      await loadShipmentItems();
      await loadShipmentLogs(); // Refresh card counts
      scanMessage.value = 'Package deleted successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 3000);
    }
  } catch (error) {
    console.error('Failed to delete item:', error);
    scanMessage.value = 'Failed to delete package';
    scanStatus.value = 'error';
  }
};

// Update shipment item status
const updateShipmentItemStatus = async (itemId, newStatus) => {
  try {
    const response = await fetch(`http://localhost:4000/api/shipment-items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await response.json();
    if (data.success) {
      await loadShipmentItems();
      scanMessage.value = 'Status updated successfully';
      scanStatus.value = 'info';
      setTimeout(() => {
        scanMessage.value = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to update status:', error);
    scanMessage.value = 'Failed to update status';
    scanStatus.value = 'error';
  }
};

// ========== SETTINGS PAGE FUNCTIONS ==========

// Load all roles
const loadRoles = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/roles');
    const data = await response.json();
    if (data.success) {
      roles.value = data.roles;
    }
  } catch (error) {
    console.error('Failed to load roles:', error);
  }
};

// Load all permissions
const loadPermissions = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/permissions');
    const data = await response.json();
    if (data.success) {
      permissions.value = data.permissions;
    }
  } catch (error) {
    console.error('Failed to load permissions:', error);
  }
};

// New Role Permission Modal Functions
const openRolePermissionModal = (roleName) => {
  selectedRoleForPermissions.value = roleName;
  // Reset all permissions
  Object.keys(rolePermissionSettings).forEach(key => {
    rolePermissionSettings[key] = { read: false, write: false, create: false };
  });
  // Set permissions based on role type
  if (roleName === 'full_control') {
    // Full Control gets all permissions
    Object.keys(rolePermissionSettings).forEach(key => {
      rolePermissionSettings[key] = { read: true, write: true, create: true };
    });
  } else if (roleName === 'editor') {
    // Editors get read/write on most, create on some
    Object.keys(rolePermissionSettings).forEach(key => {
      if (key === 'apiConfiguration' || key === 'settingsManagement') {
        rolePermissionSettings[key] = { read: true, write: false, create: false };
      } else {
        rolePermissionSettings[key] = { read: true, write: true, create: true };
      }
    });
  } else if (roleName === 'view_only') {
    // View Only get read-only on most
    Object.keys(rolePermissionSettings).forEach(key => {
      if (key === 'packageManagement' || key === 'customerManagement') {
        rolePermissionSettings[key] = { read: true, write: true, create: false };
      } else {
        rolePermissionSettings[key] = { read: true, write: false, create: false };
      }
    });
  }
  rolePermissionModal.value = true;
};

const submitRolePermissionSettings = () => {
  console.log(`Saving permissions for ${selectedRoleForPermissions.value}:`, rolePermissionSettings);
  // TODO: Make API call to save permissions
  rolePermissionModal.value = false;
};

const toggleAllPermissions = (category, value) => {
  if (rolePermissionSettings[category]) {
    rolePermissionSettings[category].read = value;
    rolePermissionSettings[category].write = value;
    rolePermissionSettings[category].create = value;
  }
};

const filteredEmployees = computed(() => {
  let results = employees;

  // Search filter (name or email)
  if (userSearchFilter.value) {
    const search = userSearchFilter.value.toLowerCase();
    results = results.filter(u =>
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    );
  }

  // Role filter
  if (userRoleFilter.value) {
    results = results.filter(u => u.role === userRoleFilter.value);
  }

  // Status filter
  if (userStatusFilter.value) {
    const isActive = userStatusFilter.value === 'active' ? 1 : 0;
    results = results.filter(u => u.active === isActive);
  }

  return results;
});

// Load API configuration
const loadApiConfig = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/settings/api-config');
    const data = await response.json();
    if (data.success && data.config) {
      apiConfig.value = data.config;
      apiConfigForm.baseUrl = data.config.base_url || '';
      apiConfigForm.apiKey = data.config.api_key || '';
      apiConfigForm.email = data.config.email || '';
      apiConfigForm.password = data.config.password || '';
      apiConfigForm.userId = data.config.user_id || '';
      apiConfigForm.timeout = data.config.timeout || 30000;
      apiConfigForm.environment = data.config.environment || 'production';
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }
};

// Load API sync logs
const loadSyncLogs = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/settings/sync-logs');
    const data = await response.json();
    if (data.success) {
      apiSyncLogs.value = data.logs;
    }
  } catch (error) {
    console.error('Failed to load sync logs:', error);
  }
};

// Load maintenance mode status
const loadMaintenanceMode = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/settings/maintenance-mode');
    const data = await response.json();
    if (data.success) {
      maintenanceMode.value = data.maintenanceMode;
    }
  } catch (error) {
    console.error('Failed to load maintenance mode:', error);
  }
};

// Create new role
const createRole = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roleForm.name,
        description: roleForm.description,
      }),
    });

    const data = await response.json();
    if (data.success) {
      roleModals.add = false;
      roleForm.name = '';
      roleForm.description = '';
      await loadRoles();
    } else {
      alert(data.error || 'Failed to create role');
    }
  } catch (error) {
    console.error('Failed to create role:', error);
    alert('Failed to create role');
  }
};

// Open edit role modal
const openEditRole = (role) => {
  roleEditForm.id = role.id;
  roleEditForm.name = role.name;
  roleEditForm.description = role.description || '';
  roleModals.edit = true;
};

// Update role
const updateRole = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/roles/${roleEditForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: roleEditForm.name,
        description: roleEditForm.description,
      }),
    });

    const data = await response.json();
    if (data.success) {
      roleModals.edit = false;
      await loadRoles();
    } else {
      alert(data.error || 'Failed to update role');
    }
  } catch (error) {
    console.error('Failed to update role:', error);
    alert('Failed to update role');
  }
};

// Open delete role confirmation
const openDeleteRole = (role) => {
  roleDeleteTarget.value = role;
  roleModals.delete = true;
};

// Delete role
const deleteRole = async () => {
  if (!roleDeleteTarget.value) return;

  try {
    const response = await fetch(`http://localhost:4000/api/roles/${roleDeleteTarget.value.id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    if (data.success) {
      roleModals.delete = false;
      roleDeleteTarget.value = null;
      await loadRoles();
    } else {
      alert(data.error || 'Failed to delete role');
    }
  } catch (error) {
    console.error('Failed to delete role:', error);
    alert('Failed to delete role');
  }
};

// Open duplicate role modal
const openDuplicateRole = (role) => {
  roleDuplicateTarget.value = role;
  duplicateRoleName.value = `${role.name} (Copy)`;
  roleModals.duplicate = true;
};

// Duplicate role
const duplicateRole = async () => {
  if (!roleDuplicateTarget.value) return;

  try {
    const response = await fetch(`http://localhost:4000/api/roles/${roleDuplicateTarget.value.id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: duplicateRoleName.value }),
    });

    const data = await response.json();
    if (data.success) {
      roleModals.duplicate = false;
      roleDuplicateTarget.value = null;
      duplicateRoleName.value = '';
      await loadRoles();
    } else {
      alert(data.error || 'Failed to duplicate role');
    }
  } catch (error) {
    console.error('Failed to duplicate role:', error);
    alert('Failed to duplicate role');
  }
};

// Open role permissions modal
const openRolePermissions = async (role) => {
  rolePermissionsTarget.value = role;

  try {
    const response = await fetch(`http://localhost:4000/api/roles/${role.id}`);
    const data = await response.json();
    if (data.success) {
      selectedPermissions.value = data.permissions.map(p => p.id);
      roleModals.permissions = true;
    }
  } catch (error) {
    console.error('Failed to load role permissions:', error);
  }
};

// Save role permissions
const saveRolePermissions = async () => {
  if (!rolePermissionsTarget.value) return;

  try {
    const response = await fetch(`http://localhost:4000/api/roles/${rolePermissionsTarget.value.id}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: selectedPermissions.value }),
    });

    const data = await response.json();
    if (data.success) {
      roleModals.permissions = false;
      rolePermissionsTarget.value = null;
      selectedPermissions.value = [];
      await loadRoles();
    } else {
      alert(data.error || 'Failed to save permissions');
    }
  } catch (error) {
    console.error('Failed to save permissions:', error);
    alert('Failed to save permissions');
  }
};

// Toggle permission selection
const togglePermission = (permissionId) => {
  const index = selectedPermissions.value.indexOf(permissionId);
  if (index > -1) {
    selectedPermissions.value.splice(index, 1);
  } else {
    selectedPermissions.value.push(permissionId);
  }
};

// Group permissions by category
const permissionsByCategory = computed(() => {
  const grouped = {};
  permissions.value.forEach(perm => {
    const category = perm.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(perm);
  });
  return grouped;
});

// Activate user
const activateUser = async (userId) => {
  try {
    const response = await fetch(`http://localhost:4000/api/users/${userId}/activate`, {
      method: 'PATCH',
    });

    const data = await response.json();
    if (data.success) {
      await refreshUsers();
    } else {
      alert(data.error || 'Failed to activate user');
    }
  } catch (error) {
    console.error('Failed to activate user:', error);
    alert('Failed to activate user');
  }
};

// Deactivate user
const deactivateUser = async (userId) => {
  try {
    const response = await fetch(`http://localhost:4000/api/users/${userId}/deactivate`, {
      method: 'PATCH',
    });

    const data = await response.json();
    if (data.success) {
      await refreshUsers();
    } else {
      alert(data.error || 'Failed to deactivate user');
    }
  } catch (error) {
    console.error('Failed to deactivate user:', error);
    alert('Failed to deactivate user');
  }
};

// Open edit user modal
const openEditUser = (user) => {
  userEditForm.id = user.id;
  userEditForm.name = user.name;
  userEditForm.email = user.email;
  userEditForm.password = '';
  userEditForm.role = user.role;
  userModals.edit = true;
};

// Open delete user modal
const openDeleteUser = (user) => {
  userDeleteTarget.value = user;
  userModals.delete = true;
};

// Open password reset modal
const openPasswordReset = (user) => {
  passwordResetTarget.value = user;
  newPassword.value = '';
  passwordResetModal.value = true;
};

// Reset user password
const resetUserPassword = async () => {
  if (!passwordResetTarget.value || !newPassword.value) return;

  try {
    const response = await fetch(`http://localhost:4000/api/users/${passwordResetTarget.value.id}/reset-password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword.value }),
    });

    const data = await response.json();
    if (data.success) {
      passwordResetModal.value = false;
      passwordResetTarget.value = null;
      newPassword.value = '';
      alert('Password reset successfully');
    } else {
      alert(data.error || 'Failed to reset password');
    }
  } catch (error) {
    console.error('Failed to reset password:', error);
    alert('Failed to reset password');
  }
};

// Alias functions for better naming consistency
const addNewUser = confirmUserAdd;
const saveEditUser = confirmUserEdit;

// Toggle user active/inactive status
const toggleUserLock = (user) => {
  const userToUpdate = employees.find((e) => e.id === user.id);
  if (userToUpdate) {
    userToUpdate.active = userToUpdate.active === 1 ? 0 : 1;
    // If toggling the current user, sign them out if deactivating
    if (currentUser.value?.id === user.id && userToUpdate.active === 0) {
      alert('Your account has been deactivated. You will be signed out.');
      signOut();
    }
  }
};

// Kebab Menu Helper Functions
const toggleUserKebab = (userId) => {
  openUserKebabId.value = openUserKebabId.value === userId ? null : userId;
};

const closeUserKebab = (userId) => {
  if (openUserKebabId.value === userId) {
    openUserKebabId.value = null;
  }
};

const toggleShipmentItemKebab = (itemId) => {
  openShipmentItemKebabId.value = openShipmentItemKebabId.value === itemId ? null : itemId;
};

const closeShipmentItemKebab = (itemId) => {
  if (openShipmentItemKebabId.value === itemId) {
    openShipmentItemKebabId.value = null;
  }
};

// Save API configuration
const saveApiConfig = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/settings/api-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: apiConfigForm.baseUrl,
        apiKey: apiConfigForm.apiKey,
        email: apiConfigForm.email,
        password: apiConfigForm.password,
        userId: apiConfigForm.userId,
        timeout: apiConfigForm.timeout,
        environment: apiConfigForm.environment,
      }),
    });

    const data = await response.json();
    if (data.success) {
      isEditingApiConfig.value = false;
      alert('API configuration saved successfully');
      await loadApiConfig();
    } else {
      alert(data.error || 'Failed to save API configuration');
    }
  } catch (error) {
    console.error('Failed to save API config:', error);
    alert('Failed to save API configuration');
  }
};

// Test API connection
const testApiConnection = async () => {
  apiTestStatus.value = 'testing';
  apiTestMessage.value = 'Testing connection...';

  try {
    const response = await fetch('http://localhost:4000/api/settings/api-config/test', {
      method: 'POST',
    });

    const data = await response.json();
    if (data.success) {
      apiTestStatus.value = 'success';
      apiTestMessage.value = 'Connection successful!';
    } else {
      apiTestStatus.value = 'error';
      apiTestMessage.value = data.message || 'Connection failed';
    }
  } catch (error) {
    console.error('Failed to test API connection:', error);
    apiTestStatus.value = 'error';
    apiTestMessage.value = 'Connection failed';
  }

  setTimeout(() => {
    apiTestStatus.value = '';
    apiTestMessage.value = '';
  }, 5000);
};

// Trigger API sync
const triggerApiSync = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/external/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncedBy: currentUser.value?.name || 'Admin' }),
    });

    const data = await response.json();
    if (data.success) {
      alert(`Sync completed: ${data.summary.created} created, ${data.summary.updated} updated`);
      await loadSyncLogs();
      await loadApiConfig();
    } else {
      alert(data.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Failed to sync:', error);
    alert('Sync failed');
  }
};

// Toggle maintenance mode
const toggleMaintenanceModeFunc = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/settings/maintenance-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !maintenanceMode.value }),
    });

    const data = await response.json();
    if (data.success) {
      maintenanceMode.value = data.maintenanceMode;
    } else {
      alert(data.error || 'Failed to toggle maintenance mode');
    }
  } catch (error) {
    console.error('Failed to toggle maintenance mode:', error);
    alert('Failed to toggle maintenance mode');
  }
};

// Load packages and customers from backend database
const loadPackagesFromBackend = async () => {
  try {
    console.log('Loading packages from backend...');
    const response = await fetch('http://localhost:4000/api/customers');
    const data = await response.json();

    if (data.success && data.customers) {
      console.log(`Loaded ${data.customers.length} customers from backend`);

      // Transform backend data to match frontend structure
      // Backend already returns camelCase, so just pass through with defaults
      const transformedCustomers = data.customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        packages: (customer.packages || []).map(pkg => ({
          packageId: pkg.packageId,
          trackingNumber: pkg.trackingNumber || '',
          status: pkg.status || 'Processing in Office',
          weight: pkg.weight || 0,
          dateUpdated: pkg.dateUpdated || new Date().toISOString().split('T')[0],
          description: pkg.description || '',
          cost: pkg.cost || 0,
          paymentMethod: pkg.paymentMethod || '',
          updatedBy: pkg.updatedBy || '',
          billingStatus: pkg.billingStatus || 'Open',
          amountPaid: pkg.amountPaid || 0,
          freightType: pkg.freightType || 'Air',
          notes: pkg.notes || [],
          collected: Boolean(pkg.collected),
          deleted: Boolean(pkg.deleted),
          archived: Boolean(pkg.archived),
          // Additional Courier Depot fields
          altName: pkg.altName || '',
          reason: pkg.reason || '',
          seller: pkg.seller || '',
          length: pkg.length || 0,
          width: pkg.width || 0,
          height: pkg.height || 0,
          cubicFeet: pkg.cubicFeet || 0,
          location: pkg.location || '',
          invoiceUrl: pkg.invoiceUrl || '',
          packageImageUrl: pkg.packageImageUrl || '',
          preAlert: Boolean(pkg.preAlert),
          emailSent: Boolean(pkg.emailSent),
          paid: Boolean(pkg.paid),
          warehouseDate: pkg.warehouseDate || null,
        }))
      }));

      customers.value = transformedCustomers;
      console.log(`Packages loaded successfully. Total packages: ${transformedCustomers.reduce((sum, c) => sum + c.packages.length, 0)}`);
    } else {
      console.error('Failed to load customers:', data.error || 'Unknown error');
      // Keep using the hardcoded data if backend fails
      customers.value = clone(initialCustomers);
    }
  } catch (error) {
    console.error('Error loading packages from backend:', error);
    // Keep using the hardcoded data if backend fails
    customers.value = clone(initialCustomers);
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickAway);
  document.addEventListener("click", handleClickOutside);
  loadPackagesFromBackend();
  loadBillingItems();
  loadBillingStats();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickAway);
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style>
/* Packages Page Styles */
.packages-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  color: white;
}

.packages-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.packages-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.packages-subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1rem;
}

.packages-actions {
  display: flex;
  gap: 1rem;
}

.packages-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.packages-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.packages-card-status {
  display: flex;
  gap: 1rem;
  align-items: start;
  border-left: 4px solid #10b981;
}

.packages-card-icon {
  color: #10b981;
  flex-shrink: 0;
}

.packages-card-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.packages-card-value {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #111827;
}

.packages-card-meta {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

.packages-stat {
  text-align: center;
}

.packages-stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: #111827;
}

.packages-stat-success {
  color: #10b981;
}

.packages-stat-warning {
  color: #f59e0b;
}

.packages-stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.packages-controls {
  margin-bottom: 1.5rem;
}

.packages-search {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}

.packages-search:focus {
  outline: none;
  border-color: #667eea;
}

.packages-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.packages-filter-btn {
  padding: 0.5rem 1rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.packages-filter-btn:hover {
  border-color: #667eea;
  background: #f5f7ff;
}

.packages-filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.packages-table-shell {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

.packages-table {
  width: 100%;
  border-collapse: collapse;
}

.packages-table thead {
  background: #f9fafb;
}

.packages-table th {
  padding: 1rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
}

.packages-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.packages-table tbody tr:hover {
  background: #f9fafb;
}

.packages-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #667eea;
}

.packages-tracking {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.packages-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: #f3f4f6;
  color: #374151;
}

.packages-sync-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.packages-sync-synced {
  background: #d1fae5;
  color: #065f46;
}

/* ==================== BILLING CONSOLE STYLES ==================== */

.billing-filter-select {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #d9e2f1;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.billing-filter-select:focus {
  border-color: var(--sgx-light);
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 174, 239, 0.1);
}

.billing-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* BL Status Dropdown */
.bl-status-dropdown {
  position: relative;
  display: inline-block;
}

.bl-status-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bl-status-btn .chevron {
  font-size: 10px;
  transition: transform 0.15s ease;
}

.bl-status-btn:hover .chevron {
  transform: translateY(1px);
}

.bl-status-btn.bl-unbilled {
  background: #f1f5f9;
  color: #64748b;
}

.bl-status-btn.bl-open {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
}

.bl-status-btn.bl-partial {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
}

.bl-status-btn.bl-closed {
  background: rgba(16, 185, 129, 0.15);
  color: #065f46;
}

.bl-status-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 120px;
  overflow: hidden;
}

.bl-status-menu button {
  display: block;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  border: none;
  background: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.bl-status-menu button:hover {
  background: rgba(0, 174, 239, 0.08);
}

/* Billing Pagination */
.billing-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Billing Modal Styles */
.billing-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafb;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.billing-info-row div {
  flex: 1;
  min-width: 150px;
}

.billing-total {
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--sgx-blue), var(--sgx-light));
  color: white;
  border-radius: 8px;
  font-size: 16px;
  text-align: center;
  margin-top: 16px;
}

.billing-cost-breakdown {
  padding: 16px;
  background: #f8fafb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.cost-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #e5e9f2;
}

.cost-line:last-child {
  border-bottom: none;
}

.cost-line.late-fee {
  color: #dc2626;
}

.cost-line.total {
  font-weight: 700;
  font-size: 16px;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 2px solid var(--border-color);
  border-bottom: none;
}

.cost-line.paid {
  color: #10b981;
}

.cost-line.balance {
  font-weight: 700;
  color: var(--sgx-blue);
}

/* View Modal */
.billing-view-content {
  max-height: 60vh;
  overflow-y: auto;
}

.view-value {
  font-size: 14px;
  color: var(--text-main);
  margin: 0;
}

/* Tag Styles for Billing */
td .tag.success {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
  border-color: rgba(16, 185, 129, 0.25);
}

td .tag.danger {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.25);
}

/* Billing Table Body Text Styles */
#dashboard tbody td {
  font-size: 14px;
  color: #708090;
}

#dashboard tbody td strong {
  color: var(--text-main);
}

/* Kebab Menu - Horizontal Dots */
.kebab-menu-container {
  position: relative;
  display: inline-block;
}

.kebab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.kebab-btn:hover {
  background: #f8fafb;
  border-color: var(--sgx-light);
}

.kebab-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.kebab-dots::before,
.kebab-dots::after {
  content: '';
  width: 4px;
  height: 4px;
  background: #64748b;
  border-radius: 50%;
}

.kebab-dots span {
  width: 4px;
  height: 4px;
  background: #64748b;
  border-radius: 50%;
}

.kebab-btn:hover .kebab-dots::before,
.kebab-btn:hover .kebab-dots::after,
.kebab-btn:hover .kebab-dots span {
  background: var(--sgx-blue);
}

.kebab-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 100;
  min-width: 140px;
  overflow: hidden;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.kebab-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  transition: background 0.15s ease;
}

.kebab-dropdown button:hover {
  background: rgba(0, 174, 239, 0.08);
  color: var(--sgx-blue);
}

.kebab-dropdown button.danger {
  color: #dc2626;
}

.kebab-dropdown button.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
}

/* Modern Billing Modal Styles */
.billing-modal {
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  overflow: visible;
}

.billing-modal header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.billing-modal header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.modal-subtitle {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #e2e8f0;
  color: var(--text-main);
}

.billing-modal form {
  padding: 20px 24px;
}

.billing-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.input-with-prefix {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.15s ease;
}

.input-with-prefix:focus-within {
  border-color: var(--sgx-light);
  box-shadow: 0 0 0 3px rgba(0, 174, 239, 0.1);
}

.input-with-prefix .prefix {
  padding: 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  height: 42px;
  display: flex;
  align-items: center;
}

.input-with-prefix input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
}

.input-with-prefix input::placeholder {
  color: #94a3b8;
}

.billing-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  margin-top: 20px;
}

.summary-label {
  font-size: 14px;
  font-weight: 500;
  color: #0369a1;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--sgx-blue);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, var(--sgx-blue) 0%, #003d7a 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 45, 98, 0.25);
}

.btn-secondary {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: var(--text-main);
}

.btn-danger {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}

/* View Modal Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
}

.info-value.highlight {
  font-weight: 700;
  color: var(--sgx-blue);
}

.section-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 20px 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 16px;
}

/* Payment Info Row */
.payment-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 16px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-row span:first-child {
  font-size: 13px;
  color: #64748b;
}

.payment-row span:last-child {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

.payment-row.total {
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  margin-top: 4px;
}

.payment-row.total span:first-child {
  font-weight: 600;
  color: var(--text-main);
}

.payment-row.total span:last-child {
  font-size: 16px;
  font-weight: 700;
  color: var(--sgx-blue);
}

.payment-row.balance span:last-child {
  color: #059669;
  font-weight: 600;
}

/* Delete Modal Warning */
.delete-warning {
  padding: 16px;
  background: #fef2f2;
  border-radius: 10px;
  margin-bottom: 16px;
}

.delete-warning p {
  font-size: 14px;
  color: #991b1b;
  margin: 0;
}

.delete-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.delete-info-row {
  display: flex;
  gap: 8px;
}

.delete-info-row span:first-child {
  font-size: 13px;
  color: #64748b;
  min-width: 80px;
}

.delete-info-row span:last-child {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

/* Modern Form Elements */
.modern-input,
.modern-select,
.modern-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-main);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  outline: none;
  transition: all 0.15s ease;
}

.modern-input:focus,
.modern-select:focus,
.modern-textarea:focus {
  border-color: var(--sgx-light);
  box-shadow: 0 0 0 3px rgba(0, 174, 239, 0.1);
}

.modern-input::placeholder,
.modern-textarea::placeholder {
  color: #94a3b8;
}

.modern-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.modern-textarea {
  resize: vertical;
  min-height: 60px;
}

/* Collect Modal - Compact Layout */
.collect-modal {
  max-width: 400px !important;
  overflow: hidden !important;
}

.collect-modal form {
  padding: 16px 24px 20px;
}

.collect-summary {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.collect-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.collect-row span:first-child {
  font-size: 13px;
  color: #64748b;
}

.collect-row span:last-child {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}

.collect-row .total-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--sgx-blue);
}

.collect-row.balance-row {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 174, 239, 0.2);
}

.collect-row.balance-row span:last-child {
  font-size: 15px;
  font-weight: 700;
  color: #059669;
}

.collect-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collect-field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.collect-modal .modal-footer {
  margin-top: 16px;
  padding-top: 16px;
}
</style>
