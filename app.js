const API_URL = 'https://script.google.com/macros/s/AKfycbw43DSC0qNfwsRo5G785zpzmaQ3IrWAa9ndF0yfX62eeB1zWkg6Omj_8Yhsv4dTLRoaFw/exec';

let inventory = [];
let filteredInventory = [];
let currentPage = 1;

async function fetchInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  tbody.innerHTML = '<tr><td colspan="9" class="center muted-cell">Loading...</td></tr>';

  try {
    const res = await fetch(`${API_URL}?action=list`);
    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Failed to load inventory.');
    }

    inventory = json.data || [];
    populateCategoryFilter(inventory);
    applyFilters();
    updateStats();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="center muted-cell">${escapeHtml(err.message)}</td></tr>`;
  }
}

function populateCategoryFilter(items) {
  const select = document.getElementById('categoryFilter');
  const current = select.value;
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))];

  select.innerHTML = '<option value="">All</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
  select.value = current;
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const category = document.getElementById('categoryFilter').value;
  const field = document.getElementById('fieldFilter').value;

  filteredInventory = inventory.filter(item => {
    const matchesCategory = !category || item.category === category;

    let haystack = '';
    if (field === 'all') {
      haystack = [
        item.id,
        item.item_name,
        item.category,
        item.brand,
        item.manufacturer,
        item.model_or_specification,
        item.remarks
      ].join(' ');
    } else {
      haystack = String(item[field] || '');
    }

    const matchesSearch = !search || haystack.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  currentPage = 1;
  renderInventory();
}

function renderInventory() {
  const tbody = document.getElementById('inventoryTableBody');
  const rowsPerPage = Number(document.getElementById('rowsPerPage').value) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / rowsPerPage));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * rowsPerPage;
  const pageItems = filteredInventory.slice(start, start + rowsPerPage);

  if (!pageItems.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="center muted-cell">No items found.</td></tr>';
    updatePagination(0, 0, 0);
    return;
  }

  tbody.innerHTML = pageItems.map(item => `
    <tr>
      <td>${escapeHtml(item.id || '')}</td>
      <td>${escapeHtml(item.item_name || '')}</td>
      <td><span class="category-chip ${getCategoryBadgeClass(item.category)}">${escapeHtml(item.category || '-')}</span></td>
      <td>${escapeHtml(item.brand || '-')}</td>
      <td>${escapeHtml(String(item.quantity || '0'))}</td>
      <td>${formatNumber(item.price)}</td>
      <td>${formatNumber(item.grand_total)}</td>
      <td>${escapeHtml(item.remarks || '-')}</td>
      <td>
        <button type="button" class="view-btn" onclick="openDetails('${escapeJs(item.id || '')}')">View</button>
      </td>
    </tr>
  `).join('');

  updatePagination(start + 1, Math.min(start + pageItems.length, filteredInventory.length), filteredInventory.length);
}

function updatePagination(from, to, total) {
  const rowsPerPage = Number(document.getElementById('rowsPerPage').value) || 10;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('tableMeta').textContent = total ? `Showing ${from}-${to} of ${total} items` : 'Showing 0 items';
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function openDetails(itemId) {
  const item = inventory.find(entry => String(entry.id) === String(itemId));
  if (!item) return;

  const fields = [
    ['ID', item.id],
    ['Category', item.category],
    ['Item Name', item.item_name],
    ['Model / Specification', item.model_or_specification],
    ['Manufacturer', item.manufacturer],
    ['Brand', item.brand],
    ['Purpose', item.purpose],
    ['Quality', item.quality],
    ['Quantity', item.quantity],
    ['Price', formatNumber(item.price)],
    ['Grand Total', formatNumber(item.grand_total)],
    ['Remarks', item.remarks],
    ['Comments', item.comments],
    ['Deadline', item.deadline],
    ['1 Month Quantity', item.one_month_quantity],
    ['3 Month Quantity', item.three_month_quantity],
    ['Source Sheet', item.source_sheet],
    ['Created At', item.created_at],
    ['Updated At', item.updated_at],
    ['Updated By', item.updated_by]
  ];

  document.getElementById('detailsContent').innerHTML = fields.map(([label, value]) => `
    <div class="detail-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value === undefined || value === null || value === '' ? '-' : String(value))}</strong>
    </div>
  `).join('');

  document.getElementById('detailsModal').classList.remove('hidden');
}

function closeDetails() {
  document.getElementById('detailsModal').classList.add('hidden');
}

function updateStats() {
  const totalItems = inventory.length;
  const totalQty = inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalCategories = new Set(inventory.map(item => item.category).filter(Boolean)).size;
  const totalValue = inventory.reduce((sum, item) => sum + (Number(item.grand_total) || 0), 0);

  document.getElementById('totalItems').textContent = totalItems.toLocaleString();
  document.getElementById('totalQty').textContent = totalQty.toLocaleString();
  document.getElementById('totalCategories').textContent = totalCategories.toLocaleString();
  document.getElementById('totalValue').textContent = totalValue.toLocaleString();

  document.getElementById('stickyTotalItems').textContent = totalItems.toLocaleString();
  document.getElementById('stickyTotalQty').textContent = totalQty.toLocaleString();
  document.getElementById('stickyTotalValue').textContent = totalValue.toLocaleString();
  document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString();
}

function exportCSV() {
  const rows = filteredInventory.length ? filteredInventory : inventory;
  const headers = [
    'id',
    'item_name',
    'category',
    'brand',
    'quantity',
    'price',
    'grand_total',
    'remarks'
  ];

  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(key => csvEscape(row[key])).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'inventory-export.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const stringValue = value === undefined || value === null ? '' : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function getCategoryBadgeClass(category) {
  const value = String(category || '').toLowerCase().trim();

  if (value === 'lab tools') return 'badge-lab-tools';
  if (value === 'lab equipment') return 'badge-lab-equipment';
  if (value === 'safety equipment') return 'badge-safety-equipment';
  if (value === 'furniture items') return 'badge-furniture-items';
  if (value === 'consumable items') return 'badge-consumable-items';
  return 'badge-default';
}

function formatNumber(value) {
  if (value === '' || value === null || value === undefined) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
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

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('categoryFilter').addEventListener('change', applyFilters);
document.getElementById('fieldFilter').addEventListener('change', applyFilters);
document.getElementById('rowsPerPage').addEventListener('change', renderInventory);

document.getElementById('refreshBtn').addEventListener('click', fetchInventory);
document.getElementById('refreshBtnTop').addEventListener('click', fetchInventory);
document.getElementById('printBtn').addEventListener('click', () => window.print());
document.getElementById('exportBtn').addEventListener('click', exportCSV);

document.getElementById('prevPageBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderInventory();
  }
});

document.getElementById('nextPageBtn').addEventListener('click', () => {
  const rowsPerPage = Number(document.getElementById('rowsPerPage').value) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / rowsPerPage));
  if (currentPage < totalPages) {
    currentPage += 1;
    renderInventory();
  }
});

document.getElementById('closeDetailsBtn').addEventListener('click', closeDetails);
document.getElementById('detailsBackdrop').addEventListener('click', closeDetails);

fetchInventory();
setInterval(fetchInventory, 30000);
