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
    if (result.success) { msg.textContent = '✓ ' + result.message; msg.className = 'success'; document.getElementById('formMasuk').reset(); document.getElementById('masukTanggal').value = new Date().toISOString().split('T')[0]; loadInitialData(); } 
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}

async function submitKeluar(e) {
  e.preventDefault(); 
  const msg = document.getElementById('keluarMessage');
  msg.textContent = 'Menyimpan...';
  
  const idUnit = document.getElementById('keluarUnit').value;
  // Mencari data unit (ID dan SN) otomatis dari Master Unit
  const unitData = masterUnit.find(u => u.IDUnit === idUnit);
  
  const data = {
    tanggal: document.getElementById('keluarTanggal').value,
    itemId: document.getElementById('keluarBarang').value,
    qty: Number(document.getElementById('keluarQty').value),
    project: document.getElementById('keluarProject').value,
    lokasi: document.getElementById('keluarLokasi').value,
    idUnit: idUnit,
    jenisUnit: unitData ? unitData.JenisAlat : '-',
    serialNumber: unitData ? unitData.SerialNumber : '-', // Otomatis ambil SN dari Master Unit
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
      loadInitialData(); 
    } else { 
      msg.textContent = '✗ ' + result.message; msg.className = 'error'; 
    }
  } catch (err) { 
    msg.textContent = 'Error: ' + err.message; msg.className = 'error'; 
  }
}

async function loadKartu() {
  const itemId = document.getElementById('kartuBarangSelect').value;
  const container = document.getElementById('kartuContent');
  if (!itemId) { container.innerHTML = '<p style="text-align: center; color: #666;">Silakan pilih barang terlebih dahulu.</p>'; return; }
  container.innerHTML = '<p style="text-align: center;">Memuat data laporan...</p>';

  try {
    const barang = masterBarang.find(b => b.ItemID === itemId);
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'getTransaksi', data: { itemId } }) });
    const result = await res.json();
    const transaksi = result.data;
    let saldo = Number(barang.StokAwal) || 0;
    let rowsHtml = '';
    
    if (transaksi.length === 0) { rowsHtml = `<tr><td colspan="11">Belum ada transaksi untuk barang ini.</td></tr>`; } 
    else {
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

    const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentUserName = currentUser ? currentUser.nama : 'Admin';

    container.innerHTML = `
      <div class="laporan-header">
        <table style="width: 50%;">
          <tr><td style="width: 120px; font-weight: bold;">Nama PIC</td><td>: ${currentUserName}</td></tr>
          <tr><td style="font-weight: bold;">Nama Barang</td><td>: ${barang.NamaBarang}</td></tr>
          <tr><td style="font-weight: bold;">Kode Item</td><td>: ${barang.KodeItem}</td></tr>
          <tr><td style="font-weight: bold;">Kategori</td><td>: ${barang.Kategori}</td></tr>
          <tr><td style="font-weight: bold;">Lokasi</td><td>: NPM Matarape</td></tr>
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
      <div style="margin-top: 20px; font-size: 14px;">Matarape, ${todayStr}</div>
      <div class="laporan-ttd">
        <div class="ttd-box"><p>Yang Membuat,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">${currentUserName}</p></div>
        <div class="ttd-box"><p>Yang Menyetujui,</p><div class="ttd-space"></div><p style="font-weight: bold; text-decoration: underline;">Dodi Saputra Sahupala</p></div>
      </div>
    `;
  } catch (err) { container.innerHTML = `<p style="color: red; text-align: center;">Gagal: ${err.message}</p>`; }
}

async function loadLaporanUnit() {
  const container = document.getElementById('listLaporanUnit');
  container.innerHTML = '<p>Memuat data...</p>';
  const tglAwal = document.getElementById('filterTglAwal').value;
  const tglAkhir = document.getElementById('filterTglAkhir').value;
  const unitDipilih = document.getElementById('filterUnit').value;
  
  try {
    const res = await fetch(API_URL + '?action=getTransaksi');
    const result = await res.json();
    if (result.success) {
      const filteredData = result.data.filter(t => {
        if (t.JenisTransaksi !== 'KELUAR' || t.StatusTransaksi !== 'AKTIF' || !t.IDUnit || t.IDUnit === '-') return false;
        if (unitDipilih && t.IDUnit !== unitDipilih) return false;
        const tanggalTrx = new Date(t.TanggalTransaksi).setHours(0,0,0,0);
        if (tglAwal) { const awal = new Date(tglAwal).setHours(0,0,0,0); if (tanggalTrx < awal) return false; }
        if (tglAkhir) { const akhir = new Date(tglAkhir).setHours(23,59,59,999); if (tanggalTrx > akhir) return false; }
        return true;
      });

      if (filteredData.length === 0) { container.innerHTML = '<p>Tidak ada penggunaan part pada periode/unit ini.</p>'; return; }

      const perUnit = {};
      filteredData.forEach(t => {
        if (!perUnit[t.IDUnit]) {
          const unitInfo = masterUnit.find(u => u.IDUnit === t.IDUnit);
          perUnit[t.IDUnit] = { idUnit: t.IDUnit, jenisAlat: unitInfo ? unitInfo.JenisAlat : '-', totalPart: 0, detail: {} };
        }
        const qty = Number(t.QtyKeluar) || 0;
        perUnit[t.IDUnit].totalPart += qty;
        if (!perUnit[t.IDUnit].detail[t.ItemID]) {
          const brgInfo = masterBarang.find(b => b.ItemID === t.ItemID);
          perUnit[t.IDUnit].detail[t.ItemID] = { nama: brgInfo ? brgInfo.NamaBarang : t.ItemID, qty: 0 };
        }
        perUnit[t.IDUnit].detail[t.ItemID].qty += qty;
      });

      const resultData = Object.values(perUnit).map(u => ({ idUnit: u.idUnit, jenisAlat: u.jenisAlat, totalPart: u.totalPart, detail: Object.values(u.detail) })).sort((a, b) => b.totalPart - a.totalPart);
      
      let html = '<div class="cards">';
      resultData.forEach(unit => {
        let detailHtml = unit.detail.map(d => `<div style="display:flex; justify-content:space-between; font-size:13px; border-bottom:1px dashed #eee; padding:6px 0;"><span>${d.nama}</span><strong>${d.qty}</strong></div>`).join('');
        html += `<div class="card" style="text-align:left;"><h4 style="color:#1a73e8; font-size:16px; margin-bottom:4px;">${unit.idUnit} <span style="font-size:12px; color:#666;">(${unit.jenisAlat})</span></h4><p style="font-size:24px; margin-bottom:12px;">${unit.totalPart} <span style="font-size:12px; color:#666; font-weight:normal;">Total Part</span></p><div style="margin-top:12px;"><small style="color:#999; display:block; margin-bottom:4px;">Rincian:</small>${detailHtml}</div></div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    }
  } catch (err) { container.innerHTML = '<p class="error">Error memuat laporan.</p>'; }
}

function bukaFormBarang() {
  document.getElementById('judulFormBarang').textContent = 'Tambah Barang Baru';
  document.getElementById('baruItemID').value = ''; // Kosongkan ID (berarti tambah baru)
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
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'hapusBarang', data: { itemId } }) });
    const result = await res.json();
    if(result.success) {
      alert(result.message);
      await loadInitialData(); // Refresh data
    } else { alert('Gagal: ' + result.message); }
  } catch(err) { alert('Error: ' + err.message); }
}
function tutupFormBarang() { document.getElementById('formTambahBarang').classList.add('hidden'); document.getElementById('baruNama').value = ''; document.getElementById('baruKode').value = ''; document.getElementById('baruMerek').value = ''; document.getElementById('baruMin').value = '0'; }

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
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: actionType, data }) });
    const result = await res.json();
    if (result.success) { 
      msg.textContent = '✓ ' + result.message; msg.className = 'success'; 
      await loadInitialData(); 
      setTimeout(() => { tutupFormBarang(); msg.textContent = ''; }, 1500); 
    }
    else { msg.textContent = '✗ ' + result.message; msg.className = 'error'; }
  } catch (err) { msg.textContent = 'Error: ' + err.message; msg.className = 'error'; }
}
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
}

function formatDate(dateStr) { if (!dateStr) return '-'; return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }

window.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('user');
  if (saved) {
    currentUser = JSON.parse(saved);
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.nama + ' (' + currentUser.role + ')';
    await loadInitialData();
  }
});
