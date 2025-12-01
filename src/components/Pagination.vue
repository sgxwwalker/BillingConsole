<template>
  <div v-if="totalPages > 1" class="pagination-container">
    <button
      class="pill ghost small"
      :disabled="currentPage === 1"
      @click="$emit('update:currentPage', currentPage - 1)"
    >
      Previous
    </button>
    <span class="pagination-info">
      Page {{ currentPage }} of {{ totalPages }} <span v-if="totalItems">({{ totalItems }} items)</span>
    </span>
    <button
      class="pill ghost small"
      :disabled="currentPage >= totalPages"
      @click="$emit('update:currentPage', currentPage + 1)"
    >
      Next
    </button>
  </div>
</template>

<script setup>
defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  totalItems: {
    type: Number,
    default: 0
  }
});

defineEmits(['update:currentPage']);
</script>

<style scoped>
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px 0;
}
.pagination-info {
  font-size: 14px;
  color: var(--text-muted);
}
</style>
