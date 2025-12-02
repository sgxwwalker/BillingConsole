<template>
  <section class="panel full-page" id="summary">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Daily summary</p>
        <h2>Daily Check</h2>
        <p class="muted">Breakdown of collected amounts from Billing Console transactions.</p>
      </div>
      <div class="summary-controls">
        <!-- Period Filter Buttons -->
        <div class="period-buttons">
          <button
            v-for="period in periods"
            :key="period.value"
            @click="$emit('update:selectedPeriod', period.value); $emit('update:dateFilter', '')"
            class="period-btn"
            :class="{ active: selectedPeriod === period.value && !dateFilter }"
          >
            {{ period.label }}
          </button>
        </div>
        <input
          :value="dateFilter"
          @input="$emit('update:dateFilter', $event.target.value)"
          type="date"
          class="date-filter"
        />
        <button
          v-if="dateFilter"
          class="pill ghost"
          type="button"
          @click="$emit('update:dateFilter', ''); $emit('update:activeMethod', null)"
        >
          Clear Filter
        </button>
      </div>
    </div>

    <!-- Payment Method Cards (show when no method is selected) -->
    <div v-if="!activeMethod" class="method-cards-grid">
      <!-- Cash Card -->
      <div class="card clickable-card method-card" @click="$emit('update:activeMethod', 'cash')">
        <div class="method-card-header">
          <h4>Cash</h4>
          <span class="method-badge cash">Cash</span>
        </div>
        <div class="method-card-divider"></div>
        <p class="method-total">{{ formatCurrency(methodTotals.cash) }}</p>
        <p class="method-period">{{ periodLabel }}</p>
        <p class="method-action">Click to view <span class="bold">breakdown</span></p>
      </div>

      <!-- POS Card -->
      <div class="card clickable-card method-card" @click="$emit('update:activeMethod', 'pos')">
        <div class="method-card-header">
          <h4>POS</h4>
          <span class="method-badge pos">POS</span>
        </div>
        <div class="method-card-divider"></div>
        <p class="method-total">{{ formatCurrency(methodTotals.pos) }}</p>
        <p class="method-period">{{ periodLabel }}</p>
        <p class="method-action">Click to view <span class="bold">breakdown</span></p>
      </div>

      <!-- Transfer Card -->
      <div class="card clickable-card method-card" @click="$emit('update:activeMethod', 'transfer')">
        <div class="method-card-header">
          <h4>Transfer</h4>
          <span class="method-badge transfer">Transfer</span>
        </div>
        <div class="method-card-divider"></div>
        <p class="method-total">{{ formatCurrency(methodTotals.transfer) }}</p>
        <p class="method-period">{{ periodLabel }}</p>
        <p class="method-action">Click to view <span class="bold">breakdown</span></p>
      </div>

      <!-- Loyalty Card -->
      <div class="card clickable-card method-card" @click="$emit('update:activeMethod', 'loyalty')">
        <div class="method-card-header">
          <h4>Loyalty</h4>
          <span class="method-badge loyalty">Loyalty</span>
        </div>
        <div class="method-card-divider"></div>
        <p class="method-total">{{ formatCurrency(methodTotals.loyalty) }}</p>
        <p class="method-period">{{ periodLabel }}</p>
        <p class="method-action">Click to view <span class="bold">breakdown</span></p>
      </div>
    </div>

    <!-- Method Detail View -->
    <div v-else class="method-detail">
      <div class="method-detail-header">
        <button class="pill ghost" @click="$emit('update:activeMethod', null)">
          ← Back to Overview
        </button>
        <h3>{{ activeMethod.charAt(0).toUpperCase() + activeMethod.slice(1) }} Transactions</h3>
      </div>

      <div class="method-detail-summary">
        <StatCard
          :label="`Total ${activeMethod.charAt(0).toUpperCase() + activeMethod.slice(1)}`"
          :value="methodTotals[activeMethod]"
          format="currency"
        />
        <StatCard
          label="Transaction Count"
          :value="methodTransactions.length"
        />
      </div>

      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Package ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Collected By</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="methodTransactions.length === 0" class="empty">
              <td colspan="5">No transactions found for this period.</td>
            </tr>
            <tr v-for="tx in methodTransactions" :key="tx.id">
              <td>{{ formatDate(tx.collection_date) }}</td>
              <td><strong>{{ tx.package_id }}</strong></td>
              <td>{{ tx.customer_name }}</td>
              <td>{{ formatCurrency(tx.amount_paid) }}</td>
              <td>{{ tx.collected_by || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { StatCard } from '@/components';
import { useFormatting } from '@/composables/useFormatting';

const props = defineProps({
  selectedPeriod: {
    type: String,
    default: 'today'
  },
  dateFilter: {
    type: String,
    default: ''
  },
  activeMethod: {
    type: String,
    default: null
  },
  methodTotals: {
    type: Object,
    default: () => ({
      cash: 0,
      pos: 0,
      transfer: 0,
      loyalty: 0
    })
  },
  transactions: {
    type: Array,
    default: () => []
  }
});

defineEmits([
  'update:selectedPeriod',
  'update:dateFilter',
  'update:activeMethod'
]);

const { formatCurrency, formatDate } = useFormatting();

const periods = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '1month', label: '1 Month' },
  { value: '90days', label: '90 Days' }
];

const periodLabel = computed(() => {
  if (props.dateFilter) return 'For selected date';
  const period = periods.find(p => p.value === props.selectedPeriod);
  if (props.selectedPeriod === 'today') return 'Today';
  if (props.selectedPeriod === '7days') return 'Last 7 days';
  if (props.selectedPeriod === '1month') return 'Last month';
  if (props.selectedPeriod === '90days') return 'Last 90 days';
  return period?.label || '';
});

const methodTransactions = computed(() => {
  if (!props.activeMethod) return [];
  return props.transactions.filter(tx =>
    (tx.payment_method || '').toLowerCase() === props.activeMethod.toLowerCase()
  );
});
</script>

<style scoped>
.summary-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.period-buttons {
  display: flex;
  gap: 6px;
}

.period-btn {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
  transition: all 0.2s ease;
}

.period-btn.active {
  background: var(--sgx-blue);
  color: white;
}

.date-filter {
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
}

.method-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.method-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.method-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.method-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.method-card-header h4 {
  font-size: 18px;
  font-weight: 600;
  color: #4b5563;
}

.method-badge {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
}

.method-badge.cash { background: #dcfce7; color: #166534; }
.method-badge.pos { background: #dbeafe; color: #1e40af; }
.method-badge.transfer { background: #fef3c7; color: #92400e; }
.method-badge.loyalty { background: #fae8ff; color: #86198f; }

.method-card-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 20px;
}

.method-total {
  font-size: 48px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 8px;
}

.method-period {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 20px;
}

.method-action {
  font-size: 13px;
  color: #6b7280;
}

.method-action .bold {
  font-weight: 600;
  color: #374151;
}

.method-detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.method-detail-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.method-detail-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
</style>
