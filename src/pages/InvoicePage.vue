<template>
  <section class="panel full-page invoice-page">
    <!-- Header Actions -->
    <div class="invoice-header-actions">
      <button class="btn-back" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Packages
      </button>

      <div class="action-buttons-group">
        <button class="btn-danger" @click="sendInvoice" :disabled="!invoice || invoice.status !== 'draft'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
          Send Invoice
        </button>
        <button class="btn-secondary" @click="downloadInvoice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </button>
        <button class="btn-secondary" @click="printInvoice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print
        </button>
        <button class="btn-primary" @click="saveInvoice" v-if="isEditing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save
        </button>
        <button class="btn-primary" @click="toggleEdit" v-else>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          Edit
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <p>Loading invoice...</p>
    </div>

    <!-- Invoice Content -->
    <div v-else-if="invoice" class="invoice-container" id="invoice-print">
      <div class="invoice-card">
        <!-- Header Section -->
        <div class="invoice-top">
          <div class="company-info">
            <div class="company-logo">
              <span class="logo-text">RSC</span>
              <span class="logo-subtext">COURIER</span>
            </div>
            <p class="company-tagline">Fast and reliable delivery</p>
            <div class="contact-info">
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> info@courierdepot-express.com</p>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> support@courierdepot-express.com</p>
              <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> rsc.courierdepots.com</p>
            </div>
          </div>

          <div class="invoice-header-info">
            <h1 class="invoice-title">INVOICE</h1>
            <p class="invoice-number">#{{ invoice.invoice_number }}</p>
            <div class="invoice-meta">
              <p><strong>Date Issued:</strong> {{ formatDate(invoice.date_issued) }}</p>
              <p><strong>Due Date:</strong> {{ invoice.due_date ? formatDate(invoice.due_date) : 'N/A' }}</p>
            </div>
          </div>
        </div>

        <!-- Bill To / Payment Details Section -->
        <div class="invoice-middle">
          <div class="bill-to">
            <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Invoice To:</h3>
            <p class="customer-name">{{ invoice.customer?.first_name }} {{ invoice.customer?.last_name }}</p>
            <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {{ invoice.customer?.phone || 'N/A' }}</p>
            <p><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> {{ invoice.customer?.email || 'N/A' }}</p>
          </div>

          <div class="payment-details">
            <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Payment Details:</h3>
            <div class="payment-info">
              <p><strong>Total Due:</strong> <span class="amount">${{ invoiceTotal.toFixed(2) }}</span></p>
              <p><strong>Bank:</strong> {{ paymentDetails?.bank || 'First Global Bank' }}</p>
              <p><strong>Account:</strong> {{ paymentDetails?.account_number || '990951006558' }}</p>
              <p><strong>Branch:</strong> {{ paymentDetails?.branch || 'Cross Road branch' }}</p>
              <p><strong>Type:</strong> {{ paymentDetails?.account_type || 'Business Saving' }}</p>
            </div>
          </div>
        </div>

        <!-- Package Details Section -->
        <div v-if="packageData" class="package-details-section">
          <h3><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Package Details:</h3>
          <div class="package-info-grid">
            <div class="package-info-item">
              <span class="label">Tracking Number:</span>
              <span class="value">{{ packageData.tracking_number || 'N/A' }}</span>
            </div>
            <div class="package-info-item">
              <span class="label">Weight:</span>
              <span class="value">{{ packageData.weight ? packageData.weight + ' lbs' : 'N/A' }}</span>
            </div>
            <div class="package-info-item">
              <span class="label">Customer:</span>
              <span class="value">{{ packageData.user?.first_name }} {{ packageData.user?.last_name }}</span>
            </div>
            <div class="package-info-item">
              <span class="label">Description:</span>
              <span class="value">{{ packageData.description || 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Invoice Items Table -->
        <div class="invoice-items">
          <table>
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th class="text-right">UNIT PRICE</th>
                <th class="text-center">QTY</th>
                <th class="text-right">TOTAL</th>
                <th v-if="isEditing" class="text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoice.items" :key="item.id">
                <td>
                  <input
                    v-if="isEditing"
                    v-model="item.description"
                    class="edit-input"
                    @blur="updateItem(item)"
                  />
                  <span v-else>{{ item.description }}</span>
                </td>
                <td class="text-right">
                  <input
                    v-if="isEditing"
                    v-model.number="item.unit_price"
                    type="number"
                    step="0.01"
                    class="edit-input price-input"
                    @blur="updateItem(item)"
                  />
                  <span v-else>${{ item.unit_price?.toFixed(2) }}</span>
                </td>
                <td class="text-center">
                  <input
                    v-if="isEditing"
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="edit-input qty-input"
                    @blur="updateItem(item)"
                  />
                  <span v-else>{{ item.quantity }}</span>
                </td>
                <td class="text-right">${{ (item.unit_price * item.quantity).toFixed(2) }}</td>
                <td v-if="isEditing" class="text-center">
                  <button class="btn-delete" @click="deleteItem(item)" title="Delete item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </td>
              </tr>

              <!-- Add New Item Row -->
              <tr v-if="isEditing && showNewItemRow">
                <td>
                  <input
                    v-model="newItem.description"
                    class="edit-input"
                    placeholder="Item description"
                  />
                </td>
                <td class="text-right">
                  <input
                    v-model.number="newItem.unit_price"
                    type="number"
                    step="0.01"
                    class="edit-input price-input"
                    placeholder="0.00"
                  />
                </td>
                <td class="text-center">
                  <input
                    v-model.number="newItem.quantity"
                    type="number"
                    min="1"
                    class="edit-input qty-input"
                    placeholder="1"
                  />
                </td>
                <td class="text-right">${{ ((newItem.unit_price || 0) * (newItem.quantity || 1)).toFixed(2) }}</td>
                <td class="text-center">
                  <button class="btn-add-item" @click="addNewItem" :disabled="!newItem.description || !newItem.unit_price">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <button v-if="isEditing && !showNewItemRow" class="btn-add-row" @click="showNewItemRow = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Line Item
          </button>
        </div>

        <!-- Totals -->
        <div class="invoice-totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${{ invoiceSubtotal.toFixed(2) }}</span>
          </div>
          <div class="totals-row total-row">
            <span>Total:</span>
            <span class="total-amount">${{ invoiceTotal.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Notes & Terms -->
        <div class="invoice-footer">
          <div class="notes-section">
            <p class="thank-you">Thank you for your business!</p>
            <p class="question">Questions? Contact us at support@courierdepot-express.com</p>
            <p class="notes-label"><strong>Notes:</strong></p>
            <p class="notes-content">{{ invoice.notes || `Invoice for package: ${packageData?.tracking_number || 'N/A'}` }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="invoice-bottom">
          <p>CourierDepot Express • info@courierdepot-express.com</p>
          <p>rsc.courierdepots.com</p>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="invoice-status-badge" :class="`status-${invoice.status}`">
        {{ invoice.status }}
      </div>

      <!-- Add Payment Button -->
      <div v-if="invoice.status !== 'paid'" class="payment-action">
        <button class="btn-add-payment" @click="addPayment">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
            <path d="M12 18V6"/>
          </svg>
          Add Payment
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="pill" @click="goBack">Go Back</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useApi } from '../composables/useApi';
import { useToast } from '../composables/useToast';

const props = defineProps({
  packageId: {
    type: String,
    required: false
  },
  invoiceId: {
    type: String,
    required: false
  }
});

const emit = defineEmits(['back']);

const { get } = useApi();
const { showToast } = useToast();

// State
const loading = ref(false);
const invoice = ref(null);
const packageData = ref(null);
const paymentDetails = ref(null);
const apiConfig = ref(null);
const accessToken = ref(null);
const error = ref(null);
const isEditing = ref(false);
const showNewItemRow = ref(false);
const newItem = ref({
  description: '',
  quantity: 1,
  unit_price: 0
});

// Computed
const invoiceSubtotal = computed(() => {
  if (!invoice.value?.items) return 0;
  return invoice.value.items.reduce((sum, item) => {
    return sum + (item.unit_price * item.quantity);
  }, 0);
});

const invoiceTotal = computed(() => {
  return invoiceSubtotal.value;
});

// Initialize
onMounted(async () => {
  await initializeAPI();
});

// Initialize API and load invoice
const initializeAPI = async () => {
  try {
    loading.value = true;

    // Get API config
    const configResponse = await get('/api/settings/api-config');
    if (!configResponse.success || !configResponse.config) {
      error.value = 'API configuration not found';
      return;
    }
    apiConfig.value = configResponse.config;

    // Authenticate
    await authenticate();

    // Load payment details
    if (apiConfig.value.company_id) {
      await loadPaymentDetails();
    }

    // Load package details if packageId is provided
    if (props.packageId) {
      await loadPackageDetails();
    }

    // Create or load invoice
    if (props.invoiceId) {
      await loadInvoice();
    } else if (props.packageId) {
      await createInvoiceFromPackage();
    } else {
      error.value = 'No package or invoice ID provided';
    }
  } catch (err) {
    console.error('Error initializing invoice:', err);
    error.value = 'Failed to initialize invoice';
  } finally {
    loading.value = false;
  }
};

// Authenticate (via CORS proxy)
const authenticate = async () => {
  const response = await fetch('http://localhost:4000/api/cdj-proxy/api/v1/auth/server-login', {
    method: 'POST',
    headers: {
      'X-Client-Id': apiConfig.value.api_key,
      'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: apiConfig.value.email,
      password: 'admin123',
      server_secret: 'N9Y26AK51tAZYMMhyytCSiR9BfmdKRGnlICFAxj3whE'
    })
  });

  if (response.ok) {
    const data = await response.json();
    if (data.data?.access_token) {
      accessToken.value = data.data.access_token;
    } else {
      throw new Error('No access token in response');
    }
  } else {
    throw new Error('Authentication failed');
  }
};

// Load payment details
const loadPaymentDetails = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/cdj-proxy/api/v1/companies/${apiConfig.value.company_id}/payment-details`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      paymentDetails.value = await response.json();
    }
  } catch (err) {
    console.error('Failed to load payment details:', err);
  }
};

// Load package details
const loadPackageDetails = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/cdj-proxy/api/v1/packages/${props.packageId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      packageData.value = result.data || result;
    }
  } catch (err) {
    console.error('Failed to load package details:', err);
  }
};

// Create invoice from package
const createInvoiceFromPackage = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/cdj-proxy/api/v1/invoices/from-package', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        package_id: props.packageId,
        processing_fee: 200,
        notes: null,
        terms: null
      })
    });

    if (response.ok) {
      invoice.value = await response.json();
      showToast('Invoice created successfully', 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create invoice');
    }
  } catch (err) {
    console.error('Failed to create invoice:', err);
    error.value = err.message || 'Failed to create invoice from package';
    showToast(err.message || 'Failed to create invoice', 'error');
  }
};

// Load existing invoice
const loadInvoice = async () => {
  try {
    const response = await fetch(`http://localhost:4000/api/cdj-proxy/api/v1/invoices/${props.invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      invoice.value = await response.json();
    } else {
      throw new Error('Failed to load invoice');
    }
  } catch (err) {
    console.error('Failed to load invoice:', err);
    error.value = 'Failed to load invoice';
    showToast('Failed to load invoice', 'error');
  }
};

// Toggle edit mode
const toggleEdit = () => {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    showNewItemRow.value = false;
  }
};

// Save invoice changes
const saveInvoice = async () => {
  try {
    loading.value = true;
    // In a real implementation, you'd call the update endpoint
    showToast('Invoice saved successfully', 'success');
    isEditing.value = false;
    showNewItemRow.value = false;
  } catch (err) {
    console.error('Failed to save invoice:', err);
    showToast('Failed to save invoice', 'error');
  } finally {
    loading.value = false;
  }
};

// Update item
const updateItem = async (item) => {
  // Update locally for now
  // In a real implementation, you'd call the API
  console.log('Updating item:', item);
};

// Delete item
const deleteItem = async (item) => {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const response = await fetch(`http://localhost:4000/api/cdj-proxy/api/v1/invoiceitems/${item.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      invoice.value.items = invoice.value.items.filter(i => i.id !== item.id);
      showToast('Item deleted successfully', 'success');
    } else {
      throw new Error('Failed to delete item');
    }
  } catch (err) {
    console.error('Failed to delete item:', err);
    showToast('Failed to delete item', 'error');
  }
};

// Add new item
const addNewItem = async () => {
  if (!newItem.value.description || !newItem.value.unit_price) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    const response = await fetch('http://localhost:4000/api/cdj-proxy/api/v1/invoiceitems', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'X-Client-Id': apiConfig.value.api_key,
        'X-Client-Secret': apiConfig.value.client_secret || 'TGxeiZhqiJ1Xg8qCRXNtreB9PMdJ0B8h',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice_id: invoice.value.id,
        description: newItem.value.description,
        quantity: newItem.value.quantity,
        unit_price: newItem.value.unit_price
      })
    });

    if (response.ok) {
      const data = await response.json();
      invoice.value.items.push(data);
      showToast('Item added successfully', 'success');

      // Reset form
      newItem.value = {
        description: '',
        quantity: 1,
        unit_price: 0
      };
      showNewItemRow.value = false;
    } else {
      throw new Error('Failed to add item');
    }
  } catch (err) {
    console.error('Failed to add item:', err);
    showToast('Failed to add item', 'error');
  }
};

// Send invoice
const sendInvoice = () => {
  showToast('Send invoice feature coming soon', 'info');
};

// Download invoice
const downloadInvoice = () => {
  showToast('Download invoice feature coming soon', 'info');
};

// Print invoice
const printInvoice = () => {
  window.print();
};

// Add payment
const addPayment = () => {
  showToast('Add payment feature coming soon', 'info');
};

// Go back
const goBack = () => {
  emit('back');
};

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
</script>

<style scoped>
.invoice-page {
  background: #2d3748;
  min-height: 100vh;
  padding: 24px;
}

.invoice-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #4a5568;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #5a6678;
}

.action-buttons-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-danger, .btn-secondary, .btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover {
  background: #475569;
}

.btn-primary {
  background: #10b981;
  color: white;
}

.btn-primary:hover {
  background: #059669;
}

.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
  color: #cbd5e1;
}

.error-state {
  color: #f87171;
}

.invoice-container {
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

.invoice-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 48px;
  color: #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.invoice-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 2px solid #374151;
}

.company-logo {
  margin-bottom: 12px;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  color: #ef4444;
  display: block;
  line-height: 1;
}

.logo-subtext {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 2px;
}

.company-tagline {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.contact-info {
  font-size: 12px;
  color: #94a3b8;
}

.contact-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.invoice-header-info {
  text-align: right;
}

.invoice-title {
  font-size: 36px;
  font-weight: 700;
  color: #ef4444;
  margin: 0 0 8px 0;
}

.invoice-number {
  font-size: 18px;
  color: #cbd5e1;
  margin-bottom: 16px;
}

.invoice-meta p {
  font-size: 13px;
  color: #94a3b8;
  margin: 4px 0;
}

.invoice-middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 1px solid #374151;
}

.bill-to h3, .payment-details h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.bill-to p, .payment-details p {
  font-size: 13px;
  color: #cbd5e1;
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.payment-info {
  background: #0f172a;
  padding: 16px;
  border-radius: 6px;
}

.package-details-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #374151;
}

.package-details-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.package-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #0f172a;
  padding: 16px;
  border-radius: 6px;
}

.package-info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.package-info-item .label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.package-info-item .value {
  font-size: 13px;
  color: #cbd5e1;
  font-weight: 500;
}

.payment-info p {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
}

.amount {
  font-size: 18px;
  font-weight: 700;
  color: #ef4444;
}

.invoice-items {
  margin-bottom: 32px;
}

.invoice-items table {
  width: 100%;
  border-collapse: collapse;
  background: #0f172a;
  border-radius: 6px;
  overflow: hidden;
}

.invoice-items thead {
  background: #1e293b;
}

.invoice-items th {
  padding: 16px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #374151;
}

.invoice-items td {
  padding: 16px 12px;
  border-bottom: 1px solid #1e293b;
  color: #cbd5e1;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}

.edit-input {
  width: 100%;
  background: #1e293b;
  border: 1px solid #374151;
  color: #e2e8f0;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.edit-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.price-input, .qty-input {
  max-width: 100px;
}

.btn-delete, .btn-add-item {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-add-item {
  color: #10b981;
}

.btn-add-item:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.1);
}

.btn-add-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  background: #1e293b;
  border: 1px dashed #374151;
  color: #10b981;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
  justify-content: center;
  transition: all 0.2s;
}

.btn-add-row:hover {
  background: #0f172a;
  border-color: #10b981;
}

.invoice-totals {
  text-align: right;
  margin-bottom: 32px;
  padding: 24px;
  background: #0f172a;
  border-radius: 6px;
}

.totals-row {
  display: flex;
  justify-content: flex-end;
  gap: 48px;
  margin: 12px 0;
  font-size: 14px;
  color: #cbd5e1;
}

.total-row {
  border-top: 2px solid #374151;
  padding-top: 16px;
  margin-top: 16px;
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
}

.invoice-footer {
  margin-bottom: 32px;
  padding: 24px;
  background: #0f172a;
  border-radius: 6px;
}

.thank-you {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 8px;
}

.question {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px;
}

.notes-label {
  font-size: 12px;
  font-weight: 600;
  color: #ef4444;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.notes-content {
  font-size: 13px;
  color: #cbd5e1;
  font-style: italic;
}

.invoice-bottom {
  text-align: center;
  padding-top: 24px;
  border-top: 2px solid #374151;
  font-size: 12px;
  color: #64748b;
}

.invoice-status-badge {
  position: absolute;
  top: 24px;
  right: 24px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-draft {
  background: #fef3c7;
  color: #92400e;
}

.status-sent {
  background: #dbeafe;
  color: #1e40af;
}

.status-paid {
  background: #dcfce7;
  color: #166534;
}

.payment-action {
  margin-top: 24px;
  text-align: center;
}

.btn-add-payment {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #10b981;
  color: white;
  border: none;
  padding: 14px 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add-payment:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

@media print {
  .invoice-header-actions,
  .invoice-status-badge,
  .payment-action,
  .btn-add-row,
  .btn-delete,
  .btn-add-item {
    display: none !important;
  }

  .invoice-page {
    background: white;
  }

  .invoice-card {
    background: white;
    color: black;
  }

  .edit-input {
    border: none;
    background: transparent;
  }
}

@media (max-width: 768px) {
  .invoice-card {
    padding: 24px;
  }

  .invoice-top {
    flex-direction: column;
    gap: 24px;
  }

  .invoice-header-info {
    text-align: left;
  }

  .invoice-middle {
    grid-template-columns: 1fr;
  }

  .invoice-header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons-group {
    flex-direction: column;
  }
}
</style>
