const API_URL = 'https://script.google.com/macros/s/AKfycbx7tpArksznuYUx3XQ7_qZpv30gV2E-nhdzSmtib-TKUIORJgTS8Cu02KPieRW1fpUThg/exec';

let currentUser = null;
let masterBarang = [];
let masterUnit = [];

// ============================================
// LOGIN (DENGAN PENGAMAN LOCALSTORAGE)
// ============================================
async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMessage');
  if (!email) { msg.textContent = 'Email wajib diisi'; return; }
  msg.textContent = 'Memproses...';
  
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { email, password } }) });
    const result = await res.json();
    
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('user', JSON.stringify(currentUser)); // Simpan sesi
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
      await loadDataAwal();
    } else { 
      msg.textContent = result.message; 
    }
  } catch (err) { 
    msg.textContent = 'Error: ' + err.message; 
  }
}

function doLogout() { 
  localStorage.removeItem('user'); // Hapus sesi
  location.reload(); 
}

// ============================================
// LOAD DATA AWAL
// ============================================
async function loadDataAwal() {
  try {
    const resBarang = await fetch(API_URL + '?action=getMasterBarang');
    const jsonBarang = await resBarang.json();
    if (jsonBarang.success) masterBarang = jsonBarang.data;

    const resUnit = await fetch(API_URL + '?action=getMasterUnit');
    const jsonUnit = await resUnit.json();
    if (jsonUnit.success) masterUnit = jsonUnit.data;

    isiDropdown();
    isiTabelBarang();
    isiTabelUnit();
    loadDashboard();
  } catch (error) {
    console.log("Gagal load data", error);
  }
}

function isiDropdown() {
  let optBarang = '<option value="">-- Pilih Barang --</option>';
  masterBarang.forEach(b => { optBarang += `<option value="${b.ItemID}">${b.ItemID} - ${b.NamaBarang}</option>`; });
  
  if(document.getElementById('masukBarang')) document.getElementById('masukBarang').innerHTML = optBarang;
  if(document.getElementById('keluarBarang')) document.getElementById('keluarBarang').innerHTML = optBarang;
  if(document.getElementById('kartuBarangSelect')) document.getElementById('kartuBarangSelect').innerHTML = optBarang;

  let optUnit = '<option value="">-- Pilih Unit --</option>';
  masterUnit.forEach(u => { optUnit += `<option value="${u.IDUnit}">${u.IDUnit} - ${u.SerialNumber}</option>`; });
  
  if(document.getElementById('keluarUnit')) document.getElementById('keluarUnit').innerHTML = optUnit;
  if(document.getElementById('filterUnit')) document.getElementById('filterUnit').innerHTML = '<option value="">Semua Unit</option>' + optUnit;

  const today = new Date().toISOString().split('T')[0];
  if(document.getElementById('masukTanggal')) document.getElementById('masukTanggal').value = today;
  if(document.getElementById('keluarTanggal')) document.getElementById('keluarTanggal').value = today;
}

function isiTabelBarang() {
  if(!document.getElementById('listBarang')) return;
  let html = '';
  masterBarang.forEach(b => { html += `<tr><td>${b.ItemID}</td><td>${b.NamaBarang}</td><td>${b.Kategori}</td><td>${b.Satuan}</td><td>${b.StokMinimum}</td></tr>`; });
  document.getElementById('listBarang').innerHTML = `<table><thead><tr><th>ID</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Min</th></tr></thead><tbody>${html}</tbody></table>`;
}

function isiTabelUnit() {
  if(!document.getElementById('listUnit')) return;
  let html = '';
  masterUnit.forEach(u => { html += `<tr><td>${u.IDUnit}</td><td>${u.JenisAlat}</td><td>${u.SerialNumber}</td><td>${u.Project}</td><td>${u.StatusUnit}</td></tr>`; });
  document.getElementById('listUnit').innerHTML = `<table><thead><tr><th>ID Unit</th><th>Jenis</th><th>Serial</th><th>Project</th><th>Status</th></tr></thead><tbody>${html}</tbody></table>`;
}

async function loadDashboard() {
  try {
    const res = await fetch(API_URL + '?action=getDashboard');
    const result = await res.json();
    if (result.success) {
      document.getElementById('dashTotalBarang').textContent = result.data.totalBarang;
      document.getElementById('dashTotalUnit').textContent = result.data.totalUnit;
      document.getElementById('dashTotalMasuk').textContent = result.data.totalMasuk;
      document.getElementById('dashTotalKeluar').textContent = result.data.totalKeluar;
    }
  } catch(e) {}
}

// ============================================
// SUBMIT FORM (ANTI RELOAD)
// ============================================
async function submitMasuk(e) {
  e.preventDefault(); // Mencegah halaman reload
  const msg = document.getElementById('masukMessage');
  msg.textContent = 'Menyimpan...';
  
  const data = {
    tanggal: document.getElementById('masukTanggal').value,
    itemId: document.getElementById('masukBarang').value,
    qty: Number(document.getElementById('masukQty').value),
    supplier: document.getElementById('masukSupplier').value,
    keterangan: document.getElementById('masukKeterangan').value,
    namaPIC: currentUser ? currentUser.nama : 'Admin',
    email: currentUser ? currentUser.email : 'admin@npm.com'
  };
  
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'barangMasuk', data }) });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      document.getElementById('formMasuk').reset(); 
      document.getElementById('masukTanggal').value = new Date().toISOString().split('T')[0]; 
      loadDataAwal(); 
    } else { 
      msg.textContent = '✗ ' + result.message; msg.className = 'error'; 
    }
  } catch (err) { 
    msg.textContent = 'Error: ' + err.message; msg.className = 'error'; 
  }
}

async function submitKeluar(e) {
  e.preventDefault(); // Mencegah halaman reload
  const msg = document.getElementById('keluarMessage');
  msg.textContent = 'Menyimpan...';
  const idUnit = document.getElementById('keluarUnit').value;
  const unitData = masterUnit.find(u => u.IDUnit === idUnit);
  
  const data = {
    tanggal: document.getElementById('keluarTanggal').value,
    itemId: document.getElementById('keluarBarang').value,
    qty: Number(document.getElementById('keluarQty').value),
    idUnit: idUnit,
    jenisUnit: unitData ? unitData.JenisAlat : '-',
    serialNumber: unitData ? unitData.SerialNumber : '-',
    keterangan: document.getElementById('keluarKeterangan').value,
    namaPIC: currentUser ? currentUser.nama : 'Admin',
    email: currentUser ? currentUser.email : 'admin@npm.com'
  };
  
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'barangKeluar', data }) });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      document.getElementById('formKeluar').reset(); 
      document.getElementById('keluarTanggal').value = new Date().toISOString().split('T')[0]; 
      loadDataAwal(); 
    } else { 
      msg.textContent = '✗ ' + result.message; msg.className = 'error'; 
    }
  } catch (err) { 
    msg.textContent = 'Error: ' + err.message; msg.className = 'error'; 
  }
}

// ============================================
// NAVIGASI
// ============================================
function showPage(page) {
  document.querySelectorAll('.content').forEach(el => el.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');
}

// Cek sesi saat halaman dimuat
window.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('user');
  if (saved) {
    currentUser = JSON.parse(saved);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
    await loadDataAwal();
  }
});