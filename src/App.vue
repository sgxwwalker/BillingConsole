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
          <div class="top-actions">
            <button class="pill ghost" type="button" @click="refreshData">Refresh Data</button>
          </div>
        </header>

        <div class="grid stats-split">
          <div class="card stat">
            <p class="eyebrow">Ready today</p>
            <h3>{{ stats.ready }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Collected today</p>
            <h3>{{ stats.collectedToday }}</h3>
          </div>
        </div>

        <div class="search-header no-title">
          <div class="search-box" ref="searchBox">
            <label class="input-label" for="customerSearch">Search</label>
            <div class="input-shell">
              <input
                id="customerSearch"
                type="text"
                placeholder="Search customer, package ID, tracking"
                autocomplete="off"
                v-model="searchQuery"
                @focus="showAutocomplete = true"
                @input="showAutocomplete = true"
                @keydown.enter.prevent="selectFirstMatch"
              />
            </div>
            <div class="autocomplete" v-if="showAutocomplete && filteredCustomers.length">
              <button
                v-for="customer in filteredCustomers"
                :key="customer.id"
                type="button"
                @click="setActiveCustomer(customer)"
              >
                {{ customer.name }} <span class="muted">({{ customer.id }})</span>
              </button>
            </div>
          </div>
        </div>

        <div class="table-actions">
          <div>
            <div class="active-customer muted">
              <template v-if="activeCustomer">
                {{ activeCustomer.name }} — {{ activeCustomer.id }}
              </template>
              <template v-else>No customer selected</template>
            </div>
          </div>
          <div class="action-group">
            <button class="pill secondary" type="button" @click="openBulkCollection" :disabled="!activeCustomer || !currentUser || !can('collect')">Mark all collected</button>
            <button class="pill" type="button" @click="toggleView">
              {{ showAll ? "Show ready packages" : "Show all packages" }}
            </button>
            <button class="pill ghost" type="button" @click="openAddPackage" :disabled="!currentUser || !can('addPackage')">Add package</button>
          </div>
        </div>

        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" :checked="allPackagesSelected" @change="toggleAllPackages" /></th>
                <th>Freight</th>
                <th>Package ID</th>
                <th>Tracking</th>
                <th>Cost</th>
                <th>Late fee</th>
                <th>Status</th>
                <th>Method</th>
                <th>Updated by</th>
                <th>Updated</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!activeCustomer || !visiblePackages.length" class="empty">
                <td colspan="12">No ready packages yet. Select a customer or show all to see additional statuses.</td>
              </tr>
              <tr v-for="pkg in visiblePackages" :key="pkg.packageId">
                <td><input type="checkbox" :checked="selectedPackageIds.includes(pkg.packageId)" @change="togglePackageSelection(pkg.packageId)" /></td>
                <td class="freight-cell">
                  <template v-if="pkg.freightType === 'Air'">
                    <img :src="planeIcon" alt="Air" class="freight-icon" />
                  </template>
                  <template v-else-if="pkg.freightType === 'Sea'">
                    <img :src="shipIcon" alt="Sea" class="freight-icon" />
                  </template>
                  <template v-else>—</template>
                </td>
                <td>{{ pkg.packageId }}</td>
                <td>{{ pkg.trackingNumber }}</td>
                <td>{{ formatCurrency(pkg.cost) }}</td>
                <td>{{ formatCurrency(computeLateFee(pkg)) }}</td>
                <td>
                  <span class="tag closed" v-if="pkg.billingStatus === 'Closed'">Closed</span>
                  <span class="tag open" v-else-if="pkg.billingStatus === 'Open'">Open</span>
                  <span class="tag partial" v-else>Partial</span>
                </td>
                <td>{{ pkg.paymentMethod || "—" }}</td>
                <td>{{ pkg.updatedBy || "—" }}</td>
                <td>{{ pkg.dateUpdated }}</td>
                <td><span class="note">{{ latestNote(pkg) }}</span></td>
                <td>
                  <div class="actions">
                    <button class="pill secondary" type="button" @click="openCollection([pkg.packageId])" :disabled="!currentUser || !can('collect')">Collected</button>
                    <button class="pill ghost" type="button" @click="openView(pkg)">View</button>
                    <button class="pill ghost" type="button" @click="openEdit(pkg)" :disabled="!currentUser || !can('edit')">Edit</button>
                    <button class="pill danger" type="button" @click="openDelete(pkg)" :disabled="!currentUser || !can('delete')">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="currentPage === 'summary'" class="panel full-page" id="summary">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Daily summary</p>
            <h2>Collections by method</h2>
            <p class="muted">Breakdown of collected amounts and who recorded them.</p>
          </div>
        </div>
        <div class="table-shell compact">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cash</th>
                <th>POS</th>
                <th>Transfer</th>
                <th>Credit Card</th>
                <th>Recorded by</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!dailySummary.length" class="empty">
                <td colspan="6">No collections yet today.</td>
              </tr>
              <tr v-for="row in dailySummary" :key="row.date">
                <td>{{ row.date }}</td>
                <td>{{ formatCurrency(row.cash) }}</td>
                <td>{{ formatCurrency(row.pos) }}</td>
                <td>{{ formatCurrency(row.transfer) }}</td>
                <td>{{ formatCurrency(row.creditCard) }}</td>
                <td>{{ row.users.join(', ') || '—' }}</td>
              </tr>
            </tbody>
          </table>
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

        <!-- Environment Controls Section (Maintenance Mode) -->
        <div class="card" style="margin-bottom: 32px; border-left: 4px solid #ef4444;" v-if="currentUser?.role === 'full_control'">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">⚙️ Environment Controls</h3>
            <p class="muted">System-wide settings and maintenance controls</p>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #fef2f2; border-radius: 8px;">
            <div>
              <strong style="font-size: 16px; color: var(--text-main);">Maintenance Mode</strong>
              <p class="muted" style="margin-top: 4px;">When enabled, only administrators can access the system</p>
              <p v-if="maintenanceMode" style="color: #ef4444; font-weight: 600; margin-top: 8px;">⚠️ Maintenance mode is currently ENABLED</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" :checked="maintenanceMode" @change="toggleMaintenanceModeFunc" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- User & Role Management Section -->
        <div class="card" style="margin-bottom: 32px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">👥 User & Role Management</h3>
            <p class="muted">Manage system users and their role assignments</p>
          </div>

          <!-- Users Management -->
          <div style="margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="font-size: 16px; font-weight: 600; color: var(--text-main);">Users</h4>
              <button class="pill" type="button" @click="userModals.add = true" v-if="hasPermission('admin')">+ Add New User</button>
            </div>

            <div class="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th v-if="hasPermission('admin')">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in employees" :key="user.id">
                    <td><strong>{{ user.name }}</strong></td>
                    <td>{{ user.email }}</td>
                    <td>
                      <span class="tag" :class="{
                        'primary': user.role === 'full_control',
                        'secondary': user.role === 'editor',
                        '': user.role === 'view_only'
                      }">
                        {{ user.role }}
                      </span>
                    </td>
                    <td>
                      <span class="tag" :class="user.active === 1 ? 'success' : 'danger'">
                        {{ user.active === 1 ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td v-if="hasPermission('admin')">
                      <div class="actions">
                        <button class="pill small ghost" type="button" @click="openEditUser(user)">Edit</button>
                        <button v-if="user.active === 1" class="pill small ghost" type="button" @click="deactivateUser(user.id)">Deactivate</button>
                        <button v-else class="pill small ghost" type="button" @click="activateUser(user.id)">Activate</button>
                        <button class="pill small ghost" type="button" @click="openPasswordReset(user)">Reset Password</button>
                        <button class="pill small danger" type="button" @click="openDeleteUser(user)">Delete</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Roles Management -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="font-size: 16px; font-weight: 600; color: var(--text-main);">Roles</h4>
              <button class="pill" type="button" @click="roleModals.add = true" v-if="hasPermission('admin')">+ Create New Role</button>
            </div>

            <div class="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th v-if="hasPermission('admin')">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="role in roles" :key="role.id">
                    <td><strong>{{ role.name }}</strong></td>
                    <td>{{ role.description || '—' }}</td>
                    <td>
                      <span class="tag" :class="role.is_system ? 'primary' : 'secondary'">
                        {{ role.is_system ? 'System' : 'Custom' }}
                      </span>
                    </td>
                    <td v-if="hasPermission('admin')">
                      <div class="actions">
                        <button class="pill small ghost" type="button" @click="openRolePermissions(role)">Permissions</button>
                        <button v-if="!role.is_system" class="pill small ghost" type="button" @click="openEditRole(role)">Edit</button>
                        <button class="pill small ghost" type="button" @click="openDuplicateRole(role)">Duplicate</button>
                        <button v-if="!role.is_system" class="pill small danger" type="button" @click="openDeleteRole(role)">Delete</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- External API Configuration (Only for full_control users) -->
        <div v-if="currentUser?.role === 'full_control'" class="card" style="margin-bottom: 32px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">🔌 External API Configuration</h3>
            <p class="muted">Configure external platform integration and authentication</p>
          </div>

          <div class="form-grid">
            <label>
              <span class="input-label">API Base URL</span>
              <input v-model="apiConfigForm.baseUrl" type="url" placeholder="https://api.example.com" />
            </label>

            <label>
              <span class="input-label">API Key</span>
              <div style="position: relative;">
                <input v-model="apiConfigForm.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="Enter API key" />
                <button type="button" @click="showApiKey = !showApiKey"
                  style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b;">
                  {{ showApiKey ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </label>

            <label>
              <span class="input-label">Authentication Email</span>
              <input v-model="apiConfigForm.email" type="email" placeholder="api@example.com" />
            </label>

            <label>
              <span class="input-label">Authentication Password</span>
              <div style="position: relative;">
                <input v-model="apiConfigForm.password" :type="showApiPassword ? 'text' : 'password'" placeholder="Enter password" />
                <button type="button" @click="showApiPassword = !showApiPassword"
                  style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b;">
                  {{ showApiPassword ? '👁️' : '👁️‍🗨️' }}
                </button>
              </div>
            </label>

            <label>
              <span class="input-label">Request Timeout (ms)</span>
              <input v-model.number="apiConfigForm.timeout" type="number" min="1000" step="1000" />
            </label>

            <label>
              <span class="input-label">Environment</span>
              <select v-model="apiConfigForm.environment">
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </label>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button class="pill" type="button" @click="saveApiConfig">Save Configuration</button>
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
        <div class="card">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">🔔 Notification Preferences</h3>
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
            <p class="muted">Manage shipment logs, scan incoming packages, and organize inventory</p>
          </div>
          <button class="pill" type="button" @click="openShipmentUpload" v-if="hasPermission('manageShipments')">+ Upload New Shipment Log</button>
        </div>

        <!-- Section 1: Manage All Shipment Logs -->
        <div v-if="shipmentLogs.length > 0" class="card" style="margin-bottom: 32px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">📦 All Shipment Logs</h3>
            <p class="muted">View, edit, or delete uploaded shipment logs</p>
          </div>
          <div class="table-shell compact">
            <table>
              <thead>
                <tr>
                  <th>Log Name</th>
                  <th>Shipment Date</th>
                  <th>Items</th>
                  <th>Uploaded By</th>
                  <th>Created</th>
                  <th v-if="hasPermission('manageShipments')">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in shipmentLogs" :key="log.id">
                  <td><strong>{{ log.log_name }}</strong></td>
                  <td>{{ log.shipment_date }}</td>
                  <td>
                    <span class="tag secondary">{{ getLogItemCount(log.id) }} items</span>
                  </td>
                  <td>{{ log.uploaded_by || '—' }}</td>
                  <td>{{ new Date(log.created_at).toLocaleDateString() }}</td>
                  <td v-if="hasPermission('manageShipments')">
                    <div class="actions">
                      <button class="pill small ghost" type="button" @click="openShipmentEdit(log)">Edit</button>
                      <button class="pill small danger" type="button" @click="openShipmentDelete(log)">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2: Scanning Operations -->
        <div v-if="shipmentLogs.length > 0" style="margin-bottom: 32px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">🔍 Scanning Operations</h3>
            <p class="muted">Select a shipment log and scan packages as they arrive</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <!-- Active Shipment Log Selector -->
            <div class="card">
              <label>
                <span class="input-label">Active Shipment Log</span>
                <select v-model="activeShipmentLogId" @change="loadShipmentItems">
                  <option value="">-- Select a shipment log --</option>
                  <option v-for="log in shipmentLogs" :key="log.id" :value="log.id">
                    {{ log.log_name }} - {{ log.shipment_date }}
                  </option>
                </select>
              </label>
            </div>

            <!-- Scanning Interface -->
            <div class="card" :class="{ 'disabled-card': !activeShipmentLogId || !hasPermission('scanPackages') }">
              <p class="input-label">Scan Tracking Number</p>
              <div class="form-grid">
                <input
                  ref="scanInput"
                  v-model="scanTrackingNumber"
                  @keydown.enter="scanPackage"
                  type="text"
                  placeholder="Scan or enter tracking number..."
                  style="font-size: 16px; padding: 16px;"
                  :disabled="!activeShipmentLogId || !hasPermission('scanPackages')"
                />
                <button class="pill" type="button" @click="scanPackage" :disabled="!activeShipmentLogId || !hasPermission('scanPackages')">Scan</button>
              </div>
              <p v-if="scanMessage" :class="{'muted': scanStatus === 'info', 'error-text': scanStatus === 'error'}" style="margin-top: 12px;">
                {{ scanMessage }}
              </p>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div v-if="activeShipmentLogId" class="stats-split" style="margin-bottom: 24px;">
          <div class="card stat">
            <p class="eyebrow">Total Items</p>
            <h3>{{ shipmentStats.total }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Received</p>
            <h3>{{ shipmentStats.received }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Pending</p>
            <h3>{{ shipmentStats.pending }}</h3>
          </div>
          <div class="card stat">
            <p class="eyebrow">Not Found</p>
            <h3>{{ shipmentStats.notFound }}</h3>
          </div>
        </div>

        <!-- Not Found Scans Section (Collapsible) -->
        <div v-if="activeShipmentLogId && notFoundScans.length > 0" style="margin-bottom: 32px;">
          <div class="not-found-collapsible-card" :class="{ expanded: showNotFoundScans }">
            <div class="not-found-header" @click="showNotFoundScans = !showNotFoundScans">
              <div class="not-found-header-content">
                <div class="not-found-icon">❌</div>
                <div>
                  <h3 class="not-found-title">Not Found Scans</h3>
                  <p class="not-found-subtitle">{{ notFoundScans.length }} tracking {{ notFoundScans.length === 1 ? 'number' : 'numbers' }} not found in this log</p>
                </div>
              </div>
              <div class="not-found-toggle">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="not-found-content" v-show="showNotFoundScans">
              <div class="table-shell compact">
                <table>
                  <thead>
                    <tr>
                      <th>Tracking Number</th>
                      <th>Scanned At</th>
                      <th>Scanned By</th>
                      <th>Shipment Log</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="scan in notFoundScans" :key="scan.id">
                      <td><strong>{{ scan.tracking_number }}</strong></td>
                      <td>{{ new Date(scan.scanned_at).toLocaleString() }}</td>
                      <td>{{ scan.scanned_by || '—' }}</td>
                      <td>
                        <span class="tag secondary">
                          {{ shipmentLogs.find(log => log.id === scan.shipment_log_id)?.log_name || 'Unknown' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Package Inventory -->
        <div v-if="activeShipmentLogId && shipmentItems.length > 0">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">📋 Package Inventory</h3>
            <p class="muted">View and manage all packages in the selected shipment log</p>
          </div>

          <!-- Search Bar -->
          <div class="search-box" style="margin-bottom: 16px; width: 100%;">
            <input
              v-model="shipmentSearchQuery"
              type="text"
              placeholder="Search by customer, tracking, package ID, weight, status..."
              style="font-size: 14px; width: 100%;"
            />
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button
              class="pill"
              :class="{'secondary': shipmentFilter === 'all', 'ghost': shipmentFilter !== 'all'}"
              @click="shipmentFilter = 'all'"
            >
              All ({{ shipmentStats.total }})
            </button>
            <button
              class="pill"
              :class="{'secondary': shipmentFilter === 'pending', 'ghost': shipmentFilter !== 'pending'}"
              @click="shipmentFilter = 'pending'"
            >
              Pending ({{ shipmentStats.pending }})
            </button>
            <button
              class="pill"
              :class="{'secondary': shipmentFilter === 'received', 'ghost': shipmentFilter !== 'received'}"
              @click="shipmentFilter = 'received'"
            >
              Received ({{ shipmentStats.received }})
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
                  <th @click="sortShipmentTable('customer_name')" style="cursor: pointer; user-select: none;">
                    User Name
                    <span v-if="shipmentSortColumn === 'customer_name'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('alt_name')" style="cursor: pointer; user-select: none;">
                    Alt Name
                    <span v-if="shipmentSortColumn === 'alt_name'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('tracking_number')" style="cursor: pointer; user-select: none;">
                    Tracking Number
                    <span v-if="shipmentSortColumn === 'tracking_number'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('weight')" style="cursor: pointer; user-select: none;">
                    Weight (LB)
                    <span v-if="shipmentSortColumn === 'weight'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('status')" style="cursor: pointer; user-select: none;">
                    Status
                    <span v-if="shipmentSortColumn === 'status'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('scanned_by')" style="cursor: pointer; user-select: none;">
                    Scanned By
                    <span v-if="shipmentSortColumn === 'scanned_by'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="sortShipmentTable('scanned_at')" style="cursor: pointer; user-select: none;">
                    Scanned At
                    <span v-if="shipmentSortColumn === 'scanned_at'">{{ shipmentSortDirection === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th v-if="hasPermission('editShipmentItems') || hasPermission('moveShipmentItems')">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredShipmentItems" :key="item.id">
                  <td>{{ item.package_id || '—' }}</td>
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.alt_name || '—' }}</td>
                  <td><strong>{{ item.tracking_number }}</strong></td>
                  <td>{{ item.weight || '—' }}</td>
                  <td>
                    <select
                      v-if="hasPermission('editShipmentItems')"
                      :value="item.status"
                      @change="updateShipmentItemStatus(item.id, $event.target.value)"
                      style="padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 13px;"
                    >
                      <option value="received">Received</option>
                      <option value="pending">Pending</option>
                      <option value="not_found">Not Found</option>
                    </select>
                    <span v-else class="tag" :class="item.status === 'received' ? 'closed' : 'open'">
                      {{ item.status }}
                    </span>
                  </td>
                  <td>{{ item.scanned_by || '—' }}</td>
                  <td>{{ item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '—' }}</td>
                  <td v-if="hasPermission('editShipmentItems') || hasPermission('moveShipmentItems')">
                    <div class="actions">
                      <button v-if="hasPermission('editShipmentItems')" class="pill small ghost" type="button" @click="openItemEdit(item)">Edit</button>
                      <button v-if="hasPermission('moveShipmentItems')" class="pill small secondary" type="button" @click="openItemMove(item)">Move</button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredShipmentItems.length === 0" class="empty">
                  <td colspan="9">No packages found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="shipmentLogs.length === 0" class="card">
          <p class="muted" style="text-align: center; padding: 40px 0;">
            No shipment logs found. Upload a shipment log to get started.
          </p>
        </div>
      </section>

      <section v-if="currentPage === 'settings'" class="panel full-page" id="settings">
        <div class="panel-head">
          <div>
            <p class="eyebrow">Settings</p>
            <h2>System Configuration</h2>
            <p class="muted">Manage users, roles, and system integrations</p>
          </div>
        </div>

        <!-- User & Role Management Section -->
        <div style="margin-bottom: 48px;">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">👥 User & Role Management</h3>
              <p class="muted">Manage users, assign roles and permissions for dashboard users</p>
            </div>
            <button class="pill" type="button" @click="openUserAdd">Add new user</button>
          </div>
          <div class="table-shell compact">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in employees" :key="user.id">
                  <td>{{ user.name }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <select v-model="user.role" @change="updateUserRole(user.id, user.role)">
                      <option value="full_control">Full Control</option>
                      <option value="editor">Editor</option>
                      <option value="view_only">View Only</option>
                      <option value="custom">Custom</option>
                    </select>
                  </td>
                  <td>
                    <button class="pill small ghost" type="button" @click="openPermissions(user)">Configure</button>
                  </td>
                  <td>
                    <div class="actions">
                      <button class="pill small ghost" type="button" @click="openUserEdit(user)">Edit</button>
                      <button class="pill small danger" type="button" @click="openUserDelete(user)" :disabled="user.id === currentUser?.id">Delete</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- External API Configuration Section (Admin Only) -->
        <div v-if="currentUser?.role === 'full_control'">
          <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">🔌 External API Configuration</h3>
            <p class="muted">Configure external warehouse platform integration (Admin Only - Restricted Access)</p>
          </div>

          <div class="card" style="background: linear-gradient(135deg, rgba(0, 174, 239, 0.03), rgba(0, 45, 98, 0.02)); border: 2px solid rgba(0, 174, 239, 0.15);">
            <div class="form-grid">
              <label style="grid-column: 1 / -1;">
                <span class="input-label">🌐 API Base URL</span>
                <input
                  v-model="apiConfig.baseUrl"
                  type="url"
                  placeholder="https://api.warehouse.com"
                  @input="apiConfigModified = true"
                />
              </label>

              <label style="grid-column: 1 / -1;">
                <span class="input-label">🔑 API Key / Token</span>
                <div style="position: relative;">
                  <input
                    v-model="apiConfig.apiKey"
                    :type="showApiKey ? 'text' : 'password'"
                    placeholder="Enter API key or token"
                    @input="apiConfigModified = true"
                    style="padding-right: 100px;"
                  />
                  <button
                    type="button"
                    class="pill small ghost"
                    @click="showApiKey = !showApiKey"
                    style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%);"
                  >
                    {{ showApiKey ? 'Hide' : 'Show' }}
                  </button>
                </div>
              </label>

              <label>
                <span class="input-label">⏱️ Request Timeout (ms)</span>
                <input
                  v-model.number="apiConfig.timeout"
                  type="number"
                  placeholder="30000"
                  min="1000"
                  max="120000"
                  @input="apiConfigModified = true"
                />
              </label>

              <label>
                <span class="input-label">🌍 Environment</span>
                <select v-model="apiConfig.environment" @change="apiConfigModified = true">
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox / Testing</option>
                </select>
              </label>
            </div>

            <!-- API Status & Actions -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(0, 174, 239, 0.15);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div>
                  <p style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">
                    Status:
                    <span :class="apiConfig.baseUrl && apiConfig.apiKey ? 'tag closed' : 'tag open'">
                      {{ apiConfig.baseUrl && apiConfig.apiKey ? 'Configured' : 'Not Configured' }}
                    </span>
                  </p>
                  <p v-if="apiSyncLog.lastSync" style="font-size: 12px; color: var(--text-muted);">
                    Last Sync: {{ new Date(apiSyncLog.lastSync).toLocaleString() }}
                    <span v-if="apiSyncLog.lastSyncStatus" :style="{ color: apiSyncLog.lastSyncStatus === 'success' ? '#15803d' : '#b91c1c' }">
                      ({{ apiSyncLog.lastSyncStatus }})
                    </span>
                  </p>
                </div>

                <div class="action-group">
                  <button
                    class="pill small ghost"
                    type="button"
                    @click="testApiConnection"
                    :disabled="!apiConfig.baseUrl || !apiConfig.apiKey"
                  >
                    Test Connection
                  </button>
                  <button
                    class="pill small secondary"
                    type="button"
                    @click="triggerApiSync"
                    :disabled="!apiConfig.baseUrl || !apiConfig.apiKey"
                  >
                    Sync Now
                  </button>
                  <button
                    class="pill small"
                    type="button"
                    @click="saveApiConfig"
                    :disabled="!apiConfigModified"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>

            <!-- Sync Logs -->
            <div v-if="apiSyncLog.logs && apiSyncLog.logs.length > 0" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(0, 174, 239, 0.15);">
              <h4 style="font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">📋 Recent Sync Logs</h4>
              <div style="max-height: 200px; overflow-y: auto; background: #f8fafb; border-radius: var(--radius-sm); padding: 12px;">
                <div v-for="(log, index) in apiSyncLog.logs.slice(0, 10)" :key="index" style="font-size: 12px; font-family: monospace; padding: 4px 0; border-bottom: 1px solid #e1e7ef;">
                  <span style="color: #64748b;">{{ new Date(log.timestamp).toLocaleString() }}</span> -
                  <span :style="{ color: log.type === 'error' ? '#dc2626' : log.type === 'success' ? '#15803d' : '#0f172a' }">
                    {{ log.message }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div class="modal" v-show="modals.add">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Manual entry</p>
            <h3>Add package</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="closeModal('add')">&times;</button>
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

    <div class="modal" v-show="modals.view">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Package detail</p>
            <h3>{{ viewPackage?.packageId }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="modals.view = false">&times;</button>
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

    <div class="modal" v-show="orderModals.add">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">SGX Order</p>
            <h3>Add order</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="orderModals.add = false">&times;</button>
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

    <div class="modal" v-show="orderModals.edit">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">SGX Order</p>
            <h3>Edit order</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="orderModals.edit = false">&times;</button>
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

    <div class="modal" v-show="orderModals.delete">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Remove order</p>
            <h3>Delete order</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="orderModals.delete = false">&times;</button>
        </header>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="orderModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="confirmOrderDelete">Delete</button>
        </div>
      </div>
    </div>

    <div class="modal" v-show="modals.collection">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Receipt</p>
            <h3>{{ collectionTitle }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="closeModal('collection')">&times;</button>
        </header>
        <form @submit.prevent="confirmCollection">
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

    <div class="modal" v-show="modals.edit">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Update package</p>
            <h3>{{ editTitle }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="closeModal('edit')">&times;</button>
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

    <div class="modal" v-show="modals.delete">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Remove package</p>
            <h3>{{ deleteTitle }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="closeModal('delete')">&times;</button>
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

    <div class="modal" v-show="userModals.add">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">User management</p>
            <h3>Add new user</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="userModals.add = false">&times;</button>
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

    <div class="modal" v-show="userModals.edit">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">User management</p>
            <h3>Edit user</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="userModals.edit = false">&times;</button>
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

    <div class="modal" v-show="userModals.delete">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">User management</p>
            <h3>Delete user</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="userModals.delete = false">&times;</button>
        </header>
        <div>
          <p class="muted">Are you sure you want to delete {{ userDeleteTarget?.name }}? This action cannot be undone.</p>
        </div>
        <div class="modal-actions">
          <button class="pill ghost" type="button" @click="userModals.delete = false">Cancel</button>
          <button class="pill danger" type="button" @click="confirmUserDelete">Delete user</button>
        </div>
      </div>
    </div>

    <div class="modal" v-show="userModals.permissions">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">User management</p>
            <h3>Configure permissions - {{ permissionTarget?.name }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="userModals.permissions = false">&times;</button>
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
    <div class="modal" v-show="shipmentModals.upload">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Shipment Management</p>
            <h3>Upload Shipment Log</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.upload = false">&times;</button>
        </header>
        <form @submit.prevent="confirmShipmentUpload">
          <p class="muted">Upload a CSV file exported from Google Sheets with columns: Package ID, Customer Name, Alt Name, Tracking Number, Weight</p>
          <div class="form-grid" style="margin-top: 16px;">
            <label>
              <span class="input-label">Shipment Date</span>
              <input v-model="shipmentUploadForm.shipmentDate" type="date" required />
            </label>
            <label>
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
    <div class="modal" v-show="shipmentModals.moveConfirm">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Package Found in Another Log</p>
            <h3>Move Package?</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.moveConfirm = false">&times;</button>
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
    <div class="modal" v-show="shipmentModals.edit">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Shipment Management</p>
            <h3>Edit Shipment Log</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.edit = false">&times;</button>
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
    <div class="modal" v-show="shipmentModals.delete">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Shipment Management</p>
            <h3>Delete Shipment Log</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.delete = false">&times;</button>
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

    <!-- Edit Shipment Item Modal -->
    <div class="modal" v-show="shipmentModals.editItem">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Package Management</p>
            <h3>Edit Package</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.editItem = false">&times;</button>
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
    <div class="modal" v-show="shipmentModals.moveItem">
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Package Management</p>
            <h3>Move Package to Different Shipment</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="shipmentModals.moveItem = false">&times;</button>
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
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Role Management</p>
            <h3>Create New Role</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="roleModals.add = false">&times;</button>
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
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Role Management</p>
            <h3>Edit Role</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="roleModals.edit = false">&times;</button>
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
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Role Management</p>
            <h3>Delete Role</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="roleModals.delete = false">&times;</button>
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
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">Role Management</p>
            <h3>Duplicate Role</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="roleModals.duplicate = false">&times;</button>
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
      <div class="modal-card large">
        <header>
          <div>
            <p class="eyebrow">Permissions Management</p>
            <h3>Manage Permissions for {{ rolePermissionsTarget?.name }}</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="roleModals.permissions = false">&times;</button>
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
      <div class="modal-card">
        <header>
          <div>
            <p class="eyebrow">User Management</p>
            <h3>Reset Password</h3>
          </div>
          <button class="icon-btn" aria-label="Close modal" @click="passwordResetModal = false">&times;</button>
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
  { id: "emp-0", name: "Warren Walker", email: "warren@sgxpress.com", password: "admin123", photo: "", location: "", role: "full_control", customPermissions: null },
  { id: "emp-1", name: "Jordan Lee", email: "jordan@sgxpress.com", password: "pass123", photo: "", location: "", role: "full_control", customPermissions: null },
  { id: "emp-2", name: "Nina Patel", email: "nina@sgxpress.com", password: "pass123", photo: "", location: "", role: "editor", customPermissions: null },
  { id: "emp-3", name: "Carlos Martinez", email: "carlos@sgxpress.com", password: "pass123", photo: "", location: "", role: "view_only", customPermissions: null },
  { id: "emp-4", name: "Amara Jones", email: "amara@sgxpress.com", password: "pass123", photo: "", location: "", role: "view_only", customPermissions: null },
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
const selectedRole = ref(null);
const roleModals = reactive({ add: false, edit: false, delete: false, duplicate: false, permissions: false });
const roleForm = reactive({
  name: "",
  description: "",
});
const roleEditForm = reactive({
  id: "",
  name: "",
  description: "",
});
const roleDeleteTarget = ref(null);
const roleDuplicateTarget = ref(null);
const duplicateRoleName = ref("");
const rolePermissionsTarget = ref(null);
const selectedPermissions = ref([]);

// Settings Page State - User Management
const passwordResetModal = ref(false);
const passwordResetTarget = ref(null);
const newPassword = ref("");

// Settings Page State - API Configuration
const apiConfig = ref({});
const apiSyncLogs = ref([]);
const apiConfigForm = reactive({
  baseUrl: "",
  apiKey: "",
  email: "",
  password: "",
  timeout: 30000,
  environment: "production",
});
const showApiKey = ref(false);
const showApiPassword = ref(false);
const apiTestStatus = ref("");
const apiTestMessage = ref("");

// Settings Page State - Maintenance Mode
const maintenanceMode = ref(false);

// Shipment Bin State
const shipmentLogs = ref([]);
const activeShipmentLogId = ref("");
const shipmentItems = ref([]);
const shipmentFilter = ref("all");
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

const shipmentModals = reactive({ upload: false, moveConfirm: false, edit: false, delete: false, editItem: false, moveItem: false });
const shipmentUploadForm = reactive({
  shipmentDate: new Date().toISOString().split('T')[0],
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
const itemMoveTarget = ref(null);
const itemMoveDestination = ref('');

const shipmentStats = computed(() => {
  const total = shipmentItems.value.length;
  const received = shipmentItems.value.filter(item => item.status === 'received').length;
  const pending = shipmentItems.value.filter(item => item.status === 'pending').length;
  return { total, received, pending, notFound: notFoundCount.value };
});

const filteredShipmentItems = computed(() => {
  let filtered = shipmentItems.value;

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
  if (isAdmin.value) return ["dashboard", "shipment-bin", "orders", "summary", "api", "profile", "settings", "admin"];
  if (currentRole.value === "editor") return ["dashboard", "shipment-bin", "orders", "summary", "profile"];
  return ["dashboard", "shipment-bin", "summary", "profile", "orders"];
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

const formatCurrency = (amount) => `$${Number(amount || 0).toFixed(2)}`;
const latestNote = (pkg) => (pkg.notes?.length ? pkg.notes[pkg.notes.length - 1] : "—");

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

const openUserEdit = (user) => {
  userEditForm.id = user.id;
  userEditForm.name = user.name;
  userEditForm.email = user.email;
  userEditForm.password = "";
  userEditForm.role = user.role;
  userModals.edit = true;
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

const openUserDelete = (user) => {
  userDeleteTarget.value = user;
  userModals.delete = true;
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
      scanMessage.value = '❌ Tracking number not found in any shipment log';
      scanStatus.value = 'error';
      notFoundCount.value += 1;
    } else if (data.status === 'received') {
      // Found and marked as received
      scanMessage.value = `✓ Package received: ${data.item.customer_name}`;
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
      scanMessage.value = `✓ Package moved to current log`;
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
        timeout: apiConfigForm.timeout,
        environment: apiConfigForm.environment,
      }),
    });

    const data = await response.json();
    if (data.success) {
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

onMounted(() => {
  document.addEventListener("click", handleClickAway);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickAway);
});
</script>
