const API_URL = 'https://script.google.com/macros/s/AKfycbx7tpArksznuYUx3XQ7_qZpv30gV2E-nhdzSmtib-TKUIORJgTS8Cu02KPieRW1fpUThg/exec';

let currentUser = null;
let masterBarang = [];
let masterUnit = [];

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const msg = document.getElementById('loginMessage');
  if (!email) { msg.textContent = 'Email wajib diisi'; return; }
  msg.textContent = 'Memproses...';
  try {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { email } }) });
    const result = await res.json();
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('user', JSON.stringify(currentUser)); 
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
      await loadInitialData();
    } else { msg.textContent = result.message; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; }
}

function doLogout() { localStorage.removeItem('user'); location.reload(); }

async function loadInitialData() {
  try {
    const [resBarang, resUnit] = await Promise.all([
      fetch(API_URL + '?action=getMasterBarang'),
      fetch(API_URL + '?action=getMasterUnit')
    ]);
    const jsonBarang = await resBarang.json();
    const jsonUnit = await resUnit.json();
    
    if (jsonBarang.success) masterBarang = jsonBarang.data;
    if (jsonUnit.success) masterUnit = jsonUnit.data;

    fillDropdowns();
    loadListBarang();
    loadListUnit();
    loadDashboard();
  } catch (error) { console.error("Gagal load data", error); }
}

function fillDropdowns() {
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

function loadListBarang() {
  if(!document.getElementById('listBarang')) return;
  let html = '';
  masterBarang.forEach(b => { 
    html += `<tr>
      <td>${b.ItemID}</td>
      <td>${b.KodeItem || '-'}</td>
      <td>${b.NamaBarang}</td>
      <td>${b.Kategori}</td>
      <td>${b.Satuan}</td>
      <td>${b.StokMinimum}</td>
      <td>
        <button onclick="editBarang('${b.ItemID}')" style="background:orange; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Edit</button>
        <button onclick="konfirmasiHapus('${b.ItemID}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Hapus</button>
      </td>
    </tr>`; 
  });
  document.getElementById('listBarang').innerHTML = `<table><thead><tr><th>ID</th><th>Kode Item</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Min</th><th>Aksi</th></tr></thead><tbody>${html}</tbody></table>`;
}

function loadListUnit() {
  if(!document.getElementById('listUnit')) return;
  let html = '';
  masterUnit.forEach(u => { html += `<tr><td>${u.IDUnit}</td><td>${u.JenisAlat}</td><td>${u.SerialNumber}</td><td>${u.Project}</td><td>${u.StatusUnit}</td></tr>`; });
  document.getElementById('listUnit').innerHTML = `<table><thead><tr><th>ID Unit</th><th>Jenis</th><th>Serial</th><th>Project</th><th>Status</th></tr></thead><tbody>${html}</tbody></table>`;
}

function filterBarang() {
  const q = document.getElementById('searchBarang').value.toLowerCase();
  const rows = document.querySelectorAll('#listBarang tbody tr');
  rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
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
      const recent = result.data.transaksiTerbaru.map(t => `<div class="card" style="margin-bottom:8px"><small>${formatDate(t.tanggal)}</small><br><strong>${t.itemId}</strong> - ${t.jenis} ${t.qty} (${t.pic})</div>`).join('');
      if(document.getElementById('dashRecent')) document.getElementById('dashRecent').innerHTML = recent;
    }
  } catch(e) {}
}

async function submitMasuk(e) {
  e.preventDefault(); 
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
    if (result.success) { msg.textContent = '✓ ' + result.message; msg.className
