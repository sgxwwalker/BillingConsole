<template>
  <!-- Customer Details Modal -->
  <BaseModal
    v-model="showDetailsModal"
    title="Customer Details"
    :subtitle="selectedCustomer?.email"
    size="large"
  >
    <div v-if="selectedCustomer" class="customer-details">
      <div class="details-grid">
        <div class="detail-item">
          <label>User ID</label>
          <span class="customer-id">{{ selectedCustomer.id }}</span>
        </div>
        <div class="detail-item">
          <label>Email</label>
          <span>{{ selectedCustomer.email }}</span>
        </div>
        <div class="detail-item">
          <label>First Name</label>
          <span>{{ selectedCustomer.first_name || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Last Name</label>
          <span>{{ selectedCustomer.last_name || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Phone</label>
          <span>{{ selectedCustomer.phone || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Company Name</label>
          <span>{{ selectedCustomer.company?.name || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Company Code</label>
          <span>{{ selectedCustomer.company?.code || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Address</label>
          <span>{{ selectedCustomer.address || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>City</label>
          <span>{{ selectedCustomer.city || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>State</label>
          <span>{{ selectedCustomer.state || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Postal Code</label>
          <span>{{ selectedCustomer.postal_code || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Country</label>
          <span>{{ selectedCustomer.country || 'N/A' }}</span>
        </div>
        <div class="detail-item">
          <label>Created At</label>
          <span>{{ formatDate(selectedCustomer.created_at) }}</span>
        </div>
        <div class="detail-item">
          <label>Updated At</label>
          <span>{{ formatDate(selectedCustomer.updated_at) }}</span>
        </div>
      </div>
    </div>
  </BaseModal>

  <!-- Customers Page View -->
  <section class="panel full-page" id="customers">
    <!-- Header -->
    <div class="customers-header">
      <div>
        <h1>Customers</h1>
        <p class="muted">Manage customers from CDJ SaaS API</p>
      </div>
      <div class="header-actions">
        <div class="company-filter">
          <label>Company Code:</label>
          <input
            v-model="companyCode"
            type="text"
            placeholder="Enter code (e.g., RSC)"
            class="company-input"
            @keyup.enter="fetchCustomers"
          />
          <button class="pill" @click="fetchCustomers" :disabled="loading">
            {{ loading ? 'Loading...' : 'Fetch Customers' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div v-if="customers.length > 0" class="search-bar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search customers by email, name, phone, address..."
        class="search-input"
      />
      <span v-if="searchQuery" class="search-results">{{ filteredCustomers.length }} of {{ customers.length }} customers</span>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="filteredCustomers.length > 0">
      <div class="stat-card">
        <div class="stat-value">{{ filteredCustomers.length }}</div>
        <div class="stat-label">Total Customers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.withPhone }}</div>
        <div class="stat-label">With Phone</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.withAddress }}</div>
        <div class="stat-label">With Address</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.uniqueCompanies }}</div>
        <div class="stat-label">Unique Companies</div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <p>Loading customers...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="pill" @click="fetchCustomers">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && customers.length === 0" class="empty-state">
      <p>No customers found. Enter a company code and click "Fetch Customers".</p>
    </div>

    <!-- Customers Table -->
    <div v-if="!loading && !error && filteredCustomers.length > 0" class="table-container">
      <table class="customers-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Address</th>
            <th>City</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in filteredCustomers" :key="customer.id">
            <td>
              <span class="customer-id-link" @click="viewCustomerDetails(customer)">
                {{ customer.id.substring(0, 8) }}
              </span>
            </td>
            <td>
              <span class="email-link" @click="viewCustomerDetails(customer)">
                {{ customer.email }}
              </span>
            </td>
            <td>{{ customer.first_name }} {{ customer.last_name }}</td>
            <td>{{ customer.phone || 'N/A' }}</td>
            <td>
              <span class="company-badge" v-if="customer.company">
                {{ customer.company.code }}
              </span>
              <span v-else>N/A</span>
            </td>
            <td>{{ customer.address || 'N/A' }}</td>
            <td>{{ customer.city || 'N/A' }}</td>
            <td>{{ formatDate(customer.created_at) }}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon" @click="viewCustomerDetails(customer)" title="View Details">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';
import BaseModal from '../components/BaseModal.vue';

const { get } = useApi();
const { showToast } = useToast();

// State
const companyCode = ref('RSC');
const customers = ref([]);
const loading = ref(false);
const error = ref(null);
const apiConfig = ref(null);
const accessToken = ref(null);
const showDetailsModal = ref(false);
const selectedCustomer = ref(null);
const searchQuery = ref('');

// Filtered customers based on search query
const filteredCustomers = computed(() => {
  if (!searchQuery.value.trim()) {
    return customers.value;
  }

  const query = searchQuery.value.toLowerCase();
  return customers.value.filter(customer => {
    return (
      customer.email?.toLowerCase().includes(query) ||
      customer.id?.toLowerCase().includes(query) ||
      customer.first_name?.toLowerCase().includes(query) ||
      customer.last_name?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query) ||
      customer.address?.toLowerCase().includes(query) ||
      customer.city?.toLowerCase().includes(query) ||
      customer.state?.toLowerCase().includes(query) ||
      customer.postal_code?.toLowerCase().includes(query) ||
      customer.company?.name?.toLowerCase().includes(query) ||
      customer.company?.code?.toLowerCase().includes(query)
    );
  });
});

// Stats computed (based on filtered customers)
const stats = computed(() => {
  const uniqueCompanies = new Set(
    filteredCustomers.value
      .filter(c => c.company?.name)
      .map(c => c.company.name)
  ).size;

  return {
    withPhone: filteredCustomers.value.filter(c => c.phone).length,
    withAddress: filteredCustomers.value.filter(c => c.address).length,
    uniqueCompanies
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

    // Auto-fetch customers with default company code
    if (accessToken.value) {
      await fetchCustomers();
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

// Fetch customers by company code
const fetchCustomers = async () => {
  if (!companyCode.value.trim()) {
    showToast('Please enter a company code', 'error');
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    // Fetch packages to extract user data
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

      // Extract unique users from packages filtered by company code
      const userMap = new Map();
      allPackages.forEach(pkg => {
        if (pkg.user && pkg.user.company?.code === companyCode.value.toUpperCase()) {
          // Use email as unique identifier
          if (!userMap.has(pkg.user.email)) {
            userMap.set(pkg.user.email, pkg.user);
          }
        }
      });

      customers.value = Array.from(userMap.values());

      showToast(`Loaded ${customers.value.length} customers for ${companyCode.value}`, 'success');
    } else if (response.status === 401) {
      // Try re-authentication on 401
      await authenticate();
      if (accessToken.value) {
        await fetchCustomers();
      }
    } else {
      throw new Error('Failed to fetch customers');
    }
  } catch (err) {
    console.error('Error fetching customers:', err);
    error.value = 'Failed to fetch customers';
    showToast('Failed to fetch customers', 'error');
  } finally {
    loading.value = false;
  }
};

// View customer details
const viewCustomerDetails = (customer) => {
  selectedCustomer.value = customer;
  showDetailsModal.value = true;
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};
</script>

<style scoped>
.customers-header {
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

.customers-table {
  width: 100%;
  border-collapse: collapse;
}

.customers-table th {
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

.customers-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #1e293b;
}

.customers-table tbody tr:hover {
  background: #f8fafc;
}

.customer-id {
  font-family: monospace;
  font-size: 12px;
  color: #64748b;
}

.customer-id-link {
  font-family: monospace;
  font-size: 12px;
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.customer-id-link:hover {
  color: #2563eb;
}

.email-link {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
}

.email-link:hover {
  color: #2563eb;
}

.company-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
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

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
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

.customer-details {
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

@media (max-width: 768px) {
  .customers-header {
    flex-direction: column;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
