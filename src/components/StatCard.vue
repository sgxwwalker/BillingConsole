<template>
  <div class="card stat" :class="{ clickable: clickable }" @click="clickable && $emit('click')">
    <h3 :style="valueStyle">{{ formattedValue }}</h3>
    <p class="stat-label">{{ label }}</p>
    <p v-if="subtitle" class="stat-subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  format: {
    type: String,
    default: '', // 'currency', 'number', 'percent', ''
  },
  currency: {
    type: String,
    default: 'JMD'
  },
  valueColor: {
    type: String,
    default: ''
  },
  clickable: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);

const valueStyle = computed(() => {
  if (props.valueColor) {
    return { color: props.valueColor };
  }
  return {};
});

const formattedValue = computed(() => {
  if (props.format === 'currency') {
    const num = Number(props.value) || 0;
    return new Intl.NumberFormat('en-JM', {
      style: 'currency',
      currency: props.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }
  if (props.format === 'number') {
    const num = Number(props.value) || 0;
    return new Intl.NumberFormat('en-JM').format(num);
  }
  if (props.format === 'percent') {
    const num = Number(props.value) || 0;
    return `${num.toFixed(1)}%`;
  }
  return props.value;
});
</script>

<style scoped>
.stat.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}
.stat.clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
.stat-label {
  font-size: var(--font-small);
  font-weight: 400;
  color: var(--text-muted);
  margin-top: 4px;
}
.stat-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
