<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal" @click="handleBackdropClick">
      <div class="modal-card" :class="[sizeClass, customClass]" @click.stop>
        <header v-if="$slots.header || title">
          <slot name="header">
            <div>
              <h3>{{ title }}</h3>
              <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
            </div>
          </slot>
          <button
            v-if="showClose"
            class="close-btn"
            aria-label="Close modal"
            @click="close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          <slot></slot>
        </div>

        <div v-if="$slots.footer" class="modal-actions">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium', // 'small', 'medium', 'large', 'full'
    validator: (v) => ['small', 'medium', 'large', 'full'].includes(v)
  },
  showClose: {
    type: Boolean,
    default: true
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  },
  closeOnEscape: {
    type: Boolean,
    default: true
  },
  customClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const sizeClass = computed(() => `modal-${props.size}`);

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleBackdropClick = (e) => {
  if (props.closeOnBackdrop && e.target === e.currentTarget) {
    close();
  }
};

const handleEscape = (e) => {
  if (props.closeOnEscape && e.key === 'Escape' && props.modelValue) {
    close();
  }
};

// Handle body scroll lock
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-small {
  max-width: 400px;
}
.modal-medium {
  max-width: 600px;
}
.modal-large {
  max-width: 900px;
}
.modal-full {
  max-width: 95vw;
  max-height: 95vh;
}
.modal-body {
  flex: 1;
  overflow-y: auto;
}
</style>
