<template>
  <div class="kebab-menu-container">
    <button
      class="kebab-btn"
      @click.stop="toggle"
      @blur="handleBlur"
      type="button"
      :aria-label="ariaLabel"
    >
      <span class="kebab-dots"><span></span></span>
    </button>
    <div v-if="isOpen" class="kebab-dropdown">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: undefined
  },
  ariaLabel: {
    type: String,
    default: 'More actions'
  },
  closeDelay: {
    type: Number,
    default: 200
  }
});

const emit = defineEmits(['update:modelValue']);

const internalOpen = ref(false);

const isOpen = props.modelValue !== undefined
  ? ref(props.modelValue)
  : internalOpen;

watch(() => props.modelValue, (val) => {
  if (val !== undefined) {
    isOpen.value = val;
  }
});

const toggle = () => {
  const newValue = !isOpen.value;
  isOpen.value = newValue;
  emit('update:modelValue', newValue);
};

const close = () => {
  isOpen.value = false;
  emit('update:modelValue', false);
};

const handleBlur = () => {
  setTimeout(close, props.closeDelay);
};

defineExpose({ close, toggle });
</script>
