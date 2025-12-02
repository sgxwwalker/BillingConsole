<template>
  <section class="panel" id="dashboard">
    <header class="topbar">
      <div class="titles">
        <p class="eyebrow">SG Xpress Shipping</p>
        <h1>SGX Billing Console</h1>
      </div>
    </header>

    <!-- Billing Stats -->
    <div class="grid stats-split">
      <StatCard label="Unbilled" :value="billingStats.unbilled" />
      <StatCard label="Open" :value="billingStats.open" />
      <StatCard label="Closed Today" :value="billingStats.closedToday" />
      <StatCard label="Collected Today" :value="billingStats.amountCollectedToday" format="currency" />
    </div>

    <!-- Search -->
    <div class="search-section">
      <SearchBox
        v-model="searchQuery"
        placeholder="Search by customer name, package ID, or tracking number..."
        :compact="false"
        :style="{ width: '100%', minWidth: '100%' }"
      />
      <div class="filter-pills">
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >All</button>
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'unbilled' }"
          @click="statusFilter = 'unbilled'"
        >Unbilled</button>
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'Open' }"
          @click="statusFilter = 'Open'"
        >Open</button>
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'Partial' }"
          @click="statusFilter = 'Partial'"
        >Partial</button>
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'Closed' }"
          @click="statusFilter = 'Closed'"
        >Closed</button>
        <button
          class="filter-pill"
          :class="{ active: statusFilter === 'show_all' }"
          @click="statusFilter = 'show_all'"
        >Show All</button>
      </div>
    </div>

    <!-- Billing Table -->
    <div class="table-wrap">
      <div class="table-shell" style="overflow: visible;">
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
            <tr v-if="filteredItems.length === 0" class="empty">
              <td colspan="8">{{ searchQuery.trim() ? 'No packages found matching your search.' : 'Search for a customer name, package ID, or tracking number to view packages.' }}</td>
            </tr>
            <tr v-for="item in paginatedItems" :key="item.id">
              <td><strong>{{ item.package_id || item.id }}</strong></td>
              <td>{{ item.tracking_number }}</td>
              <td>{{ item.customer_name }}</td>
              <td>{{ item.alt_name || '—' }}</td>
              <td>{{ formatCurrency(calculateItemCost(item)) }}</td>
              <td>
                <StatusTag :status="item.status">
                  {{ item.status === 'received' ? 'Received' : item.status === 'pending' ? 'Pending' : item.status === 'not_found' ? 'Not Found' : item.status }}
                </StatusTag>
              </td>
              <td>
                <div class="bl-status-dropdown" @click.stop>
                  <button
                    class="bl-status-btn"
                    :class="getBLStatusClass(item.billing_status)"
                    @click="$emit('toggle-bl-dropdown', item.id)"
                  >
                    {{ item.billing_status === 'unbilled' || !item.billing_status ? 'Unbilled' : item.billing_status }}
                    <span class="chevron">▼</span>
                  </button>
                  <div v-if="openBLDropdownId === item.id" class="bl-status-menu">
                    <button @click="$emit('update-billing-status', item, 'unbilled')">Unbilled</button>
                    <button @click="$emit('update-billing-status', item, 'Open')">Open</button>
                    <button @click="$emit('update-billing-status', item, 'Partial')">Partial</button>
                    <button @click="$emit('update-billing-status', item, 'Closed')">Closed</button>
                  </div>
                </div>
              </td>
              <td>
                <div class="billing-actions">
                  <button
                    class="pill small"
                    type="button"
                    @click="$emit('open-bill-modal', item)"
                    :disabled="item.billing_status !== 'unbilled' && item.billing_status"
                  >Bill</button>
                  <button
                    class="pill small secondary"
                    type="button"
                    @click="$emit('open-collect-modal', item)"
                    :disabled="!item.billing_status || item.billing_status === 'unbilled' || item.billing_status === 'Closed'"
                  >Collect</button>
                  <KebabMenu v-model="kebabOpen[item.id]">
                    <button @click="$emit('open-view-modal', item); kebabOpen[item.id] = false">View</button>
                    <button @click="$emit('open-edit-modal', item); kebabOpen[item.id] = false">Edit</button>
                    <button class="danger" @click="$emit('open-delete-modal', item); kebabOpen[item.id] = false">Delete</button>
                  </KebabMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <Pagination
      v-if="filteredItems.length > itemsPerPage"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total-items="filteredItems.length"
      @update:current-page="$emit('update:currentPage', $event)"
    />
  </section>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { SearchBox, StatusTag, KebabMenu, Pagination, StatCard } from '@/components';
import { useFormatting } from '@/composables/useFormatting';

const props = defineProps({
  billingStats: {
    type: Object,
    required: true
  },
  billingItems: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  statusFilter: {
    type: String,
    default: 'all'
  },
  currentPage: {
    type: Number,
    default: 1
  },
  itemsPerPage: {
    type: Number,
    default: 25
  },
  openBLDropdownId: {
    type: [String, Number, null],
    default: null
  }
});

const emit = defineEmits([
  'update:searchQuery',
  'update:statusFilter',
  'update:currentPage',
  'toggle-bl-dropdown',
  'update-billing-status',
  'open-bill-modal',
  'open-collect-modal',
  'open-view-modal',
  'open-edit-modal',
  'open-delete-modal'
]);

const { formatCurrency } = useFormatting();

const kebabOpen = reactive({});

const searchQuery = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val)
});

const statusFilter = computed({
  get: () => props.statusFilter,
  set: (val) => emit('update:statusFilter', val)
});

const calculateItemCost = (item) => {
  const packageCost = Number(item.package_cost) || 0;
  const customFee = Number(item.custom_fee) || 0;
  const processingFee = Number(item.processing_fee) || 0;
  const lateFee = Number(item.late_fee) || 0;
  return packageCost + customFee + processingFee + lateFee;
};

const getBLStatusClass = (status) => {
  if (!status || status === 'unbilled') return 'bl-unbilled';
  if (status === 'Open') return 'bl-open';
  if (status === 'Partial') return 'bl-partial';
  if (status === 'Closed') return 'bl-closed';
  return '';
};

const filteredItems = computed(() => {
  let items = props.billingItems;

  // Apply search filter
  if (props.searchQuery.trim()) {
    const query = props.searchQuery.toLowerCase().trim();
    items = items.filter(item =>
      (item.customer_name || '').toLowerCase().includes(query) ||
      (item.package_id || '').toString().toLowerCase().includes(query) ||
      (item.tracking_number || '').toLowerCase().includes(query) ||
      (item.alt_name || '').toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (props.statusFilter !== 'all' && props.statusFilter !== 'show_all') {
    items = items.filter(item => {
      const status = item.billing_status || 'unbilled';
      return status.toLowerCase() === props.statusFilter.toLowerCase();
    });
  } else if (props.statusFilter === 'all') {
    // Exclude 'Closed' by default
    items = items.filter(item => item.billing_status !== 'Closed');
  }

  return items;
});

const totalPages = computed(() => Math.ceil(filteredItems.value.length / props.itemsPerPage));

const paginatedItems = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage;
  return filteredItems.value.slice(start, start + props.itemsPerPage);
});
</script>

<style scoped>
.search-section {
  margin-bottom: 24px;
}

.search-section :deep(.search-box) {
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  margin-bottom: 12px;
}

.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
