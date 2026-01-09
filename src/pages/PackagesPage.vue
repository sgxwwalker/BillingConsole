<template>
  <!-- Invoice Page View -->
  <InvoicePage
    v-if="showInvoicePage"
    :packageId="invoicePackageId"
    @back="handleBackFromInvoice"
  />

  <!-- Packages Page View -->
  <section v-else class="panel full-page" id="packages">
    <!-- Header -->
    <div class="packages-header">
      <div>
        <h1>Packages</h1>
        <p class="muted">Manage packages from CDJ SaaS API</p>
      </div>
      <div class="header-actions">
        <div class="company-filter">
          <label>Company Code:</label>
          <input
            v-model="companyCode"
            type="text"
            placeholder="Enter code (e.g., RSC)"
            class="company-input"
            @keyup.enter="fetchPackages"
          />
          <button class="pill" @click="fetchPackages" :disabled="loading">
            {{ loading ? 'Loading...' : 'Fetch Packages' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div v-if="packages.length > 0" class="search-bar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search packages by tracking number, customer, description, status..."
        class="search-input"
      />
      <span v-if="searchQuery" class="search-results">{{ filteredPackages.length }} of {{ packages.length }} packages</span>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="filteredPackages.length > 0">
      <div class="stat-card">
        <div class="stat-value">{{ filteredPackages.length }}</div>
        <div class="stat-label">Total Packages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.atWarehouse }}</div>
        <div class="stat-label">At Warehouse</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.inTransit }}</div>
        <div class="stat-label">In Transit</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.delivered }}</div>
        <div class="stat-label">Delivered</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalWeight.toFixed(2) }}</div>
        <div class="stat-label">Total Weight (lb)</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p>Loading packages...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="pill" @click="fetchPackages">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && packages.length === 0" class="empty-state">
      <p>No packages found. Enter a company code and click "Fetch Packages".</p>
    </div>

    <!-- Packages Table -->
    <div v-if="!loading && !error && filteredPackages.length > 0" class="table-container">
      <table class="packages-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tracking Number</th>
            <th>Customer</th>
            <th>Description</th>
            <th>Weight (lb)</th>
            <th>Status</th>
            <th>Package Type</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pkg in filteredPackages" :key="pkg.id">
            <td><span class="package-id">{{ pkg.id.substring(0, 8) }}</span></td>
            <td>
              <span class="tracking-link" @click="viewPackageDetails(pkg)">
                {{ pkg.tracking_number }}
              </span>
            </td>
            <td>{{ pkg.user?.email || 'N/A' }}</td>
            <td>{{ pkg.description || 'N/A' }}</td>
            <td>{{ pkg.weight || 0 }}</td>
            <td>
              <select
                :value="pkg.status_id"
                @change="updatePackageStatus(pkg, $event.target.value)"
                class="status-select"
                :class="'status-' + getStatusColor(pkg.status)"
              >
                <option v-for="status in availableStatuses" :key="status.id" :value="status.id">
                  {{ status.name }}
                </option>
              </select>
            </td>
            <td><span class="package-type">{{ pkg.package_type }}</span></td>
            <td>{{ formatDate(pkg.created_at) }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon" @click="viewPackageDetails(pkg)" title="View Details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button class="btn-icon" @click="invoicePackage(pkg)" title="Invoice Package">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Package Details Modal -->
    <BaseModal
      v-model="showDetailsModal"
      title="Package Details"
      :subtitle="selectedPackage?.tracking_number"
      size="large"
    >
      <div v-if="selectedPackage" class="package-details">
        <div class="details-grid">
          <div class="detail-item">
            <label>Package ID</label>
            <span>{{ selectedPackage.id }}</span>
          </div>
          <div class="detail-item">
            <label>Tracking Number</label>
            <span>{{ selectedPackage.tracking_number }}</span>
          </div>
          <div class="detail-item">
            <label>Customer Email</label>
            <span>{{ selectedPackage.user?.email || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <label>Customer Name</label>
            <span>{{ selectedPackage.user?.first_name }} {{ selectedPackage.user?.last_name }}</span>
          </div>
          <div class="detail-item">
            <label>Company</label>
            <span>{{ selectedPackage.user?.company?.name || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <label>Company Code</label>
            <span>{{ selectedPackage.user?.company?.code || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <label>Description</label>
            <span>{{ selectedPackage.description || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <label>Seller Name</label>
            <span>{{ selectedPackage.seller_name || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <label>Weight</label>
            <span>{{ selectedPackage.weight }} lb</span>
          </div>
          <div class="detail-item">
            <label>Value</label>
            <span>${{ selectedPackage.value }}</span>
          </div>
          <div class="detail-item">
            <label>Dimensions</label>
            <span>{{ selectedPackage.length }} × {{ selectedPackage.width }} × {{ selectedPackage.height }}</span>
          </div>
          <div class="detail-item">
            <label>Package Type</label>
            <span>{{ selectedPackage.package_type }}</span>
          </div>
          <div class="detail-item">
            <label>Origin</label>
            <span>{{ selectedPackage.origin }}</span>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <span class="status-badge" :class="'status-' + getStatusColor(selectedPackage.status)">
              {{ selectedPackage.status?.name || 'Unknown' }}
            </span>
          </div>
          <div class="detail-item">
            <label>Package Received</label>
            <span>{{ selectedPackage.package_received ? 'Yes' : 'No' }}</span>
          </div>
          <div class="detail-item">
            <label>Paid</label>
            <span>{{ selectedPackage.paid ? 'Yes' : 'No' }}</span>
          </div>
          <div class="detail-item">
            <label>Created At</label>
            <span>{{ formatDate(selectedPackage.created_at) }}</span>
          </div>
          <div class="detail-item">
            <label>Updated At</label>
            <span>{{ formatDate(selectedPackage.updated_at) }}</span>
          </div>
        </div>
      </div>
    </BaseModal>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import BaseModal from '../components/BaseModal.vue';
import InvoicePage from './InvoicePage.vue';

const { get } = useApi();
const { showToast } = useToast();

// State
const companyCode = ref('RSC');
const packages = ref([]);
const availableStatuses = ref([]);
const loading = ref(false);
const error = ref(null);
const apiConfig = ref(null);
const accessToken = ref(null);
const showDetailsModal = ref(false);
const selectedPackage = ref(null);
const searchQuery = ref('');
const showInvoicePage = ref(false);
const invoicePackageId = ref(null);

// Filtered packages based on search query
const filteredPackages = computed(() => {
  if (!searchQuery.value.trim()) {
    return packages.value;
  }

  const query = searchQuery.value.toLowerCase();
  return packages.value.filter(pkg => {
    return (
      pkg.tracking_number?.toLowerCase().includes(query) ||
      pkg.id?.toLowerCase().includes(query) ||
      pkg.user?.email?.toLowerCase().includes(query) ||
      pkg.user?.first_name?.toLowerCase().includes(query) ||
      pkg.user?.last_name?.toLowerCase().includes(query) ||
      pkg.description?.toLowerCase().includes(query) ||
      pkg.status?.name?.toLowerCase().includes(query) ||
      pkg.package_type?.toLowerCase().includes(query) ||
      pkg.seller_name?.toLowerCase().includes(query) ||
      pkg.origin?.toLowerCase().includes(query)
    );
  });
});

// Stats computed (based on filtered packages)
const stats = computed(() => {
  return {
    atWarehouse: filteredPackages.value.filter(p => p.status?.name?.toLowerCase().includes('warehouse')).length,
    pending: filteredPackages.value.filter(p => p.status?.name?.toLowerCase().includes('pending')).length,
    inTransit: filteredPackages.value.filter(p => p.status?.name?.toLowerCase().includes('transit')).length,
    delivered: filteredPackages.value.filter(p => p.status?.name?.toLowerCase().includes('delivered')).length,
    totalWeight: filteredPackages.value.reduce((sum, p) => sum + (p.weight || 0), 0)
  };
});

// Initialize on mount
onMounted(async () => {
  await initializeAPI();
});

// Initialize API connection
const initializeAPI = async () => {
  try {
    // Get API config
    const configResponse = await get('/api/settings/api-config');
    if (!configResponse.success || !configResponse.config) {
      error.value = 'API configuration not found';
      return;
    }
    apiConfig.value = configResponse.config;

    // Authenticate
    await authenticate();

    // Auto-fetch packages with default company code
    if (accessToken.value) {
      await fetchPackages();
    }
  } catch (err) {
    console.error('Error initializing API:', err);
    error.value = 'Failed to initialize API connection';
  }
};

// Authenticate with CDJ SaaS API (via CORS proxy)
const authenticate = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/cdj-proxy/api/v1/auth/server-login', {
      method: 'POST',
      headers: {
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: apiConfig.value.email,
        password: 'admin123',
        server_secret: 'N9Y26AK51tAZYMMhyytCSiR9BfmdKRGnlICFAxj3whE'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Auth response:', data);
      if (data.data?.access_token) {
        accessToken.value = data.data.access_token;
      } else {
        console.error('Response data:', data);
        throw new Error('No access token in response');
      }
    } else {
      const errorText = await response.text();
      console.error('Auth failed:', response.status, errorText);
      throw new Error(`Authentication failed: ${response.status}`);
    }
  } catch (err) {
    console.error('Authentication error:', err);
    showToast('Failed to authenticate with API', 'error');
    throw err;
  }
};

// Extract unique statuses from packages
const extractStatuses = () => {
  const statusMap = new Map();
  packages.value.forEach(pkg => {
    if (pkg.status && pkg.status.id) {
      statusMap.set(pkg.status.id, pkg.status);
    }
  });
  availableStatuses.value = Array.from(statusMap.values()).sort((a, b) =>
    (a.order || 0) - (b.order || 0)
  );
};

// Fetch packages by company code
const fetchPackages = async () => {
  if (!companyCode.value.trim()) {
    showToast('Please enter a company code', 'error');
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch('http://localhost:4000/api/cdj-proxy/api/v1/packages', {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();

      // The response structure is { success, data: [...packages], message }
      const allPackages = result.data || [];

      // Filter packages by company code
      packages.value = allPackages.filter(pkg =>
        pkg.user?.company?.code === companyCode.value.toUpperCase()
      );

      // Extract unique statuses from packages
      extractStatuses();

      showToast(`Loaded ${packages.value.length} packages for ${companyCode.value}`, 'success');
    } else if (response.status === 401) {
      // Try re-authentication on 401
      await authenticate();
      if (accessToken.value) {
        await fetchPackages();
      }
    } else {
      throw new Error('Failed to fetch packages');
    }
  } catch (err) {
    console.error('Error fetching packages:', err);
    error.value = 'Failed to fetch packages';
    showToast('Failed to fetch packages', 'error');
  } finally {
    loading.value = false;
  }
};

// Update package status
const updatePackageStatus = async (pkg, newStatusId) => {
  try {
    // TODO: Make API call to update package status
    // For now, update locally and show message
    const newStatus = availableStatuses.value.find(s => s.id === newStatusId);
    if (newStatus) {
      pkg.status_id = newStatusId;
      pkg.status = newStatus;
      showToast(`Status updated to "${newStatus.name}" (API integration needed)`, 'info');
    }
  } catch (err) {
    console.error('Error updating package status:', err);
    showToast('Failed to update package status', 'error');
  }
};

// Invoice package
const invoicePackage = async (pkg) => {
  invoicePackageId.value = pkg.id;
  showInvoicePage.value = true;
};

// Handle back from invoice
const handleBackFromInvoice = () => {
  showInvoicePage.value = false;
  invoicePackageId.value = null;
  // Optionally refresh packages
  fetchPackages();
};

// View package details
const viewPackageDetails = (pkg) => {
  selectedPackage.value = pkg;
  showDetailsModal.value = true;
};

// Get status color based on status name
const getStatusColor = (status) => {
  if (!status?.name) return 'default';
  const name = status.name.toLowerCase();
  if (name.includes('delivered')) return 'success';
  if (name.includes('transit')) return 'warning';
  if (name.includes('warehouse')) return 'info';
  if (name.includes('pending')) return 'pending';
  return 'default';
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
</script>

<style scoped>
.packages-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.company-filter {
  display: flex;
  gap: 8px;
  align-items: center;
}

.company-filter label {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.company-input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  width: 180px;
}

.company-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.error-state {
  color: #dc2626;
}

.table-container {
  overflow-x: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.packages-table {
  width: 100%;
  border-collapse: collapse;
}

.packages-table th {
  background: #f8fafc;
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.packages-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #1e293b;
}

.packages-table tbody tr:hover {
  background: #f8fafc;
}

.package-id {
  font-family: monospace;
  font-size: 12px;
  color: #64748b;
}

.tracking-link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.tracking-link:hover {
  color: #2563eb;
}

.search-bar {
  position: relative;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  flex: 1;
  padding: 12px 12px 12px 44px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-results {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
  font-weight: 500;
}

.status-select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
  min-width: 140px;
}

.status-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.status-select:hover {
  border-color: #cbd5e1;
}

.status-select.status-success {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

.status-select.status-warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.status-select.status-info {
  background: #dbeafe;
  color: #1e40af;
  border-color: #93c5fd;
}

.status-select.status-pending {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.status-select.status-default {
  background: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
}

.package-type {
  display: inline-block;
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.package-details {
  padding: 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  font-size: 14px;
  color: #1e293b;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 12px;
}

.status-success {
  background: #dcfce7;
  color: #166534;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-info {
  background: #dbeafe;
  color: #1e40af;
}

.status-pending {
  background: #f3f4f6;
  color: #374151;
}

.status-default {
  background: #f1f5f9;
  color: #475569;
}

@media (max-width: 768px) {
  .packages-header {
    flex-direction: column;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
