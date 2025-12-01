<template>
  <section class="panel full-page" id="delivery-requests">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Delivery Management</p>
        <h2>Delivery Requests</h2>
      </div>
    </div>

    <div class="delivery-controls">
      <SearchBox
        v-model="localSearchQuery"
        label="Search"
        placeholder="Search customer or address"
        :compact="true"
      />
      <div class="action-group gap-3">
        <select v-model="statusFilter" class="status-filter">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          class="pill small"
          type="button"
          @click="$emit('open-add-request')"
          :disabled="!canManageDeliveries"
        >Add Request</button>
        <button
          class="pill danger small"
          type="button"
          @click="$emit('bulk-delete')"
          :disabled="!selectedRequestIds.length || !canManageDeliveries"
        >Bulk Delete</button>
      </div>
    </div>

    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allSelected"
                @change="$emit('toggle-all')"
              />
            </th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Packages</th>
            <th>Scheduled Date</th>
            <th>Cost</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading Skeleton -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="'skeleton-' + i" class="skeleton-row">
              <td><div class="skeleton skeleton-cell checkbox"></div></td>
              <td><div class="skeleton skeleton-cell medium"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell long"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell tag"></div></td>
              <td><div class="skeleton skeleton-cell button"></div></td>
            </tr>
          </template>
          <!-- Empty State -->
          <tr v-else-if="!filteredRequests.length" class="empty">
            <td colspan="10">No delivery requests yet.</td>
          </tr>
          <!-- Request Rows -->
          <tr v-else v-for="request in paginatedRequests" :key="request.id">
            <td>
              <input
                type="checkbox"
                :checked="selectedRequestIds.includes(request.id)"
                @change="$emit('toggle-selection', request.id)"
              />
            </td>
            <td>{{ request.customerName }}</td>
            <td>{{ request.customerPhone }}</td>
            <td class="address-cell">{{ request.address }}</td>
            <td>{{ request.packageCount }}</td>
            <td>{{ formatDate(request.scheduledDate) }}</td>
            <td>{{ formatCurrency(request.deliveryCost) }}</td>
            <td>
              <span class="payment-badge" :class="paymentTypeClass(request.paymentType)">
                {{ request.paymentType }}
              </span>
            </td>
            <td>
              <StatusTag :status="request.status">{{ request.status }}</StatusTag>
            </td>
            <td>
              <div class="actions">
                <KebabMenu v-model="kebabOpen[request.id]">
                  <button @click="$emit('edit-request', request); kebabOpen[request.id] = false" :disabled="!canManageDeliveries">Edit</button>
                  <button @click="$emit('update-status', request); kebabOpen[request.id] = false" :disabled="!canManageDeliveries">Update Status</button>
                  <button class="danger" @click="$emit('delete-request', request.id); kebabOpen[request.id] = false" :disabled="!canManageDeliveries">Delete</button>
                </KebabMenu>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="delivery-pagination">
        <div class="pagination-info">
          <template v-if="filteredRequests.length > 0">
            Showing {{ ((currentPage - 1) * perPage) + 1 }} - {{ Math.min(currentPage * perPage, filteredRequests.length) }} of {{ filteredRequests.length }} requests
          </template>
          <template v-else>
            No requests to display
          </template>
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" @click="$emit('update:currentPage', 1)" :disabled="currentPage === 1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
          </button>
          <button class="pagination-btn" @click="$emit('update:currentPage', currentPage - 1)" :disabled="currentPage === 1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <template v-for="page in totalPages" :key="page">
            <button
              v-if="shouldShowPage(page)"
              class="pagination-btn"
              :class="{ active: page === currentPage }"
              @click="$emit('update:currentPage', page)"
            >
              {{ page }}
            </button>
            <span v-else-if="isEllipsis(page)" class="pagination-ellipsis">...</span>
          </template>
          <button class="pagination-btn" @click="$emit('update:currentPage', currentPage + 1)" :disabled="currentPage >= totalPages">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button class="pagination-btn" @click="$emit('update:currentPage', totalPages)" :disabled="currentPage >= totalPages">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
          </button>
        </div>
        <div class="per-page-select">
          <span>Per page:</span>
          <select :value="perPage" @change="$emit('update:perPage', Number($event.target.value))">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { SearchBox, StatusTag, KebabMenu } from '@/components';
import { useFormatting } from '@/composables/useFormatting';

const props = defineProps({
  requests: {
    type: Array,
    default: () => []
  },
  selectedRequestIds: {
    type: Array,
    default: () => []
  },
  searchQuery: {
    type: String,
    default: ''
  },
  currentPage: {
    type: Number,
    default: 1
  },
  perPage: {
    type: Number,
    default: 10
  },
  loading: {
    type: Boolean,
    default: false
  },
  canManageDeliveries: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:searchQuery',
  'update:currentPage',
  'update:perPage',
  'toggle-all',
  'toggle-selection',
  'open-add-request',
  'edit-request',
  'delete-request',
  'update-status',
  'bulk-delete'
]);

const { formatCurrency, formatDate } = useFormatting();
const kebabOpen = reactive({});
const statusFilter = ref('');

const localSearchQuery = ref(props.searchQuery);

watch(localSearchQuery, (val) => {
  emit('update:searchQuery', val);
});

watch(() => props.searchQuery, (val) => {
  localSearchQuery.value = val;
});

const filteredRequests = computed(() => {
  let filtered = props.requests;

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter(request => request.status === statusFilter.value);
  }

  // Filter by search query
  if (localSearchQuery.value.trim()) {
    const query = localSearchQuery.value.toLowerCase();
    filtered = filtered.filter(request =>
      (request.customerName || '').toLowerCase().includes(query) ||
      (request.customerPhone || '').toLowerCase().includes(query) ||
      (request.address || '').toLowerCase().includes(query)
    );
  }

  return filtered;
});

const totalPages = computed(() => Math.ceil(filteredRequests.value.length / props.perPage));

const paginatedRequests = computed(() => {
  const start = (props.currentPage - 1) * props.perPage;
  return filteredRequests.value.slice(start, start + props.perPage);
});

const allSelected = computed(() => {
  return filteredRequests.value.length > 0 &&
    props.selectedRequestIds.length === filteredRequests.value.length;
});

const shouldShowPage = (page) => {
  return page === 1 ||
    page === totalPages.value ||
    (page >= props.currentPage - 1 && page <= props.currentPage + 1);
};

const isEllipsis = (page) => {
  return page === props.currentPage - 2 || page === props.currentPage + 2;
};

const paymentTypeClass = (type) => {
  return type === 'Cash On Delivery' ? 'cod' : 'transfer';
};
</script>

<style scoped>
.delivery-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.status-filter {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
}

.address-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
}

.payment-badge.cod {
  background: #fef3c7;
  color: #92400e;
}

.payment-badge.transfer {
  background: #dbeafe;
  color: #1e40af;
}

.delivery-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 16px 0;
  gap: 16px;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 14px;
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination-btn {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.pagination-btn.active {
  background: var(--sgx-blue);
  color: white;
  border-color: var(--sgx-blue);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-ellipsis {
  color: var(--text-muted);
  padding: 0 4px;
}

.per-page-select {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-muted);
}

.per-page-select select {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}
</style>
