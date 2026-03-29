const API_URL = 'https://script.google.com/macros/s/AKfycbw43DSC0qNfwsRo5G785zpzmaQ3IrWAa9ndF0yfX62eeB1zWkg6Omj_8Yhsv4dTLRoaFw/exec';

let inventory = [];

async function fetchInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="center">Loading...</td></tr>';

  try {
    const res = await fetch(`${API_URL}?action=list`);
    const json = await res.json();

    if (!json.success) throw new Error(json.message || 'Failed to load inventory.');

    inventory = json.data || [];
    populateCategoryFilter(inventory);
    renderInventory();
    updateStats();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="center">${err.message}</td></tr>`;
  }
}

function populateCategoryFilter(items) {
  const select = document.getElementById('categoryFilter');
  const current = select.value;
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  select.innerHTML = '<option value="">All Categories</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  select.value = current;
}

function renderInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;

  const filtered = inventory.filter(item => {
    const matchesCategory = !category || item.category === category;
    const haystack = [
      item.id,
      item.category,
      item.item_name,
      item.brand,
      item.remarks
    ].join(' ').toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="center">No items found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td>${escapeHtml(item.id)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${escapeHtml(item.item_name)}</td>
      <td>${escapeHtml(item.brand || '')}</td>
      <td>${escapeHtml(String(item.quantity || ''))}</td>
      <td>${formatNumber(item.price)}</td>
      <td>${formatNumber(item.grand_total)}</td>
      <td>${escapeHtml(item.remarks || '')}</td>
    </tr>
  `).join('');
}

function updateStats() {
  document.getElementById('totalItems').textContent = inventory.length;

  const totalQty = inventory.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0);
  }, 0);

  document.getElementById('totalQty').textContent = totalQty;
  document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString();
}

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

document.getElementById('searchInput').addEventListener('input', renderInventory);
document.getElementById('categoryFilter').addEventListener('change', renderInventory);
document.getElementById('refreshBtn').addEventListener('click', fetchInventory);

fetchInventory();
setInterval(fetchInventory, 30000);