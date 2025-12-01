<template>
  <span class="tag" :class="statusClass" :style="customStyle">
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: '', // 'success', 'warning', 'danger', 'info', 'secondary'
    validator: (v) => ['', 'success', 'warning', 'danger', 'info', 'secondary'].includes(v)
  },
  customStyle: {
    type: [String, Object],
    default: ''
  }
});

const statusClass = computed(() => {
  if (props.variant) return props.variant;

  const statusLower = (props.status || '').toLowerCase();

  // Billing statuses
  if (statusLower === 'closed') return 'success';
  if (statusLower === 'open') return 'warning';
  if (statusLower === 'partial') return 'info';
  if (statusLower === 'unbilled') return 'secondary';

  // Package/shipment statuses
  if (statusLower === 'received' || statusLower === 'ready for pickup') return 'success';
  if (statusLower === 'pending' || statusLower === 'processing') return 'warning';
  if (statusLower === 'not_found' || statusLower === 'not found') return 'danger';
  if (statusLower === 'in transit') return 'info';

  // Order statuses
  if (statusLower === 'ordered') return 'info';

  // User statuses
  if (statusLower === 'active') return 'success';
  if (statusLower === 'inactive') return 'danger';

  return 'secondary';
});
</script>
