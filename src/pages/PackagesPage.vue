<template>
  <section class="panel full-page" id="packages">
    <div class="packages-header">
      <div class="packages-header-content">
        <div>
          <h1 class="packages-title">Packages</h1>
          <p class="packages-subtitle">Packages synced with Courier Depot API</p>
        </div>
        <div class="packages-actions">
          <button class="pill ghost" @click="$emit('sync-packages')" :disabled="isSyncing">
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
          <p class="packages-card-value">{{ isConnected ? 'Connected to Courier Depot' : 'Not Connected' }}</p>
          <p class="packages-card-meta">{{ apiBaseUrl || 'https://api.courierdepotja.com' }}</p>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="packages-card">
        <div class="packages-stat">
          <p class="packages-stat-value">{{ packages.length }}</p>
          <p class="packages-stat-label">Total Packages</p>
        </div>
      </div>

      <div class="packages-card">
        <div class="packages-stat">
          <p class="packages-stat-value packages-stat-success">{{ syncedCount }}</p>
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
        v-model="localSearchQuery"
        type="text"
        class="packages-search"
        placeholder="Search by tracking, customer, or code..."
      />
      <div class="packages-filters">
        <button
          v-for="filter in packageFilters"
          :key="filter.key"
          class="packages-filter-btn"
          :class="{ active: activeFilter === filter.key }"
          @click="$emit('update:activeFilter', filter.key)"
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
          <tr v-if="!filteredPackages.length" class="empty">
            <td colspan="10">No packages yet. Click "Pull from SaaS" to sync packages from Courier Depot.</td>
          </tr>
          <tr v-for="pkg in filteredPackages" :key="pkg.packageId">
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
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  packages: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  activeFilter: {
    type: String,
    default: 'all'
  },
  isSyncing: {
    type: Boolean,
    default: false
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  apiBaseUrl: {
    type: String,
    default: ''
  },
  lastSyncTime: {
    type: String,
    default: ''
  },
  lastSyncDetails: {
    type: String,
    default: ''
  },
  packageFilters: {
    type: Array,
    default: () => [
      { key: 'all', label: 'All', count: 0 },
      { key: 'synced', label: 'Synced', count: 0 },
      { key: 'pending', label: 'Pending', count: 0 }
    ]
  }
});

const emit = defineEmits([
  'update:searchQuery',
  'update:activeFilter',
  'sync-packages'
]);

const localSearchQuery = ref(props.searchQuery);

watch(localSearchQuery, (val) => {
  emit('update:searchQuery', val);
});

watch(() => props.searchQuery, (val) => {
  localSearchQuery.value = val;
});

const syncedCount = computed(() => props.packages.length);

const filteredPackages = computed(() => {
  let result = props.packages;

  if (localSearchQuery.value.trim()) {
    const query = localSearchQuery.value.toLowerCase();
    result = result.filter(pkg =>
      (pkg.trackingNumber || '').toLowerCase().includes(query) ||
      (pkg.customer || '').toLowerCase().includes(query) ||
      (pkg.altName || '').toLowerCase().includes(query) ||
      (pkg.courier || '').toLowerCase().includes(query) ||
      (pkg.packageId || '').toString().toLowerCase().includes(query)
    );
  }

  if (props.activeFilter !== 'all') {
    // Add filter logic based on status
  }

  return result;
});
</script>
