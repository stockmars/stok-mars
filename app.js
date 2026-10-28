const API_URL = 'https://script.google.com/macros/s/AKfycbx7tpArksznuYUx3XQ7_qZpv30gV2E-nhdzSmtib-TKUIORJgTS8Cu02KPieRW1fpUThg/exec';

let currentUser = null;
let masterBarang = [];
let masterUnit = [];
let masterSupplier = [];
let masterProject = [];

// ============================================
// DROPDOWN TOGGLE
// ============================================
function toggleDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('masterDropdown');
  if (dd) dd.classList.toggle('show');
}
function closeDropdown() {
  const dd = document.getElementById('masterDropdown');
  if (dd) dd.classList.remove('show');
}
document.addEventListener('click', function(e) {
  const dd = document.getElementById('masterDropdown');
  if (dd && !e.target.closest('.dropdown')) dd.classList.remove('show');
});

// ============================================
// TOKEN & AUTH
// ============================================
function getToken() {
  return localStorage.getItem('token') || '';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMessage');
  
  if (!email || !password) { msg.textContent = 'Email dan Password wajib diisi'; return; }
  msg.textContent = 'Memproses...';
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'login', data: { email, password } }) 
    });
    const result = await res.json();
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('token', result.token); 
      localStorage.setItem('user', JSON.stringify(currentUser)); 
      
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
      applyRolePermissions();
      await loadInitialData();
    } else { msg.textContent = result.message; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; }
}

function doLogout() { 
  localStorage.removeItem('token'); 
  localStorage.removeItem('user'); 
  location.reload(); 
}

// ============================================
// HAK AKSES
// ============================================
function applyRolePermissions() {
  if (!currentUser) return;
  const menuMaster = document.getElementById('menuMaster');
  if (menuMaster) menuMaster.style.display = 'inline-block'; 
}

// ============================================
// LOAD DATA AWAL
// ============================================
async function loadInitialData() {
  try {
    const token = getToken();
    const fetchData = (action) => fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: action, token: token })
    }).then(res => res.json());

    const [jsonBarang, jsonUnit, jsonSupplier, jsonProject] = await Promise.all([
      fetchData('getMasterBarang'),
      fetchData('getMasterUnit'),
      fetchData('getMasterSupplier'),
      fetchData('getMasterProject')
    ]);
    
    if (jsonBarang.success) masterBarang = jsonBarang.data;
    if (jsonUnit.success) masterUnit = jsonUnit.data;
    if (jsonSupplier.success) masterSupplier = jsonSupplier.data;
    if (jsonProject.success) masterProject = jsonProject.data;

    fillDropdowns();
    loadListBarang();
    loadListUnit();
    loadListSupplier();
    loadListProject();
    loadDashboard();
  } catch (error) { 
    console.error("Gagal load data", error); 
  }
}

// ============================================
// TAMPILAN & DROPDOWN
// ============================================
function fillDropdowns() {
  // 1. Datalist barang masuk & keluar
  let optDatalist = '';
  masterBarang.forEach(b => { 
    const kode = (b.KodeItem && b.KodeItem !== '-') ? `[${b.KodeItem}] ` : '';
    const merek = (b.Merek && b.Merek !== '-') ? ` (${b.Merek})` : '';
    optDatalist += `<option value="${b.ItemID} - ${b.NamaBarang} ${kode}${merek}"></option>`; 
  });
  if(document.getElementById('listBarangMasuk')) document.getElementById('listBarangMasuk').innerHTML = optDatalist;
  if(document.getElementById('listBarangKeluar')) document.getElementById('listBarangKeluar').innerHTML = optDatalist;

  // 2. Datalist Kartu Stok
  let optDatalistKartu = '';
  masterBarang.forEach(b => { 
    const kode = (b.KodeItem && b.KodeItem !== '-') ? `[${b.KodeItem}] ` : '';
    const merek = (b.Merek && b.Merek !== '-') ? ` (${b.Merek})` : '';
    optDatalistKartu += `<option value="${b.ItemID} - ${b.NamaBarang} ${kode}${merek}"></option>`; 
  });
  if(document.getElementById('listKartuBarang')) document.getElementById('listKartuBarang').innerHTML = optDatalistKartu;

  // 3. Dropdown Unit
  let optUnit = '<option value="">-- Pilih Unit --</option>';
  masterUnit.forEach(u => { optUnit += `<option value="${u.IDUnit}">${u.IDUnit} - ${u.SerialNumber}</option>`; });
  if(document.getElementById('keluarUnit')) document.getElementById('keluarUnit').innerHTML = optUnit;
  if(document.getElementById('filterUnit')) document.getElementById('filterUnit').innerHTML = '<option value="">Semua Unit</option>' + optUnit;
  
  // 4. Dropdown Supplier
  let optSupplier = '<option value="">-- Pilih Supplier --</option>';
  masterSupplier.forEach(s => { optSupplier += `<option value="${s.NamaSupplier}">${s.NamaSupplier}</option>`; });
  if(document.getElementById('masukSupplier')) document.getElementById('masukSupplier').innerHTML = optSupplier;

  // 5. Dropdown Project & Lokasi
  let optProject = '<option value="">-- Pilih Project --</option>';
  masterProject.forEach(p => { optProject += `<option value="${p.NamaProject}" data-lokasi="${p.Lokasi || ''}">${p.NamaProject}</option>`; });
  if(document.getElementById('keluarProject')) {
    const sel = document.getElementById('keluarProject');
    const current = sel.value;
    sel.innerHTML = optProject;
    if (current) sel.value = current;
  }

  let optLokasi = '<option value="">-- Pilih Lokasi --</option>';
  masterProject.forEach(p => { 
    if (p.Lokasi && p.Lokasi !== '-') optLokasi += `<option value="${p.Lokasi}">${p.Lokasi}</option>`; 
  });
  if(document.getElementById('keluarLokasi')) {
    const sel = document.getElementById('keluarLokasi');
    const current = sel.value;
    sel.innerHTML = optLokasi;
    if (current) sel.value = current;
  }

  // 6. Set Tanggal Hari Ini
  const today = new Date().toISOString().split('T')[0];
  if(document.getElementById('masukTanggal')) document.getElementById('masukTanggal').value = today;
  if(document.getElementById('keluarTanggal')) document.getElementById('keluarTanggal').value = today;

  // 7. Dropdown Filter Project
  if (document.getElementById('filterProjectSelect')) {
    let optFilterProject = '<option value="">Semua Project</option>';
    masterProject.forEach(p => {
      const lok = (p.Lokasi && p.Lokasi !== '-') ? ' (' + p.Lokasi + ')' : '';
      optFilterProject += `<option value="${p.NamaProject}">${p.NamaProject}${lok}</option>`;
    });
    document.getElementById('filterProjectSelect').innerHTML = optFilterProject;
  }

  // 8. Dropdown Tahun
  if (document.getElementById('filterTahunanProject')) {
    const currentYear = new Date().getFullYear();
    let optTahun = '';
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
      optTahun += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
    }
    document.getElementById('filterTahunanProject').innerHTML = optTahun;
  }

  // 9. Dropdown Project untuk Barang Masuk
  let optMasukProject = '<option value="">-- Pilih Project --</option>';
  masterProject.forEach(p => { optMasukProject += `<option value="${p.NamaProject}" data-lokasi="${p.Lokasi || ''}">${p.NamaProject}</option>`; });
  if(document.getElementById('masukProject')) document.getElementById('masukProject').innerHTML = optMasukProject;
}

// ============================================
// RENDER LISTS (MASTER DATA)
// ============================================
function loadListBarang() {
  if(!document.getElementById('listBarang')) return;
  let html = '';
  const isAdminSite = currentUser && String(currentUser.role).toLowerCase().trim() === 'admin site';

  masterBarang.forEach(b => { 
    let tombolHapus = isAdminSite ? '' : `<button onclick="konfirmasiHapus('${b.ItemID}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Hapus</button>`;
    let tombolAksi = `
      <button onclick="editBarang('${b.ItemID}')" style="background:orange; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Edit</button>
      ${tombolHapus}
    `;

    html += `<tr>
      <td>${b.ItemID}</td>
      <td>${b.KodeItem || '-'}</td>
      <td>${b.NamaBarang}</td>
      <td>${b.Kategori}</td>
      <td>${b.Satuan}</td>
      <td>${b.StokMinimum}</td>
      <td>${tombolAksi}</td>
    </tr>`; 
  });
  document.getElementById('listBarang').innerHTML = `<table><thead><tr><th>ID</th><th>Kode Item</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Min</th><th>Aksi</th></tr></thead><tbody>${html}</tbody></table>`;
}

function loadListUnit() {
  if(!document.getElementById('listUnit')) return;
  let html = '';
  const isAdminSite = currentUser && String(currentUser.role).toLowerCase().trim() === 'admin site';

  masterUnit.forEach(u => { 
    let tombolHapus = isAdminSite ? '' : `<button onclick="konfirmasiHapusUnit('${u.UnitID}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Hapus</button>`;
    let tombolAksi = `
      <button onclick="editUnit('${u.UnitID}')" style="background:orange; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Edit</button>
      ${tombolHapus}
    `;

    html += `<tr>
      <td>${u.IDUnit}</td>
      <td>${u.JenisAlat}</td>
      <td>${u.SerialNumber}</td>
      <td>${u.Project}</td>
      <td>${u.StatusUnit}</td>
      <td>${tombolAksi}</td>
    </tr>`; 
  });
  document.getElementById('listUnit').innerHTML = `<table><thead><tr><th>ID Unit</th><th>Jenis</th><th>Serial</th><th>Project</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${html}</tbody></table>`;
}

function loadListSupplier() {
  if(!document.getElementById('listSupplier')) return;
  let html = '';
  const isAdminSite = currentUser && String(currentUser.role).toLowerCase().trim() === 'admin site';

  masterSupplier.forEach(s => { 
    let tombolHapus = isAdminSite ? '' : `<button onclick="konfirmasiHapusSupplier('${s.SupplierID}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Hapus</button>`;
    let tombolAksi = `
      <button onclick="editSupplier('${s.SupplierID}')" style="background:orange; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Edit</button>
      ${tombolHapus}
    `;

    html += `<tr>
      <td>${s.SupplierID}</td>
      <td>${s.NamaSupplier}</td>
      <td>${s.Alamat}</td>
      <td>${s.Kontak}</td>
      <td>${s.StatusAktif}</td>
      <td>${tombolAksi}</td>
    </tr>`; 
  });
  document.getElementById('listSupplier').innerHTML = `<table><thead><tr><th>ID</th><th>Nama Supplier</th><th>Alamat</th><th>Kontak</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${html}</tbody></table>`;
}

function loadListProject() {
  if(!document.getElementById('listProject')) return;
  let html = '';
  const isAdminSite = currentUser && String(currentUser.role).toLowerCase().trim() === 'admin site';

  masterProject.forEach(p => { 
    let tombolHapus = isAdminSite ? '' : `<button onclick="konfirmasiHapusProject('${p.ProjectID}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Hapus</button>`;
    let tombolAksi = `
      <button onclick="editProject('${p.ProjectID}')" style="background:orange; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Edit</button>
      ${tombolHapus}
    `;

    html += `<tr>
      <td>${p.ProjectID}</td>
      <td>${p.NamaProject}</td>
      <td>${p.Lokasi}</td>
      <td>${p.Keterangan || '-'}</td>
      <td>${p.StatusAktif}</td>
      <td>${tombolAksi}</td>
    </tr>`; 
  });
  document.getElementById('listProject').innerHTML = `<table><thead><tr><th>ID</th><th>Nama Project</th><th>Lokasi</th><th>Keterangan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${html}</tbody></table>`;
}

function filterBarang() {
  const q = document.getElementById('searchBarang').value.toLowerCase();
  const rows = document.querySelectorAll('#listBarang tbody tr');
  rows.forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'getDashboard', token: getToken() }) 
    });
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

// ============================================
// RIWAYAT TRANSAKSI
// ============================================
async function loadRiwayat() {
  const container = document.getElementById('listRiwayat');
  if(!container) return;
  container.innerHTML = '<p>Memuat data...</p>';
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'getRiwayatTransaksi', token: getToken() }) 
    });
    const result = await res.json();
    
    if (result.success) {
      if (result.data.length === 0) {
        container.innerHTML = '<p>Belum ada transaksi.</p>';
        return;
      }
      
      let html = '';
      result.data.forEach(t => {
        const warnaBadge = t.jenis === 'MASUK' ? 'background:#e8f5e9; color:#2e7d32;' : 'background:#ffebee; color:#c62828;';
        html += `<tr>
          <td>${formatDate(t.tanggal)}</td>
          <td><span style="padding:4px 8px; border-radius:4px; font-weight:bold; font-size:11px; ${warnaBadge}">${t.jenis}</span></td>
          <td>${t.namaBarang}</td>
          <td><strong>${t.qty}</strong></td>
          <td>${t.pic}</td>
          <td>
            <button onclick="batalkanTransaksi('${t.trxId}', '${t.namaBarang}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Batalkan</button>
          </td>
        </tr>`;
      });
      
      container.innerHTML = `<table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Nama Barang</th>
            <th>Qty</th>
            <th>PIC</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>${html}</tbody>
      </table>`;
    } else {
      container.innerHTML = `<p class="error">${result.message}</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="error">Gagal memuat data: ${err.message}</p>`;
  }
}

function filterRiwayat() {
  const q = document.getElementById('searchRiwayat').value.toLowerCase();
  const rows = document.querySelectorAll('#listRiwayat tbody tr');
  rows.forEach(row => { 
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; 
  });
}

function batalkanTransaksi(trxId, namaBarang) {
  if (confirm(`Yakin ingin membatalkan transaksi untuk "${namaBarang}"?\n\nStok akan otomatis dikembalikan/disesuaikan.`)) {
    prosesBatalTransaksi(trxId);
  }
}

async function prosesBatalTransaksi(trxId) {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'hapusTransaksi', token: getToken(), data: { trxId } }) 
    });
    const result = await res.json();
    
    if (result.success) {
      alert('✓ ' + result.message);
      await loadRiwayat(); 
      await loadInitialData(); 
    } else {
      alert('Gagal: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ============================================
// SIMPAN TRANSAKSI
// ============================================
async function submitMasuk(e) {
  e.preventDefault(); 
  const msg = document.getElementById('masukMessage');
  msg.textContent = 'Menyimpan...';
  
  const inputText = document.getElementById('masukBarangInput').value;
  const barang = masterBarang.find(b => inputText.includes(b.ItemID));
  
  if (!barang) { msg.textContent = '✗ Barang tidak ditemukan! Pilih dari daftar.'; msg.className = 'error'; return; }

  const data = {
    tanggal: document.getElementById('masukTanggal').value,
    itemId: barang.ItemID,
    qty: Number(document.getElementById('masukQty').value),
    supplier: document.getElementById('masukSupplier').value,
    project: document.getElementById('masukProject').value, // TAMBAHAN
    lokasi: document.getElementById('masukLokasi').value,   // TAMBAHAN
    keterangan: document.getElementById('masukKeterangan').value,
    namaPIC: currentUser ? currentUser.nama : 'Admin',
    email: currentUser ? currentUser.email : 'admin@npm.com'
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'barangMasuk', token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      document.getElementById('formMasuk').reset(); 
      document.getElementById('masukTanggal').value = new Date().toISOString().split('T')[0]; 
      loadInitialData(); 
    } 
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

async function submitKeluar(e) {
  e.preventDefault(); 
  const msg = document.getElementById('keluarMessage');
  msg.textContent = 'Menyimpan...';
  
  const inputText = document.getElementById('keluarBarangInput').value;
  const barang = masterBarang.find(b => inputText.includes(b.ItemID));
  
  if (!barang) { msg.textContent = '✗ Barang tidak ditemukan! Pilih dari daftar.'; msg.className = 'error'; return; }

  const idUnit = document.getElementById('keluarUnit').value;
  const unitData = masterUnit.find(u => u.IDUnit === idUnit);
  
  const data = {
    tanggal: document.getElementById('keluarTanggal').value,
    itemId: barang.ItemID,
    qty: Number(document.getElementById('keluarQty').value),
    project: document.getElementById('keluarProject').value,
    lokasi: document.getElementById('keluarLokasi').value,
    idUnit: idUnit,
    jenisUnit: unitData ? unitData.JenisAlat : '-',
    serialNumber: unitData ? unitData.SerialNumber : '-',
    keterangan: document.getElementById('keluarKeterangan').value,
    namaPIC: currentUser ? currentUser.nama : 'Admin',
    email: currentUser ? currentUser.email : 'admin@npm.com'
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'barangKeluar', token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      document.getElementById('formKeluar').reset(); 
      document.getElementById('keluarTanggal').value = new Date().toISOString().split('T')[0]; 
      loadInitialData(); 
    } else { 
      msg.textContent = '✗ ' + result.message; msg.className = 'error'; 
    }
  } catch (err) { 
    msg.textContent = 'Error: ' + err.message; msg.className = 'error'; 
  }
}

// ============================================
// KARTU STOK & CETAK
// ============================================
async function loadKartu() {
  const inputText = document.getElementById('kartuBarangInput').value;
  const container = document.getElementById('kartuContent');
  const tglAwal = document.getElementById('filterKartuTglAwal').value;
  const tglAkhir = document.getElementById('filterKartuTglAkhir').value;
  
  const inputLokasi = document.getElementById('inputLokasiCetak').value || 'NPM Matarape';
  const inputTanggal = document.getElementById('inputTanggalCetak').value;

  // Cari barang berdasarkan teks input
  const barang = masterBarang.find(b => inputText.includes(b.ItemID));
  const itemId = barang ? barang.ItemID : '';

  if (!itemId) { 
    container.innerHTML = '<p style="text-align: center; color: #666;">Silakan pilih barang terlebih dahulu.</p>'; 
    return; 
  }
  
  container.innerHTML = '<p style="text-align: center;">Memuat data laporan...</p>';

  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'getTransaksi', token: getToken(), data: { itemId } }) 
    });
    const result = await res.json();
    let transaksi = result.data;
    
    if (tglAwal || tglAkhir) {
      transaksi = transaksi.filter(t => {
        const tanggalTrx = new Date(t.TanggalTransaksi).setHours(0,0,0,0);
        if (tglAwal) {
          const awal = new Date(tglAwal).setHours(0,0,0,0);
          if (tanggalTrx < awal) return false;
        }
        if (tglAkhir) {
          const akhir = new Date(tglAkhir).setHours(23,59,59,999);
          if (tanggalTrx > akhir) return false;
        }
        return true;
      });
    }

    let saldo = Number(barang.StokAwal) || 0;
    let rowsHtml = '';
    
    if (transaksi.length === 0) { 
      rowsHtml = `<tr><td colspan="11">Tidak ada transaksi pada periode ini.</td></tr>`; 
    } else {
      transaksi.forEach((t, index) => {
        const isMasuk = t.JenisTransaksi === 'MASUK';
        const qtyMasuk = isMasuk ? Number(t.QtyMasuk) : 0;
        const qtyKeluar = !isMasuk ? Number(t.QtyKeluar) : 0;
        saldo = saldo + qtyMasuk - qtyKeluar;
        const tglStr = new Date(t.TanggalTransaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\./g, '-');

        rowsHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${isMasuk ? tglStr : ''}</td>
            <td>${isMasuk ? (t.Supplier || '-') : ''}</td>
            <td>${isMasuk ? qtyMasuk : ''}</td>
            <td>${!isMasuk ? tglStr : ''}</td>
            <td>${!isMasuk ? qtyKeluar : ''}</td>
            <td style="font-weight: bold; background-color: #f9f9f9;">${saldo}</td>
            <td>${!isMasuk ? (t.Project || '-') : ''}</td>
            <td>${!isMasuk ? (t.Lokasi || '-') : ''}</td>
            <td>${!isMasuk ? (t.IDUnit || '-') : ''}</td>
            <td>${!isMasuk ? (t.SerialNumber || '-') : ''}</td>
          </tr>
        `;
      });
    }

    let tanggalCetakStr = "";
    if (inputTanggal) {
      const d = new Date(inputTanggal);
      tanggalCetakStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } else {
      tanggalCetakStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    const inputMembuat = document.getElementById('inputNamaMembuat').value;
    const currentUserName = inputMembuat ? inputMembuat : (currentUser ? currentUser.nama : 'Admin');
    const inputMenyetujui = document.getElementById('inputNamaMenyetujui').value || 'Dodi Saputra Sahupala';

    container.innerHTML = `
      <div class="laporan-header">
        <table style="width: 50%;">
          <tr><td style="width: 120px; font-weight: bold;">Nama PIC</td><td>: ${currentUserName}</td></tr>
          <tr><td style="font-weight: bold;">Nama Barang</td><td>: ${barang.NamaBarang}</td></tr>
          <tr><td style="font-weight: bold;">Kode Item</td><td>: ${barang.KodeItem}</td></tr>
          <tr><td style="font-weight: bold;">Kategori</td><td>: ${barang.Kategori}</td></tr>
          <tr><td style="font-weight: bold;">Lokasi</td><td>: ${inputLokasi}</td></tr>
        </table>
      </div>
      <div class="laporan-title">STOCK OPNAME</div>
      <table class="laporan-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 40px;">NO</th>
            <th colspan="3">Barang Masuk</th>
            <th colspan="2">Barang Keluar</th>
            <th rowspan="2" style="width: 80px;">Balance Qty</th>
            <th colspan="4">KETERANGAN</th>
          </tr>
          <tr>
            <th>Tanggal</th>
            <th>Suplier</th>
            <th>Qty Barang</th>
            <th>Tanggal</th>
            <th>Qty Barang</th>
            <th>Project Name</th>
            <th>Lokasi</th>
            <th>ID</th>
            <th>SN</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top: 20px; font-size: 14px;">
        ${inputLokasi}, ${tanggalCetakStr}
      </div>
      <div class="laporan-ttd">
        <div class="ttd-box"><p>Yang Membuat,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">${currentUserName}</p></div>
        <div class="ttd-box"><p>Yang Menyetujui,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">${inputMenyetujui}</p></div>
      </div>
    `;
  } catch (err) { container.innerHTML = `<p style="color: red; text-align: center;">Gagal: ${err.message}</p>`; }
}

function cetakLaporan() {
  const content = document.getElementById('kartuContent').innerHTML;
  if (content.includes('Silakan pilih barang terlebih dahulu')) {
    alert('Silakan pilih barang terlebih dahulu sebelum mencetak!');
    return;
  }
  window.print();
}

// ============================================
// LAPORAN UNIT
// ============================================
async function loadLaporanUnit() {
  const container = document.getElementById('listLaporanUnit');
  container.innerHTML = '<p>Memuat data...</p>';
  const tglAwal = document.getElementById('filterTglAwal').value;
  const tglAkhir = document.getElementById('filterTglAkhir').value;
  const unitDipilih = document.getElementById('filterUnit').value;
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'getLaporanUnit', token: getToken(), data: { tglAwal, tglAkhir, unitDipilih } }) 
    });
    const result = await res.json();
    if (result.success) {
      if (result.data.length === 0) { container.innerHTML = '<p>Tidak ada penggunaan part pada periode/unit ini.</p>'; return; }
      
      let html = '<div class="cards">';
      result.data.forEach(unit => {
        let detailHtml = unit.detail.map(d => `<div style="display:flex; justify-content:space-between; font-size:13px; border-bottom:1px dashed #eee; padding:6px 0;"><span>${d.nama}</span><strong>${d.qty}</strong></div>`).join('');
        html += `<div class="card" style="text-align:left;"><h4 style="color:#1a73e8; font-size:16px; margin-bottom:4px;">${unit.idUnit} <span style="font-size:12px; color:#666;">(${unit.jenisAlat})</span></h4><p style="font-size:24px; margin-bottom:12px;">${unit.totalPart} <span style="font-size:12px; color:#666; font-weight:normal;">Total Part</span></p><div style="margin-top:12px;"><small style="color:#999; display:block; margin-bottom:4px;">Rincian:</small>${detailHtml}</div></div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    }
  } catch (err) { container.innerHTML = '<p class="error">Error memuat laporan.</p>'; }
}

// ============================================
// LAPORAN PROJECT
// ============================================
function toggleModeFilterProject() {
  const mode = document.getElementById('filterModeProject').value;
  document.getElementById('wrapHarian').classList.toggle('hidden', mode !== 'harian');
  document.getElementById('wrapBulanan').classList.toggle('hidden', mode !== 'bulanan');
  document.getElementById('wrapTahunan').classList.toggle('hidden', mode !== 'tahunan');
  document.getElementById('wrapRangeAwal').classList.toggle('hidden', mode !== 'range');
  document.getElementById('wrapRangeAkhir').classList.toggle('hidden', mode !== 'range');
}

function getPeriodeLaporanProject() {
  const mode = document.getElementById('filterModeProject').value;
  let tglAwal = '', tglAkhir = '', labelPeriode = '';

  if (mode === 'harian') {
    const tgl = document.getElementById('filterHarianProject').value;
    if (!tgl) return null;
    tglAwal = tgl;
    tglAkhir = tgl;
    labelPeriode = new Date(tgl).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } else if (mode === 'bulanan') {
    const bulan = document.getElementById('filterBulananProject').value;
    if (!bulan) return null;
    const [y, m] = bulan.split('-').map(Number);
    const awal = new Date(y, m - 1, 1);
    const akhir = new Date(y, m, 0);
    tglAwal = awal.toISOString().split('T')[0];
    tglAkhir = akhir.toISOString().split('T')[0];
    labelPeriode = awal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else if (mode === 'tahunan') {
    const tahun = document.getElementById('filterTahunanProject').value;
    if (!tahun) return null;
    tglAwal = tahun + '-01-01';
    tglAkhir = tahun + '-12-31';
    labelPeriode = 'Tahun ' + tahun;
  } else if (mode === 'range') {
    const awal = document.getElementById('filterRangeAwalProject').value;
    const akhir = document.getElementById('filterRangeAkhirProject').value;
    if (!awal || !akhir) return null;
    tglAwal = awal;
    tglAkhir = akhir;
    labelPeriode = new Date(awal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' s/d ' + new Date(akhir).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return { tglAwal, tglAkhir, labelPeriode };
}

async function loadLaporanProject() {
  const container = document.getElementById('laporanProjectContent');
  const periode = getPeriodeLaporanProject();
  if (!periode) {
    alert('Silakan isi filter periode terlebih dahulu!');
    return;
  }
  const projectDipilih = document.getElementById('filterProjectSelect').value;
  const projectLabel = projectDipilih || 'Semua Project';

  container.innerHTML = '<p style="text-align: center;">Memuat data...</p>';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'getLaporanProject',
        token: getToken(),
        data: { project: projectDipilih, tglAwal: periode.tglAwal, tglAkhir: periode.tglAkhir }
      })
    });
    const result = await res.json();

    if (!result.success) {
      container.innerHTML = `<p style="color: red; text-align: center;">${result.message}</p>`;
      return;
    }

    const units = result.data.units;
    const grandTotalKeluar = result.data.grandTotalKeluar;
    const grandTotalMasuk = result.data.grandTotalMasuk;
    const totalUnit = result.data.totalUnit;
    const totalTransaksiKeluar = result.data.totalTransaksiKeluar;
    const totalTransaksiMasuk = result.data.totalTransaksiMasuk;
    const currentUserName = currentUser ? currentUser.nama : 'Admin';

    if (units.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;">
        <p style="font-size:16px;color:#666;margin-bottom:8px;">Tidak ada penggunaan part pada periode ini.</p>
        <p style="font-size:13px;color:#999;">Project: <strong>${projectLabel}</strong> | Periode: <strong>${periode.labelPeriode}</strong></p>
      </div>`;
      return;
    }

    const groupedByProject = {};
    units.forEach(u => {
      if (!groupedByProject[u.project]) groupedByProject[u.project] = [];
      groupedByProject[u.project].push(u);
    });

    let html = `
      <div style="margin-bottom:24px;padding:16px;background:#f8f9fa;border-radius:10px;border-left:4px solid #1a73e8;">
        <h4 style="margin:0 0 12px 0;color:#1a73e8;">Ringkasan Laporan</h4>
        <table style="width:100%;font-size:13px;border:none;">
          <tr>
            <td style="width:150px;padding:4px 0;color:#666;">Project</td>
            <td style="padding:4px 0;"><strong>${projectLabel}</strong></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;">Periode</td>
            <td style="padding:4px 0;"><strong>${periode.labelPeriode}</strong></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;">Total Unit Terpakai</td>
            <td style="padding:4px 0;"><strong>${totalUnit} unit</strong></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;">Total Transaksi Keluar</td>
            <td style="padding:4px 0;"><strong>${totalTransaksiKeluar} transaksi</strong></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;">Total Part Terpakai (Keluar)</td>
            <td style="padding:4px 0;"><strong style="color:#c62828;">${grandTotalKeluar} pcs</strong></td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#666;">Total Barang Masuk (di periode ini)</td>
            <td style="padding:4px 0;"><strong style="color:#2e7d32;">${grandTotalMasuk} pcs</strong></td>
          </tr>
        </table>
      </div>
    `;

    Object.keys(groupedByProject).forEach(projName => {
      const unitsInProject = groupedByProject[projName];
      const lokasi = unitsInProject[0].lokasi || '-';
      const totalProj = unitsInProject.reduce((sum, u) => sum + u.totalPart, 0);

      html += `
        <div style="margin-bottom:24px;">
          <h4 style="color:#1a73e8;margin:0 0 12px 0;padding:8px 12px;background:#e8f0fe;border-radius:8px;">
            📁 Project: ${projName} <span style="font-size:13px;color:#666;font-weight:normal;">(Lokasi: ${lokasi})</span>
            <span style="float:right;font-size:13px;font-weight:bold;color:#c62828;">${totalProj} pcs</span>
          </h4>
          <table class="laporan-table">
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th>ID Unit</th>
                <th>Jenis Alat</th>
                <th>Serial Number</th>
                <th style="width:100px;">Total Part</th>
                <th>Rincian Part</th>
              </tr>
            </thead>
            <tbody>
      `;

      unitsInProject.forEach((u, idx) => {
        const detailStr = u.detail
          .map(d => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:12px;"><span>${d.nama}</span><strong>${d.qty}</strong></div>`)
          .join('');
        html += `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td><strong>${u.idUnit}</strong></td>
            <td>${u.jenisAlat}</td>
            <td>${u.serialNumber}</td>
            <td style="text-align:center;font-weight:bold;background:#fff9e6;">${u.totalPart}</td>
            <td style="text-align:left;">${detailStr || '-'}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
            <tfoot>
              <tr style="background:#f0f0f0;font-weight:bold;">
                <td colspan="4" style="text-align:right;">Total Project ${projName}</td>
                <td style="text-align:center;color:#c62828;">${totalProj}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    });

    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    html += `
      <div style="margin-top:30px;font-size:14px;">Matarape, ${today}</div>
      <div class="laporan-ttd">
        <div class="ttd-box"><p>Yang Membuat,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">${currentUserName}</p></div>
        <div class="ttd-box"><p>Yang Menyetujui,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">Dodi Saputra Sahupala</p></div>
      </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p style="color: red; text-align: center;">Gagal: ${err.message}</p>`;
  }
}

function cetakLaporanProject() {
  const content = document.getElementById('laporanProjectContent').innerHTML;
  if (content.includes('Silakan pilih barang') || content.includes('Pilih filter lalu klik Tampilkan') || content.includes('Memuat data')) {
    alert('Silakan tampilkan laporan terlebih dahulu sebelum mencetak!');
    return;
  }
  window.print();
}

// ============================================
// CRUD BARANG
// ============================================
function bukaFormBarang() {
  document.getElementById('judulFormBarang').textContent = 'Tambah Barang Baru';
  document.getElementById('baruItemID').value = ''; 
  document.getElementById('baruNama').value = '';
  document.getElementById('baruKode').value = '';
  document.getElementById('baruMerek').value = '';
  document.getElementById('baruMin').value = '0';
  document.getElementById('formTambahBarang').classList.remove('hidden'); 
  document.getElementById('msgTambahBarang').textContent = '';
}

function editBarang(itemId) {
  const barang = masterBarang.find(b => b.ItemID === itemId);
  if(!barang) return;
  
  document.getElementById('judulFormBarang').textContent = 'Edit Barang: ' + itemId;
  document.getElementById('baruItemID').value = barang.ItemID;
  document.getElementById('baruNama').value = barang.NamaBarang;
  document.getElementById('baruKode').value = barang.KodeItem !== '-' ? barang.KodeItem : '';
  document.getElementById('baruKategori').value = barang.Kategori;
  document.getElementById('baruSatuan').value = barang.Satuan;
  document.getElementById('baruMerek').value = barang.Merek !== '-' ? barang.Merek : '';
  document.getElementById('baruMin').value = barang.StokMinimum;
  
  document.getElementById('formTambahBarang').classList.remove('hidden'); 
  document.getElementById('msgTambahBarang').textContent = '';
}

function konfirmasiHapus(itemId) {
  if(confirm('Apakah Anda yakin ingin menghapus barang ' + itemId + '? Data yang dihapus tidak bisa dikembalikan.')) {
    hapusBarangData(itemId);
  }
}

async function hapusBarangData(itemId) {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'hapusBarang', token: getToken(), data: { itemId } }) 
    });
    const result = await res.json();
    if(result.success) {
      alert(result.message);
      await loadInitialData(); 
    } else { alert('Gagal: ' + result.message); }
  } catch(err) { alert('Error: ' + err.message); }
}

function tutupFormBarang() { 
  document.getElementById('formTambahBarang').classList.add('hidden'); 
}

async function submitTambahBarang(e) {
  e.preventDefault();
  const msg = document.getElementById('msgTambahBarang');
  msg.textContent = 'Menyimpan...';
  msg.className = '';
  
  const itemId = document.getElementById('baruItemID').value;
  const actionType = itemId ? 'updateBarang' : 'tambahBarang';
  
  const data = { 
    itemId: itemId,
    namaBarang: document.getElementById('baruNama').value, 
    kodeItem: document.getElementById('baruKode').value, 
    kategori: document.getElementById('baruKategori').value, 
    satuan: document.getElementById('baruSatuan').value, 
    merek: document.getElementById('baruMerek').value, 
    stokMinimum: document.getElementById('baruMin').value 
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: actionType, token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      await loadInitialData(); 
      setTimeout(() => { tutupFormBarang(); msg.textContent = ''; }, 1500); 
    }
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

// ============================================
// CRUD UNIT
// ============================================
function bukaFormUnit() {
  document.getElementById('judulFormUnit').textContent = 'Tambah Unit Baru';
  document.getElementById('baruUnitID').value = ''; 
  document.getElementById('baruIdUnit').value = '';
  document.getElementById('baruSerialNumber').value = '';
  document.getElementById('baruProject').value = 'NPM';
  document.getElementById('baruLokasi').value = 'Matarape';
  document.getElementById('baruModelUnit').value = '';
  document.getElementById('baruHM').value = '0';
  document.getElementById('formTambahUnit').classList.remove('hidden'); 
  document.getElementById('msgTambahUnit').textContent = '';
}

function editUnit(unitId) {
  const unit = masterUnit.find(u => u.UnitID === unitId);
  if(!unit) return;
  
  document.getElementById('judulFormUnit').textContent = 'Edit Unit: ' + unit.IDUnit;
  document.getElementById('baruUnitID').value = unit.UnitID;
  document.getElementById('baruIdUnit').value = unit.IDUnit;
  document.getElementById('baruJenisAlat').value = unit.JenisAlat;
  document.getElementById('baruSerialNumber').value = unit.SerialNumber;
  document.getElementById('baruProject').value = unit.Project;
  document.getElementById('baruLokasi').value = unit.Lokasi;
  document.getElementById('baruModelUnit').value = unit.ModelUnit !== '-' ? unit.ModelUnit : '';
  document.getElementById('baruHM').value = unit.HourMeterTerakhir;
  
  document.getElementById('formTambahUnit').classList.remove('hidden'); 
  document.getElementById('msgTambahUnit').textContent = '';
}

function konfirmasiHapusUnit(unitId) {
  if(confirm('Apakah Anda yakin ingin menghapus unit ini? Data yang dihapus tidak bisa dikembalikan.')) {
    hapusUnitData(unitId);
  }
}

async function hapusUnitData(unitId) {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'hapusUnit', token: getToken(), data: { unitId } }) 
    });
    const result = await res.json();
    if(result.success) {
      alert(result.message);
      await loadInitialData(); 
    } else { alert('Gagal: ' + result.message); }
  } catch(err) { alert('Error: ' + err.message); }
}

function tutupFormUnit() { 
  document.getElementById('formTambahUnit').classList.add('hidden'); 
}

async function submitTambahUnit(e) {
  e.preventDefault();
  const msg = document.getElementById('msgTambahUnit');
  msg.textContent = 'Menyimpan...';
  msg.className = '';
  
  const unitId = document.getElementById('baruUnitID').value;
  const actionType = unitId ? 'updateUnit' : 'tambahUnit';
  
  const data = { 
    unitId: unitId,
    idUnit: document.getElementById('baruIdUnit').value,
    jenisAlat: document.getElementById('baruJenisAlat').value,
    serialNumber: document.getElementById('baruSerialNumber').value,
    project: document.getElementById('baruProject').value,
    lokasi: document.getElementById('baruLokasi').value,
    modelUnit: document.getElementById('baruModelUnit').value,
    hm: document.getElementById('baruHM').value 
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: actionType, token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      await loadInitialData(); 
      setTimeout(() => { tutupFormUnit(); msg.textContent = ''; }, 1500); 
    }
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

// ============================================
// CRUD SUPPLIER
// ============================================
function bukaFormSupplier() {
  document.getElementById('judulFormSupplier').textContent = 'Tambah Supplier Baru';
  document.getElementById('baruSupplierID').value = ''; 
  document.getElementById('baruNamaSupplier').value = '';
  document.getElementById('baruAlamat').value = '';
  document.getElementById('baruKontak').value = '';
  document.getElementById('formTambahSupplier').classList.remove('hidden'); 
  document.getElementById('msgTambahSupplier').textContent = '';
}

function editSupplier(supplierId) {
  const supplier = masterSupplier.find(s => s.SupplierID === supplierId);
  if(!supplier) return;
  
  document.getElementById('judulFormSupplier').textContent = 'Edit Supplier: ' + supplier.NamaSupplier;
  document.getElementById('baruSupplierID').value = supplier.SupplierID;
  document.getElementById('baruNamaSupplier').value = supplier.NamaSupplier;
  document.getElementById('baruAlamat').value = supplier.Alamat !== '-' ? supplier.Alamat : '';
  document.getElementById('baruKontak').value = supplier.Kontak !== '-' ? supplier.Kontak : '';
  
  document.getElementById('formTambahSupplier').classList.remove('hidden'); 
  document.getElementById('msgTambahSupplier').textContent = '';
}

function konfirmasiHapusSupplier(supplierId) {
  if(confirm('Apakah Anda yakin ingin menghapus supplier ini?')) {
    hapusSupplierData(supplierId);
  }
}

async function hapusSupplierData(supplierId) {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'hapusSupplier', token: getToken(), data: { supplierId } }) 
    });
    const result = await res.json();
    if(result.success) {
      alert(result.message);
      await loadInitialData(); 
    } else { alert('Gagal: ' + result.message); }
  } catch(err) { alert('Error: ' + err.message); }
}

function tutupFormSupplier() { 
  document.getElementById('formTambahSupplier').classList.add('hidden'); 
}

async function submitTambahSupplier(e) {
  e.preventDefault();
  const msg = document.getElementById('msgTambahSupplier');
  msg.textContent = 'Menyimpan...';
  msg.className = '';
  
  const supplierId = document.getElementById('baruSupplierID').value;
  const actionType = supplierId ? 'updateSupplier' : 'tambahSupplier';
  
  const data = { 
    supplierId: supplierId,
    namaSupplier: document.getElementById('baruNamaSupplier').value, 
    alamat: document.getElementById('baruAlamat').value, 
    kontak: document.getElementById('baruKontak').value 
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: actionType, token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      await loadInitialData(); 
      setTimeout(() => { tutupFormSupplier(); msg.textContent = ''; }, 1500); 
    }
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

// ============================================
// CRUD PROJECT
// ============================================
function bukaFormProject() {
  document.getElementById('judulFormProject').textContent = 'Tambah Project Baru';
  document.getElementById('baruProjectID').value = ''; 
  document.getElementById('baruNamaProject').value = '';
  document.getElementById('baruLokasiProject').value = '';
  document.getElementById('baruKeteranganProject').value = '';
  document.getElementById('formTambahProject').classList.remove('hidden'); 
  document.getElementById('msgTambahProject').textContent = '';
}

function editProject(projectId) {
  const proj = masterProject.find(p => p.ProjectID === projectId);
  if(!proj) return;
  
  document.getElementById('judulFormProject').textContent = 'Edit Project: ' + proj.NamaProject;
  document.getElementById('baruProjectID').value = proj.ProjectID;
  document.getElementById('baruNamaProject').value = proj.NamaProject;
  document.getElementById('baruLokasiProject').value = proj.Lokasi !== '-' ? proj.Lokasi : '';
  document.getElementById('baruKeteranganProject').value = proj.Keterangan !== '-' ? proj.Keterangan : '';
  
  document.getElementById('formTambahProject').classList.remove('hidden'); 
  document.getElementById('msgTambahProject').textContent = '';
}

function konfirmasiHapusProject(projectId) {
  if(confirm('Apakah Anda yakin ingin menghapus project ini?')) {
    hapusProjectData(projectId);
  }
}

async function hapusProjectData(projectId) {
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: 'hapusProject', token: getToken(), data: { projectId } }) 
    });
    const result = await res.json();
    if(result.success) {
      alert(result.message);
      await loadInitialData(); 
    } else { alert('Gagal: ' + result.message); }
  } catch(err) { alert('Error: ' + err.message); }
}

function tutupFormProject() { 
  document.getElementById('formTambahProject').classList.add('hidden'); 
}

async function submitTambahProject(e) {
  e.preventDefault();
  const msg = document.getElementById('msgTambahProject');
  msg.textContent = 'Menyimpan...';
  msg.className = '';
  
  const projectId = document.getElementById('baruProjectID').value;
  const actionType = projectId ? 'updateProject' : 'tambahProject';
  
  const data = { 
    projectId: projectId,
    namaProject: document.getElementById('baruNamaProject').value, 
    lokasi: document.getElementById('baruLokasiProject').value, 
    keterangan: document.getElementById('baruKeteranganProject').value 
  };
  
  try {
    const res = await fetch(API_URL, { 
      method: 'POST', 
      body: JSON.stringify({ action: actionType, token: getToken(), data }) 
    });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      await loadInitialData(); 
      setTimeout(() => { tutupFormProject(); msg.textContent = ''; }, 1500); 
    }
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

// ============================================
// NAVIGASI & AUTO LOGIN
// ============================================
function showPage(page) {
  document.querySelectorAll('.content').forEach(el => el.classList.add('hidden'));
  document.getElementById('page-' + page).classList.remove('hidden');
  
  if (page === 'laporanUnit') {
    if(!document.getElementById('filterTglAwal').value) {
      const now = new Date();
      document.getElementById('filterTglAwal').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      document.getElementById('filterTglAkhir').value = now.toISOString().split('T')[0];
    }
    loadLaporanUnit();
  }

  if (page === 'kartu') {
    if(!document.getElementById('filterKartuTglAwal').value) {
      const now = new Date();
      document.getElementById('filterKartuTglAwal').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      document.getElementById('filterKartuTglAkhir').value = now.toISOString().split('T')[0];
    }
    if(!document.getElementById('inputTanggalCetak').value) {
      document.getElementById('inputTanggalCetak').value = new Date().toISOString().split('T')[0];
    }
    if(document.getElementById('inputNamaMembuat') && !document.getElementById('inputNamaMembuat').value) {
      document.getElementById('inputNamaMembuat').value = currentUser ? currentUser.nama : 'Admin';
    }
    if(document.getElementById('kartuBarangInput')) document.getElementById('kartuBarangInput').value = '';
  }

  if (page === 'laporanProject') {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const bulanIni = `${yyyy}-${mm}`;
    if (document.getElementById('filterBulananProject') && !document.getElementById('filterBulananProject').value) {
      document.getElementById('filterBulananProject').value = bulanIni;
    }
    if (document.getElementById('filterHarianProject') && !document.getElementById('filterHarianProject').value) {
      document.getElementById('filterHarianProject').value = now.toISOString().split('T')[0];
    }
    toggleModeFilterProject();
  }

  if (page === 'riwayat') {
    if(document.getElementById('searchRiwayat')) document.getElementById('searchRiwayat').value = '';
    loadRiwayat();
  }
}

function formatDate(dateStr) { if (!dateStr) return '-'; return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }

document.addEventListener('DOMContentLoaded', () => {
  const projSelect = document.getElementById('keluarProject');
  if (projSelect) {
    projSelect.addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      const lokasi = opt ? opt.getAttribute('data-lokasi') : '';
      const lokSel = document.getElementById('keluarLokasi');
      if (lokSel && lokasi && lokasi !== '-') lokSel.value = lokasi;
    });
  }
  const masukProjSelect = document.getElementById('masukProject');
  if (masukProjSelect) {
    masukProjSelect.addEventListener('change', function() {
      const opt = this.options[this.selectedIndex];
      const lokasi = opt ? opt.getAttribute('data-lokasi') : '';
      const lokInput = document.getElementById('masukLokasi');
      if (lokInput && lokasi && lokasi !== '-') lokInput.value = lokasi;
    });
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('user');
  if (saved) {
    currentUser = JSON.parse(saved);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
    applyRolePermissions();
    await loadInitialData();
  }
});
