<template>
  <section class="panel full-page" id="orders">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Customers Orders</p>
        <h2>Customers Orders</h2>
      </div>
    </div>

    <div class="orders-controls">
      <SearchBox
        v-model="localSearchQuery"
        label="Search"
        placeholder="Search customer or merchant"
        :compact="true"
      />
      <div class="action-group gap-3">
        <button
          class="pill small"
          type="button"
          @click="$emit('open-add-order')"
          :disabled="!canManageOrders"
        >Add order</button>
        <button
          class="pill secondary small"
          type="button"
          @click="$emit('bulk-receive')"
          :disabled="!selectedOrderIds.length || !canManageOrders"
        >Bulk Update</button>
        <button
          class="pill danger small"
          type="button"
          @click="$emit('bulk-delete')"
          :disabled="!selectedOrderIds.length || !canManageOrders"
        >Bulk delete</button>
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
          <!-- Loading Skeleton -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="'skeleton-' + i" class="skeleton-row">
              <td><div class="skeleton skeleton-cell checkbox"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell medium"></div></td>
              <td><div class="skeleton skeleton-cell long"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell tag"></div></td>
              <td><div class="skeleton skeleton-cell medium"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell short"></div></td>
              <td><div class="skeleton skeleton-cell button"></div></td>
            </tr>
          </template>
          <!-- Empty State -->
          <tr v-else-if="!filteredOrders.length" class="empty">
            <td colspan="10">No orders yet.</td>
          </tr>
          <!-- Order Rows -->
          <tr v-else v-for="order in paginatedOrders" :key="order.id">
            <td>
              <input
                type="checkbox"
                :checked="selectedOrderIds.includes(order.id)"
                @change="$emit('toggle-selection', order.id)"
              />
            </td>
            <td>{{ order.date }}</td>
            <td>{{ order.customerName }}</td>
            <td>{{ order.description }}</td>
            <td>{{ formatCurrency(order.cost, order.currency) }}</td>
            <td>
              <StatusTag :status="order.status">{{ order.status }}</StatusTag>
            </td>
            <td>{{ order.merchant }}</td>
            <td>{{ order.method }}</td>
            <td>{{ order.updatedBy || '—' }}</td>
            <td>
              <div class="actions">
                <button
                  class="pill secondary"
                  type="button"
                  @click="$emit('mark-received', order)"
                >Received</button>
                <KebabMenu v-model="kebabOpen[order.id]">
                  <button @click="$emit('edit-order', order); kebabOpen[order.id] = false" :disabled="!canManageOrders">Edit</button>
                  <button class="danger" @click="$emit('delete-order', order.id); kebabOpen[order.id] = false" :disabled="!canManageOrders">Delete</button>
                </KebabMenu>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="orders-pagination">
        <div class="pagination-info">
          <template v-if="filteredOrders.length > 0">
            Showing {{ ((currentPage - 1) * perPage) + 1 }} - {{ Math.min(currentPage * perPage, filteredOrders.length) }} of {{ filteredOrders.length }} orders
          </template>
          <template v-else>
            No orders to display
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
  orders: {
    type: Array,
    default: () => []
  },
  selectedOrderIds: {
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
  canManageOrders: {
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
  'open-add-order',
  'edit-order',
  'delete-order',
  'mark-received',
  'bulk-receive',
  'bulk-delete'
]);

const { formatCurrency } = useFormatting();
const kebabOpen = reactive({});

const localSearchQuery = ref(props.searchQuery);

watch(localSearchQuery, (val) => {
  emit('update:searchQuery', val);
});

watch(() => props.searchQuery, (val) => {
  localSearchQuery.value = val;
});

const filteredOrders = computed(() => {
  if (!localSearchQuery.value.trim()) return props.orders;

  const query = localSearchQuery.value.toLowerCase();
  return props.orders.filter(order =>
    (order.customerName || '').toLowerCase().includes(query) ||
    (order.merchant || '').toLowerCase().includes(query) ||
    (order.description || '').toLowerCase().includes(query)
  );
});

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / props.perPage));

const paginatedOrders = computed(() => {
  const start = (props.currentPage - 1) * props.perPage;
  return filteredOrders.value.slice(start, start + props.perPage);
});

const allSelected = computed(() => {
  return filteredOrders.value.length > 0 &&
    props.selectedOrderIds.length === filteredOrders.value.length;
});

const shouldShowPage = (page) => {
  return page === 1 ||
    page === totalPages.value ||
    (page >= props.currentPage - 1 && page <= props.currentPage + 1);
};

const isEllipsis = (page) => {
  return page === props.currentPage - 2 || page === props.currentPage + 2;
};
</script>

<style scoped>
.orders-controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.orders-pagination {
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
