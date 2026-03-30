const API_URL = 'https://script.google.com/macros/s/AKfycbw43DSC0qNfwsRo5G785zpzmaQ3IrWAa9ndF0yfX62eeB1zWkg6Omj_8Yhsv4dTLRoaFw/exec';

let currentIdToken = '';
let adminInventory = [];
let editingItemId = '';

function handleCredentialResponse(response) {
  currentIdToken = response.credential;
  checkAdmin();
}

async function checkAdmin() {
  const status = document.getElementById('adminStatus');
  const panel = document.getElementById('adminPanel');
  const listPanel = document.getElementById('adminListPanel');

  status.textContent = 'Checking access...';
  panel.classList.add('hidden');
  listPanel.classList.add('hidden');

  try {
    const res = await fetch(`${API_URL}?action=me&idToken=${encodeURIComponent(currentIdToken)}`);
    const json = await res.json();

    if (!json.success || !json.isAuthenticated) {
      status.textContent = json.message || 'Sign-in failed or token expired.';
      return;
    }

    if (!json.isAdmin) {
      status.textContent = `Signed in as ${json.email}, but this account is not allowed to edit inventory.`;
      return;
    }

    status.textContent = `Signed in as ${json.email}. Admin access granted.`;
    panel.classList.remove('hidden');
    listPanel.classList.remove('hidden');
    loadAdminInventory();
  } catch (err) {
    status.textContent = err.message || 'Access check failed.';
  }
}

async function loadAdminInventory() {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="center">Loading...</td></tr>';

  try {
    const res = await fetch(`${API_URL}?action=list`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message || 'Failed to load inventory.');

    adminInventory = json.data || [];
    renderAdminInventory();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="center">${err.message}</td></tr>`;
  }
}

function renderAdminInventory() {
  const tbody = document.getElementById('adminTableBody');

  if (!adminInventory.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="center">No items found.</td></tr>';
    return;
  }

  tbody.innerHTML = adminInventory.map(item => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.item_name)}</td>
      <td>${escapeHtml(item.brand || '')}</td>
      <td>${escapeHtml(String(item.quantity || ''))}</td>
      <td>${formatNumber(item.price)}</td>
      <td>${formatNumber(item.grand_total)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="small-btn" onclick="startEdit('${escapeJs(item.id)}')">Edit</button>
          <button type="button" class="small-btn danger-btn" onclick="deleteItem('${escapeJs(item.id)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function startEdit(itemId) {
  const item = adminInventory.find(i => String(i.id) === String(itemId));
  if (!item) return;

  editingItemId = item.id;
  const form = document.getElementById('itemForm');

  form.id.value = item.id || '';
  form.category.value = item.category || '';
  form.item_name.value = item.item_name || '';
  form.model_or_specification.value = item.model_or_specification || '';
  form.manufacturer.value = item.manufacturer || '';
  form.brand.value = item.brand || '';
  form.purpose.value = item.purpose || '';
  form.quality.value = item.quality || '';
  form.quantity.value = item.quantity || '';
  form.price.value = item.price || '';
  form.grand_total.value = item.grand_total || '';
  form.deadline.value = item.deadline || '';
  form.one_month_quantity.value = item.one_month_quantity || '';
  form.three_month_quantity.value = item.three_month_quantity || '';
  form.source_sheet.value = item.source_sheet || '';
  form.remarks.value = item.remarks || '';
  form.comments.value = item.comments || '';

  document.getElementById('formTitle').textContent = `Edit Item ${item.id}`;
  document.getElementById('submitBtn').textContent = 'Update Item';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('formMessage').textContent = 'Editing selected item.';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormMode() {
  editingItemId = '';
  document.getElementById('itemForm').reset();
  document.getElementById('itemForm').id.value = '';
  document.getElementById('formTitle').textContent = 'Add Inventory Item';
  document.getElementById('submitBtn').textContent = 'Add Item';
  document.getElementById('cancelEditBtn').classList.add('hidden');
}

async function deleteItem(itemId) {
  const ok = window.confirm(`Delete item ${itemId}?`);
  if (!ok) return;

  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = 'Deleting...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        idToken: currentIdToken,
        itemId
      })
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete item.');

    formMessage.textContent = 'Item deleted successfully.';
    if (editingItemId === itemId) resetFormMode();
    loadAdminInventory();
  } catch (err) {
    formMessage.textContent = err.message || 'Delete failed.';
  }
}

document.getElementById('itemForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = editingItemId ? 'Updating...' : 'Saving...';

  const formData = new FormData(e.target);
  const item = Object.fromEntries(formData.entries());

  try {
    const payload = {
      action: editingItemId ? 'update' : 'add',
      idToken: currentIdToken,
      item: item
    };

    if (editingItemId) payload.itemId = editingItemId;

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to save item.');

    formMessage.textContent = json.message || 'Saved successfully.';
    resetFormMode();
    loadAdminInventory();
  } catch (err) {
    formMessage.textContent = err.message || 'Save failed.';
  }
});

document.getElementById('cancelEditBtn').addEventListener('click', function() {
  resetFormMode();
  document.getElementById('formMessage').textContent = 'Edit cancelled.';
});

document.getElementById('reloadAdminListBtn').addEventListener('click', loadAdminInventory);

function formatNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return num.toLocaleString();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeJs(str) {
  return String(str).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
