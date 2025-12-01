<template>
  <div class="search-box" :class="{ compact: compact }" :style="style">
    <label v-if="label" class="input-label" :for="inputId">{{ label }}</label>
    <div class="input-shell with-clear">
      <input
        :id="inputId"
        type="text"
        :placeholder="placeholder"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        autocomplete="off"
      />
      <button
        v-if="modelValue && clearable"
        type="button"
        class="clear-search-btn"
        @click="$emit('update:modelValue', '')"
        title="Clear search"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search...'
  },
  label: {
    type: String,
    default: ''
  },
  clearable: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  },
  style: {
    type: [String, Object],
    default: ''
  }
});

defineEmits(['update:modelValue']);

const inputId = computed(() => `search-${Math.random().toString(36).substr(2, 9)}`);
</script>
