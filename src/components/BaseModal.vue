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
  width: min(480px, 95%);
}
.modal-medium {
  width: min(720px, 95%);
}
.modal-large {
  width: min(920px, 95%);
}
.modal-full {
  width: 95vw;
  max-height: 90vh;
}

/* Modal body scrolls when content is too tall */
.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Centered header styles for Apple feel */
header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

header > div {
  text-align: center;
}

header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.modal-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

.close-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f1f5f9;
  color: var(--text-main);
}
</style>
