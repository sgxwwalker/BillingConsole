<template>
  <section class="panel full-page" id="settings">
    <div class="panel-head">
      <div>
        <p class="eyebrow">System Configuration</p>
        <h2>Settings</h2>
        <p class="muted">Manage users, roles, permissions, and system configuration</p>
      </div>
    </div>

    <!-- Settings Navigation Tabs -->
    <div class="settings-tabs">
      <button
        v-if="isAdmin"
        @click="$emit('update:activeTab', 'environment')"
        class="settings-tab"
        :class="{ active: activeTab === 'environment' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>Environment Control</span>
      </button>

      <button
        @click="$emit('update:activeTab', 'roles')"
        class="settings-tab"
        :class="{ active: activeTab === 'roles' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Roles</span>
      </button>

      <button
        @click="$emit('update:activeTab', 'users')"
        class="settings-tab"
        :class="{ active: activeTab === 'users' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Users</span>
      </button>

      <button
        v-if="isAdmin"
        @click="$emit('update:activeTab', 'api-config')"
        class="settings-tab"
        :class="{ active: activeTab === 'api-config' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
        </svg>
        <span>API Configuration</span>
      </button>

      <button
        @click="$emit('update:activeTab', 'notifications')"
        class="settings-tab"
        :class="{ active: activeTab === 'notifications' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        <span>Notifications</span>
      </button>

      <button
        v-if="isAdmin"
        @click="$emit('update:activeTab', 'page-control')"
        class="settings-tab"
        :class="{ active: activeTab === 'page-control' }"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Nav Control</span>
      </button>
    </div>

    <!-- Tab Content -->
    <slot :name="activeTab"></slot>
  </section>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    default: 'roles'
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

defineEmits(['update:activeTab']);
</script>

<style scoped>
.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 2px;
}

.settings-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px 8px 0 0;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.settings-tab.active {
  background: #3b82f6;
  color: white;
}

.settings-tab:hover:not(.active) {
  background: #f1f5f9;
}

.settings-tab svg {
  stroke: currentColor;
}
</style>
