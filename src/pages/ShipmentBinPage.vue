<template>
  <section class="panel full-page" id="shipment-bin">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Shipment Management</p>
        <h2>Shipment Bin</h2>
        <p class="muted">{{ activeLogId ? 'Scan and manage packages in the active shipment log' : 'Select a shipment log to begin scanning' }}</p>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <button v-if="activeLogId" class="pill ghost" type="button" @click="$emit('back-to-logs')">
          ← Back to All Logs
        </button>
        <button v-if="canManageShipments" class="pill" type="button" @click="$emit('open-upload')">
          + Upload New Log
        </button>
        <button v-if="activeLogId && canManageShipments" class="pill" type="button" @click="$emit('edit-log')">
          Edit
        </button>
        <button v-if="activeLogId && canManageShipments" class="pill danger" type="button" @click="$emit('delete-log')">
          Delete Log
        </button>
      </div>
    </div>

    <!-- CARDS VIEW: Show when no active log is selected -->
    <div v-if="!activeLogId && shipmentLogs.length > 0">
      <!-- Global Search Box -->
      <div class="global-search-container">
        <SearchBox
          v-model="globalSearchQuery"
          placeholder="Search all shipment logs by tracking number, package ID, or customer name..."
          :compact="false"
        />
      </div>

      <!-- Show Archived Toggle -->
      <div class="archive-toggle-container">
        <label class="archive-toggle">
          <input type="checkbox" v-model="localShowArchived" />
          <span>Show Archived</span>
        </label>
      </div>

      <!-- Global Search Results -->
      <div v-if="globalSearchQuery.trim().length >= 2 && globalSearchResults.length > 0" class="global-search-results">
        <div class="search-results-header">
          <h3>Search Results ({{ globalSearchResults.length }})</h3>
          <button class="pill ghost small" @click="clearGlobalSearch">Clear Search</button>
        </div>
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Tracking Number</th>
                <th>Customer</th>
                <th>Package ID</th>
                <th>Status</th>
                <th>Shipment Log</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in globalSearchResults" :key="item.id">
                <td><strong>{{ item.tracking_number }}</strong></td>
                <td>{{ item.customer_name }}</td>
                <td>{{ item.package_id || '—' }}</td>
                <td>
                  <span class="tag" :class="{
                    'success': item.status === 'received',
                    'secondary': item.status === 'pending',
                    'danger': item.status === 'not_found'
                  }">
                    {{ item.status === 'received' ? 'Received' : item.status === 'pending' ? 'Pending' : item.status }}
                  </span>
                </td>
                <td>
                  <button class="log-link" @click="$emit('select-log', item.log_id)">
                    {{ item.shipment_log_name || 'Unknown Log' }}
                  </button>
                </td>
                <td>
                  <button class="pill small" @click="$emit('select-log', item.log_id)">View in Log</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No Results Message -->
      <div v-else-if="globalSearchQuery.trim().length >= 2 && globalSearchResults.length === 0 && !isSearching" class="empty-search-results">
        <p class="muted">No packages found matching "{{ globalSearchQuery }}"</p>
      </div>

      <!-- Searching indicator -->
      <div v-else-if="isSearching" class="searching-indicator">
        <p class="muted">Searching...</p>
      </div>

      <!-- Shipment Logs Grid (hide when showing search results) -->
      <div v-if="!globalSearchQuery.trim() || globalSearchQuery.trim().length < 2" style="margin-top: 20px;">
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
          {{ localShowArchived ? 'Archived Shipment Logs' : 'All Shipment Logs' }}
        </h3>
        <p class="muted">{{ localShowArchived ? 'Viewing archived logs' : 'Click on a log to start scanning packages' }}</p>
      </div>

      <div v-if="!globalSearchQuery.trim() || globalSearchQuery.trim().length < 2" class="shipment-logs-grid">
        <div
          v-for="log in shipmentLogs"
          :key="log.id"
          class="card clickable-card"
          :class="{ 'archived-card': log.archived }"
          @click="$emit('select-log', log.id)"
        >
          <div class="log-card-header">
            <h4>{{ log.log_name }}</h4>
            <div class="log-header-badges">
              <span v-if="log.archived" class="log-archived-badge">Archived</span>
              <span class="log-cargo-badge">{{ log.cargo_type || 'Air Cargo' }}</span>
            </div>
          </div>
          <div class="log-card-divider"></div>
          <div class="log-card-count">{{ getLogItemCount(log.id) }}</div>
          <p class="log-card-date">Shipment date: {{ log.shipment_date }}</p>
          <p class="log-card-uploaded">
            Uploaded by <span class="bold">{{ log.uploaded_by || 'Unknown' }}</span>
          </p>
          <!-- Archive/Unarchive Button -->
          <div v-if="canManageShipments" class="log-card-actions" @click.stop>
            <button
              v-if="!log.archived"
              class="pill small ghost"
              @click="$emit('archive-log', log.id)"
            >
              Archive
            </button>
            <button
              v-else
              class="pill small"
              @click="$emit('unarchive-log', log.id)"
            >
              Unarchive
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ACTIVE LOG VIEW: Show when a log is selected -->
    <div v-if="activeLogId">
      <!-- Shipment Log Header with Details -->
      <div class="shipment-header-card">
        <h2>{{ activeLog?.log_name || 'Shipment Log' }}</h2>
        <div class="shipment-header-meta">
          <span>{{ activeLog?.shipment_date }}</span>
          <span>{{ activeLog?.uploaded_by || 'Unknown' }}</span>
          <span>{{ activeLog?.cargo_type || 'Air Cargo' }}</span>
        </div>
      </div>

      <!-- Two-Column Layout: Scan Card (Left) + Shipment Info (Right) -->
      <div class="shipment-controls-grid">
        <!-- Scan Card -->
        <div class="card scan-card" :class="{ 'disabled-card': !canScan }">
          <h3>Scan Tracking Numbers</h3>
          <p class="muted">Scan tracking number or press Enter...</p>
          <input
            ref="scanInput"
            v-model="localScanInput"
            @keydown.enter="$emit('scan-package', localScanInput)"
            type="text"
            placeholder="Scan or enter tracking number..."
            :disabled="!canScan"
          />
          <button class="pill" type="button" @click="$emit('scan-package', localScanInput)" :disabled="!canScan">
            Scan Package
          </button>
          <p v-if="scanMessage" :class="{'muted': scanStatus === 'info', 'error-text': scanStatus === 'error'}" class="scan-message">
            {{ scanMessage }}
          </p>
        </div>

        <!-- Shipment Info Card -->
        <div class="card info-card">
          <h3>Shipment Info</h3>
          <div class="shipment-stats-grid">
            <div class="stat-box">
              <p class="muted">Total Packages</p>
              <h2 class="stat-value blue">{{ stats.total }}</h2>
            </div>
            <div class="stat-box">
              <p class="muted">Packages Received</p>
              <h2 class="stat-value green">{{ stats.received }}</h2>
            </div>
            <div class="stat-box">
              <p class="muted">Verification Pending</p>
              <h2 class="stat-value yellow">{{ stats.pending }}</h2>
            </div>
            <div class="stat-box">
              <p class="muted"># of Couriers</p>
              <h2 class="stat-value blue">{{ stats.couriers }}</h2>
            </div>
          </div>
        </div>
      </div>

      <!-- Package Table Section -->
      <div v-if="shipmentItems.length > 0" class="shipment-table-section">
        <h3>Shipment Data by Courier</h3>

        <!-- Search and Filters -->
        <div class="shipment-filters">
          <SearchBox
            v-model="localSearchQuery"
            placeholder="Search by ID, Customer Name, or Tracking Number..."
            :style="{ width: '100%' }"
          />
          <select v-model="localCourierFilter" class="filter-select">
            <option value="">All Couriers</option>
            <option v-for="courier in uniqueCouriers" :key="courier" :value="courier">{{ courier }}</option>
          </select>
          <select v-model="localStatusFilter" class="filter-select">
            <option value="all">All Status</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="not_found">Not Found</option>
          </select>
        </div>

        <!-- Add Package Button -->
        <div class="shipment-table-header">
          <h4>Package List</h4>
          <button v-if="canManageShipments" class="pill" type="button" @click="$emit('add-item')">
            + Add Package
          </button>
        </div>

        <!-- Table -->
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th @click="$emit('sort', 'package_id')" class="sortable">
                  ID <span v-if="sortColumn === 'package_id'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="$emit('sort', 'code')" class="sortable">
                  Code <span v-if="sortColumn === 'code'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="$emit('sort', 'customer_name')" class="sortable">
                  Customer <span v-if="sortColumn === 'customer_name'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Alt Name</th>
                <th @click="$emit('sort', 'tracking_number')" class="sortable">
                  Tracking <span v-if="sortColumn === 'tracking_number'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th>Weight</th>
                <th>Description</th>
                <th @click="$emit('sort', 'status')" class="sortable">
                  Status <span v-if="sortColumn === 'status'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th v-if="canEditItems || canMoveItems">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.id">
                <td>{{ item.package_id || item.id }}</td>
                <td>
                  <span class="tag courier-tag">{{ item.code || item.courier_code || 'RSC' }}</span>
                </td>
                <td>{{ item.customer_name }}</td>
                <td>{{ item.alt_name }}</td>
                <td><strong>{{ item.tracking_number }}</strong></td>
                <td>{{ item.weight ? item.weight + ' lb' : '' }}</td>
                <td>{{ item.description }}</td>
                <td>
                  <select
                    v-if="canEditItems"
                    :value="item.status"
                    @change="$emit('update-status', item.id, $event.target.value)"
                    class="status-select"
                    :class="getStatusClass(item.status)"
                  >
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="not_found">Not Found</option>
                  </select>
                  <StatusTag v-else :status="item.status">
                    {{ item.status === 'received' ? 'Received' : item.status === 'pending' ? 'Pending' : 'Not Found' }}
                  </StatusTag>
                </td>
                <td v-if="canEditItems || canMoveItems">
                  <KebabMenu v-model="kebabOpen[item.id]">
                    <button v-if="canEditItems" @click="$emit('edit-item', item); kebabOpen[item.id] = false">Edit</button>
                    <button v-if="canMoveItems" @click="$emit('move-item', item); kebabOpen[item.id] = false">Move</button>
                    <button v-if="canManageShipments" class="danger" @click="$emit('delete-item', item); kebabOpen[item.id] = false">Delete</button>
                  </KebabMenu>
                </td>
              </tr>
              <tr v-if="filteredItems.length === 0" class="empty">
                <td colspan="9">No packages found</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="shipmentLogs.length === 0" class="card empty-state">
      <p class="muted">No shipment logs found. Upload a shipment log to get started.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { SearchBox, StatusTag, KebabMenu } from '@/components';

const props = defineProps({
  shipmentLogs: {
    type: Array,
    default: () => []
  },
  shipmentItems: {
    type: Array,
    default: () => []
  },
  activeLogId: {
    type: [String, Number, null],
    default: null
  },
  stats: {
    type: Object,
    default: () => ({ total: 0, received: 0, pending: 0, couriers: 0 })
  },
  scanMessage: {
    type: String,
    default: ''
  },
  scanStatus: {
    type: String,
    default: 'info'
  },
  sortColumn: {
    type: String,
    default: ''
  },
  sortDirection: {
    type: String,
    default: 'asc'
  },
  canManageShipments: {
    type: Boolean,
    default: false
  },
  canScan: {
    type: Boolean,
    default: false
  },
  canEditItems: {
    type: Boolean,
    default: false
  },
  canMoveItems: {
    type: Boolean,
    default: false
  },
  searchQuery: {
    type: String,
    default: ''
  },
  courierFilter: {
    type: String,
    default: ''
  },
  statusFilter: {
    type: String,
    default: 'all'
  },
  showArchived: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'select-log',
  'back-to-logs',
  'open-upload',
  'edit-log',
  'delete-log',
  'scan-package',
  'add-item',
  'edit-item',
  'move-item',
  'delete-item',
  'update-status',
  'sort',
  'update:searchQuery',
  'update:courierFilter',
  'update:statusFilter',
  'update:showArchived',
  'archive-log',
  'unarchive-log'
]);

const kebabOpen = reactive({});
const localScanInput = ref('');
const localSearchQuery = ref(props.searchQuery);
const localCourierFilter = ref(props.courierFilter);
const localStatusFilter = ref(props.statusFilter);
const localShowArchived = ref(props.showArchived);

// Global search state
const globalSearchQuery = ref('');
const globalSearchResults = ref([]);
const isSearching = ref(false);
let searchTimeout = null;

watch(localSearchQuery, (val) => emit('update:searchQuery', val));
watch(localCourierFilter, (val) => emit('update:courierFilter', val));
watch(localStatusFilter, (val) => emit('update:statusFilter', val));
watch(localShowArchived, (val) => emit('update:showArchived', val));

// Watch global search query with debounce
watch(globalSearchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout);

  if (!val || val.trim().length < 2) {
    globalSearchResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/shipment-items/search?q=${encodeURIComponent(val.trim())}`);
      const data = await response.json();
      if (data.success) {
        globalSearchResults.value = data.items;
      }
    } catch (error) {
      console.error('Global search failed:', error);
    } finally {
      isSearching.value = false;
    }
  }, 300);
});

const clearGlobalSearch = () => {
  globalSearchQuery.value = '';
  globalSearchResults.value = [];
};

const activeLog = computed(() => {
  return props.shipmentLogs.find(l => l.id === props.activeLogId);
});

const uniqueCouriers = computed(() => {
  const couriers = new Set();
  props.shipmentItems.forEach(item => {
    if (item.code || item.courier_code) {
      couriers.add(item.code || item.courier_code);
    }
  });
  return Array.from(couriers).sort();
});

const filteredItems = computed(() => {
  let items = props.shipmentItems;

  if (localSearchQuery.value.trim()) {
    const query = localSearchQuery.value.toLowerCase();
    items = items.filter(item =>
      (item.customer_name || '').toLowerCase().includes(query) ||
      (item.tracking_number || '').toLowerCase().includes(query) ||
      (item.package_id || '').toString().toLowerCase().includes(query)
    );
  }

  if (localCourierFilter.value) {
    items = items.filter(item =>
      (item.code || item.courier_code) === localCourierFilter.value
    );
  }

  if (localStatusFilter.value !== 'all') {
    items = items.filter(item => item.status === localStatusFilter.value);
  }

  return items;
});

const getLogItemCount = (logId) => {
  // This should be provided by parent or computed from items
  return props.shipmentItems.filter(item => item.shipment_log_id === logId).length;
};

const getStatusClass = (status) => {
  if (status === 'received') return 'status-received';
  if (status === 'pending') return 'status-pending';
  return 'status-not-found';
};
</script>

<style scoped>
.shipment-logs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.log-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.log-card-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #4b5563;
}

.log-cargo-badge {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
}

.log-card-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 20px;
}

.log-card-count {
  font-size: 48px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 8px;
}

.log-card-date {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 20px;
}

.log-card-uploaded {
  font-size: 13px;
  color: #6b7280;
}

.log-card-uploaded .bold {
  font-weight: 600;
  color: #374151;
}

.shipment-header-card {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #002d62 0%, #00aeef 100%);
  color: white;
  border-radius: 12px;
}

.shipment-header-card h2 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  color: white;
}

.shipment-header-meta {
  display: flex;
  gap: 24px;
  font-size: 14px;
  opacity: 0.95;
}

.shipment-controls-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.scan-card {
  padding: 24px;
  border: 2px dashed #cbd5e1;
}

.scan-card h3,
.info-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--text-main);
}

.scan-card input {
  font-size: 15px;
  padding: 14px;
  width: 100%;
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}

.scan-card button {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
}

.scan-message {
  margin-top: 12px;
  font-weight: 600;
  text-align: center;
}

.info-card {
  padding: 24px;
  border: 2px solid #fbbf24;
}

.shipment-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-box {
  text-align: center;
  padding: 16px;
  background: #f8f9fb;
  border-radius: 8px;
}

.stat-box .muted {
  font-size: 12px;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
}

.stat-value.blue { color: var(--sgx-blue); }
.stat-value.green { color: #10b981; }
.stat-value.yellow { color: #f59e0b; }

.shipment-table-section h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 16px;
}

.shipment-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  background: white;
}

.shipment-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.shipment-table-header h4 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.courier-tag {
  background: var(--sgx-blue);
  color: white;
  font-weight: 600;
}

.status-select {
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  min-width: 140px;
}

.status-received { background-color: #10b981; }
.status-pending { background-color: #eab308; }
.status-not-found { background-color: #ef4444; }

.empty-state {
  text-align: center;
  padding: 40px 0;
}

/* Global Search Styles */
.global-search-container {
  margin-bottom: 24px;
}

.global-search-results {
  margin-bottom: 24px;
}

.search-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.search-results-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-main);
}

.empty-search-results,
.searching-indicator {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.log-link {
  background: none;
  border: none;
  color: var(--sgx-blue);
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
}

.log-link:hover {
  color: var(--sgx-dark);
}

/* Archive Toggle Styles */
.archive-toggle-container {
  margin-bottom: 16px;
}

.archive-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted);
}

.archive-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.archive-toggle span {
  user-select: none;
}

/* Archived Card Styles */
.archived-card {
  opacity: 0.7;
  border: 2px dashed #9ca3af !important;
}

.log-header-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.log-archived-badge {
  background: #9ca3af;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.log-card-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.log-card-actions button {
  width: 100%;
}
</style>
