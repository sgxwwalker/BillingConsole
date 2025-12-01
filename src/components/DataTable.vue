<template>
  <div class="table-wrap">
    <div class="table-shell" :class="{ compact: compact }" :style="tableStyle">
      <table>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :style="column.headerStyle"
              :class="{ sortable: column.sortable }"
              @click="column.sortable && handleSort(column.key)"
            >
              {{ column.label }}
              <span v-if="column.sortable && sortColumn === column.key">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!data || data.length === 0" class="empty">
            <td :colspan="columns.length">{{ emptyMessage }}</td>
          </tr>
          <slot v-else name="rows" :data="sortedData">
            <tr v-for="(row, index) in sortedData" :key="row[rowKey] || index">
              <td v-for="column in columns" :key="column.key" :style="column.cellStyle">
                <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                  {{ row[column.key] }}
                </slot>
              </td>
            </tr>
          </slot>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true
    // Each column: { key: string, label: string, sortable?: boolean, headerStyle?: object, cellStyle?: object }
  },
  data: {
    type: Array,
    default: () => []
  },
  rowKey: {
    type: String,
    default: 'id'
  },
  emptyMessage: {
    type: String,
    default: 'No data found.'
  },
  compact: {
    type: Boolean,
    default: false
  },
  tableStyle: {
    type: [String, Object],
    default: ''
  },
  defaultSort: {
    type: String,
    default: ''
  },
  defaultSortDirection: {
    type: String,
    default: 'asc'
  }
});

const emit = defineEmits(['sort']);

const sortColumn = ref(props.defaultSort);
const sortDirection = ref(props.defaultSortDirection);

const handleSort = (key) => {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = key;
    sortDirection.value = 'asc';
  }
  emit('sort', { column: sortColumn.value, direction: sortDirection.value });
};

const sortedData = computed(() => {
  if (!sortColumn.value || !props.data) return props.data;

  return [...props.data].sort((a, b) => {
    const aVal = a[sortColumn.value];
    const bVal = b[sortColumn.value];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});
</script>

<style scoped>
.sortable {
  cursor: pointer;
  user-select: none;
}
.sortable:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
