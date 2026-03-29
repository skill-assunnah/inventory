const API_URL = 'https://script.google.com/macros/s/AKfycbw43DSC0qNfwsRo5G785zpzmaQ3IrWAa9ndF0yfX62eeB1zWkg6Omj_8Yhsv4dTLRoaFw/exec';

let currentIdToken = '';

function handleCredentialResponse(response) {
  currentIdToken = response.credential;
  checkAdmin();
}

async function checkAdmin() {
  const status = document.getElementById('adminStatus');
  const panel = document.getElementById('adminPanel');

  status.textContent = 'Checking access...';
  panel.classList.add('hidden');

  try {
    const res = await fetch(`${API_URL}?action=me&idToken=${encodeURIComponent(currentIdToken)}`);
    const json = await res.json();

    if (!json.success || !json.isAuthenticated) {
      status.textContent = 'Sign-in failed or token expired.';
      return;
    }

    if (!json.isAdmin) {
      status.textContent = `Signed in as ${json.email}, but this account is not allowed to edit inventory.`;
      return;
    }

    status.textContent = `Signed in as ${json.email}. Admin access granted.`;
    panel.classList.remove('hidden');
  } catch (err) {
    status.textContent = err.message || 'Access check failed.';
  }
}

document.getElementById('itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = 'Saving...';

  const formData = new FormData(e.target);
  const item = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'add',
        idToken: currentIdToken,
        item
      })
    });

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Failed to save item.');
    }

    formMessage.textContent = 'Item added successfully.';
    e.target.reset();
  } catch (err) {
    formMessage.textContent = err.message || 'Failed to save.';
  }
});