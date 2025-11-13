// Database Configuration
const DB_NAME = 'GajiPegawaiDB';
const DB_VERSION = 1;
const STORE_NAME = 'pegawai';

// PWA Installation
let deferredPrompt;

class Database {
    constructor() {
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 Creating database store...');
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('nik', 'nik', { unique: true });
                    store.createIndex('nama', 'nama', { unique: false });
                    console.log('✅ Database store created');
                }
            };
        });
    }

    async addPegawai(data) {
        if (!this.db) await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(data);
            
            request.onerror = () => {
                console.error('Error adding data:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                console.log('✅ Data added successfully');
                resolve(request.result);
            };
        });
    }

    async getAllPegawai() {
        if (!this.db) await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onerror = () => {
                console.error('Error getting data:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                console.log('✅ Data retrieved:', request.result.length, 'records');
                resolve(request.result);
            };
        });
    }

    async deletePegawai(id) {
        if (!this.db) await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            
            request.onerror = () => {
                console.error('Error deleting data:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                console.log('✅ Data deleted successfully');
                resolve(request.result);
            };
        });
    }
}

const db = new Database();

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#4f46e5'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPage = button.dataset.page;
            
            // Update active button
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show target page
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(targetPage).classList.add('active');
            
            // Load page-specific data
            loadPageData(targetPage);
        });
    });
}

function loadPageData(page) {
    console.log('Loading page:', page);
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'report':
            loadReportData();
            break;
        case 'delete':
            loadDeleteData();
            break;
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        const pegawai = await db.getAllPegawai();
        updateDashboardStats(pegawai);
        displayRecentData(pegawai);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Gagal memuat data dashboard', 'error');
    }
}

function updateDashboardStats(pegawai) {
    const totalPegawai = pegawai.length;
    const totalGaji = pegawai.reduce((sum, p) => sum + (p.gajiBersih || 0), 0);
    const rataGaji = totalPegawai > 0 ? totalGaji / totalPegawai : 0;

    document.getElementById('totalPegawai').textContent = totalPegawai;
    document.getElementById('totalGaji').textContent = formatCurrency(totalGaji);
    document.getElementById('rataGaji').textContent = formatCurrency(rataGaji);
}

function displayRecentData(pegawai) {
    const container = document.getElementById('recentData');
    const recentData = pegawai.slice(-5).reverse();

    if (pegawai.length === 0) {
        container.innerHTML = '<p class="no-data">Belum ada data pegawai</p>';
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Nama</th>
                    <th>NIK</th>
                    <th>Golongan</th>
                    <th>Jabatan</th>
                    <th>Gaji Bersih</th>
                </tr>
            </thead>
            <tbody>
                ${recentData.map(p => `
                    <tr>
                        <td>${p.nama}</td>
                        <td>${p.nik}</td>
                        <td>${p.golongan}</td>
                        <td>${p.jabatan}</td>
                        <td>${formatCurrency(p.gajiBersih)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// Insert Form Functions
function initInsertForm() {
    const form = document.getElementById('formGaji');
    const calculateFields = ['golongan', 'statusKeluarga', 'jumlahAnak', 'jabatan'];

    calculateFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('change', calculateSalary);
        }
    });

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
        btnReset.addEventListener('click', resetForm);
    }

    // Initial calculation
    calculateSalary();
}

function calculateSalary() {
    const golongan = document.getElementById('golongan').value;
    const statusKeluarga = document.getElementById('statusKeluarga').value;
    const jumlahAnak = parseInt(document.getElementById('jumlahAnak').value) || 0;
    const jabatan = document.getElementById('jabatan').value;

    console.log('Calculating salary with:', { golongan, statusKeluarga, jumlahAnak, jabatan });

    // Gaji Pokok berdasarkan golongan
    const gajiPokokMap = {
        'IIIA': 3000000,
        'IIIB': 3500000,
        'IIIC': 4000000,
        'IIID': 4500000
    };
    const gajiPokok = gajiPokokMap[golongan] || 0;

    // Tunjangan Keluarga (10% jika menikah)
    const tunjanganKeluarga = statusKeluarga === 'Nikah' ? gajiPokok * 0.1 : 0;

    // Tunjangan Anak
    const tunjanganAnakMap = { 1: 0.05, 2: 0.08, 3: 0.12 };
    const tunjanganAnak = gajiPokok * (tunjanganAnakMap[jumlahAnak] || 0);

    // Tunjangan Jabatan
    const tunjanganJabatanMap = {
        'Asisten Ahli': 300000,
        'Lektor': 700000,
        'Lektor Kepala': 1300000,
        'Guru Besar': gajiPokok * 3
    };
    const tunjanganJabatan = tunjanganJabatanMap[jabatan] || 0;

    // Total Gaji Bersih
    const gajiBersih = gajiPokok + tunjanganKeluarga + tunjanganAnak + tunjanganJabatan;

    console.log('Salary calculation result:', {
        gajiPokok, tunjanganKeluarga, tunjanganAnak, tunjanganJabatan, gajiBersih
    });

    // Update display
    document.getElementById('gajiPokokDisplay').textContent = formatCurrency(gajiPokok);
    document.getElementById('tunjanganKeluargaDisplay').textContent = formatCurrency(tunjanganKeluarga);
    document.getElementById('tunjanganAnakDisplay').textContent = formatCurrency(tunjanganAnak);
    document.getElementById('tunjanganJabatanDisplay').textContent = formatCurrency(tunjanganJabatan);
    document.getElementById('gajiBersihDisplay').textContent = formatCurrency(gajiBersih);
}

async function handleFormSubmit(event) {
    event.preventDefault();
    console.log('Form submission started...');

    const nama = document.getElementById('nama').value.trim();
    const nik = document.getElementById('nik').value.trim();
    const golongan = document.getElementById('golongan').value;
    const statusKeluarga = document.getElementById('statusKeluarga').value;
    const jumlahAnak = parseInt(document.getElementById('jumlahAnak').value) || 0;
    const jabatan = document.getElementById('jabatan').value;

    // Get calculated values
    const gajiPokok = parseInt(document.getElementById('gajiPokokDisplay').textContent.replace(/[^\d]/g, '')) || 0;
    const tunjanganKeluarga = parseInt(document.getElementById('tunjanganKeluargaDisplay').textContent.replace(/[^\d]/g, '')) || 0;
    const tunjanganAnak = parseInt(document.getElementById('tunjanganAnakDisplay').textContent.replace(/[^\d]/g, '')) || 0;
    const tunjanganJabatan = parseInt(document.getElementById('tunjanganJabatanDisplay').textContent.replace(/[^\d]/g, '')) || 0;
    const gajiBersih = parseInt(document.getElementById('gajiBersihDisplay').textContent.replace(/[^\d]/g, '')) || 0;

    const formData = {
        nama,
        nik,
        golongan,
        statusKeluarga,
        jumlahAnak,
        jabatan,
        gajiPokok,
        tunjanganKeluarga,
        tunjanganAnak,
        tunjanganJabatan,
        gajiBersih,
        tanggalInput: new Date().toISOString()
    };

    console.log('Form data to save:', formData);

    // Validation
    if (!formData.nama || !formData.nik) {
        showNotification('Nama dan NIK harus diisi', 'error');
        return;
    }

    if (!formData.golongan || !formData.statusKeluarga || !formData.jabatan) {
        showNotification('Semua field bertanda * harus diisi', 'error');
        return;
    }

    try {
        await db.addPegawai(formData);
        showNotification('Data pegawai berhasil disimpan!', 'success');
        resetForm();
        
        // Refresh dashboard if active
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboardData();
        }
    } catch (error) {
        console.error('Error saving data:', error);
        if (error.name === 'ConstraintError') {
            showNotification('NIK sudah terdaftar. Gunakan NIK yang berbeda.', 'error');
        } else {
            showNotification('Gagal menyimpan data: ' + error.message, 'error');
        }
    }
}

function resetForm() {
    document.getElementById('formGaji').reset();
    calculateSalary();
}

// Report Functions
async function loadReportData() {
    try {
        console.log('Loading report data...');
        const pegawai = await db.getAllPegawai();
        displayReportData(pegawai);
    } catch (error) {
        console.error('Error loading report:', error);
        showNotification('Gagal memuat data laporan', 'error');
    }
}

function displayReportData(pegawai) {
    const tbody = document.querySelector('#reportTable tbody');

    if (!tbody) {
        console.error('Report table tbody not found');
        return;
    }

    if (pegawai.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">Belum ada data pegawai</td></tr>';
        return;
    }

    tbody.innerHTML = pegawai.map(p => `
        <tr>
            <td>${p.nama}</td>
            <td>${p.nik}</td>
            <td>${p.golongan}</td>
            <td>${formatCurrency(p.gajiPokok)}</td>
            <td>${formatCurrency(p.tunjanganKeluarga)}</td>
            <td>${formatCurrency(p.tunjanganAnak)}</td>
            <td>${formatCurrency(p.tunjanganJabatan)}</td>
            <td>${formatCurrency(p.gajiBersih)}</td>
            <td>
                <button class="btn btn-danger" onclick="deletePegawai(${p.id}, '${p.nama.replace(/'/g, "\\'")}')">
                    🗑️ Hapus
                </button>
            </td>
        </tr>
    `).join('');
}

// Delete Functions
async function loadDeleteData() {
    try {
        console.log('Loading delete page data...');
        const pegawai = await db.getAllPegawai();
        displayAllData(pegawai);
    } catch (error) {
        console.error('Error loading delete data:', error);
        showNotification('Gagal memuat data', 'error');
    }
}

function displayAllData(pegawai) {
    const tbody = document.querySelector('#allDataTable tbody');

    if (!tbody) {
        console.error('All data table tbody not found');
        return;
    }

    if (pegawai.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Belum ada data pegawai</td></tr>';
        return;
    }

    tbody.innerHTML = pegawai.map(p => `
        <tr>
            <td>${p.nama}</td>
            <td>${p.nik}</td>
            <td>${p.golongan}</td>
            <td>${p.jabatan}</td>
            <td>${formatCurrency(p.gajiBersih)}</td>
            <td>
                <button class="btn btn-danger" onclick="deletePegawai(${p.id}, '${p.nama.replace(/'/g, "\\'")}')">
                    🗑️ Hapus
                </button>
            </td>
        </tr>
    `).join('');
}

// Global delete function
async function deletePegawai(id, nama) {
    if (confirm(`Apakah Anda yakin ingin menghapus data pegawai: ${nama}?`)) {
        try {
            await db.deletePegawai(id);
            showNotification(`Data ${nama} berhasil dihapus`, 'success');
            
            // Refresh current page data
            const activePage = document.querySelector('.page.active').id;
            loadPageData(activePage);
        } catch (error) {
            console.error('Error deleting:', error);
            showNotification('Gagal menghapus data', 'error');
        }
    }
}

// Search functionality for delete page
function initDeletePage() {
    const btnSearchNIK = document.getElementById('btnSearchNIK');
    const btnSearchNama = document.getElementById('btnSearchNama');
    
    if (btnSearchNIK) {
        btnSearchNIK.addEventListener('click', searchByNIK);
    }
    
    if (btnSearchNama) {
        btnSearchNama.addEventListener('click', searchByName);
    }
    
    const searchNIK = document.getElementById('searchNIK');
    const searchNama = document.getElementById('searchNama');
    
    if (searchNIK) {
        searchNIK.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchByNIK();
        });
    }
    
    if (searchNama) {
        searchNama.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchByName();
        });
    }
}

async function searchByNIK() {
    const nik = document.getElementById('searchNIK').value.trim();
    if (!nik) {
        showNotification('Masukkan NIK untuk pencarian', 'warning');
        return;
    }

    try {
        const allPegawai = await db.getAllPegawai();
        const results = allPegawai.filter(p => 
            p.nik.toLowerCase().includes(nik.toLowerCase())
        );
        displaySearchResults(results, `Hasil pencarian NIK: "${nik}"`);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Gagal melakukan pencarian', 'error');
    }
}

async function searchByName() {
    const nama = document.getElementById('searchNama').value.trim();
    if (!nama) {
        showNotification('Masukkan nama untuk pencarian', 'warning');
        return;
    }

    try {
        const allPegawai = await db.getAllPegawai();
        const results = allPegawai.filter(p => 
            p.nama.toLowerCase().includes(nama.toLowerCase())
        );
        displaySearchResults(results, `Hasil pencarian nama: "${nama}"`);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Gagal melakukan pencarian', 'error');
    }
}

function displaySearchResults(results, title) {
    const container = document.getElementById('searchResults');

    if (!container) {
        console.error('Search results container not found');
        return;
    }

    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-results-header">
                <h4>${title}</h4>
            </div>
            <p class="no-data">Tidak ditemukan data yang sesuai</p>
        `;
        return;
    }

    const html = `
        <div class="search-results-header">
            <h4>${title} (${results.length} hasil)</h4>
        </div>
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>NIK</th>
                        <th>Golongan</th>
                        <th>Jabatan</th>
                        <th>Gaji Pokok</th>
                        <th>Gaji Bersih</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(p => `
                        <tr>
                            <td>${p.nama}</td>
                            <td>${p.nik}</td>
                            <td>${p.golongan}</td>
                            <td>${p.jabatan}</td>
                            <td>${formatCurrency(p.gajiPokok)}</td>
                            <td>${formatCurrency(p.gajiBersih)}</td>
                            <td>
                                <button class="btn btn-danger" onclick="deletePegawai(${p.id}, '${p.nama.replace(/'/g, "\\'")}')">
                                    🗑️ Hapus
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

// Export functionality
function initExport() {
    const btnExport = document.getElementById('btnExport');
    const btnPrint = document.getElementById('btnPrint');
    
    if (btnExport) {
        btnExport.addEventListener('click', exportToCSV);
    }
    
    if (btnPrint) {
        btnPrint.addEventListener('click', printReport);
    }
}

async function exportToCSV() {
    try {
        const pegawai = await db.getAllPegawai();
        
        if (pegawai.length === 0) {
            showNotification('Tidak ada data untuk diexport', 'warning');
            return;
        }

        const headers = ['Nama', 'NIK', 'Golongan', 'Status Keluarga', 'Jumlah Anak', 'Jabatan', 'Gaji Pokok', 'Tunjangan Keluarga', 'Tunjangan Anak', 'Tunjangan Jabatan', 'Gaji Bersih'];
        
        const csvContent = [
            headers.join(','),
            ...pegawai.map(p => [
                `"${p.nama}"`,
                `"${p.nik}"`,
                `"${p.golongan}"`,
                `"${p.statusKeluarga}"`,
                p.jumlahAnak,
                `"${p.jabatan}"`,
                p.gajiPokok,
                p.tunjanganKeluarga,
                p.tunjanganAnak,
                p.tunjanganJabatan,
                p.gajiBersih
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `gaji-pegawai-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Data berhasil diexport ke CSV', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Gagal mengexport data', 'error');
    }
}

function printReport() {
    window.print();
}

// PWA Installation Handler
function initPWA() {
    // Before install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
        console.log('✅ PWA ready for installation');
    });

    // App installed
    window.addEventListener('appinstalled', (evt) => {
        console.log('🎉 PWA installed successfully!');
        deferredPrompt = null;
        updatePWAStatus(true);
        hideInstallPrompt();
    });

    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone) {
        updatePWAStatus(true);
    }

    // Install button handler
    const installBtn = document.getElementById('installBtn');
    const cancelInstall = document.getElementById('cancelInstall');
    
    if (installBtn) {
        installBtn.addEventListener('click', installPWA);
    }
    
    if (cancelInstall) {
        cancelInstall.addEventListener('click', hideInstallPrompt);
    }
}

function showInstallPrompt() {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.style.display = 'block';
    }
}

function hideInstallPrompt() {
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.style.display = 'none';
    }
}

async function installPWA() {
    if (!deferredPrompt) {
        showNotification('Aplikasi sudah terinstall atau browser tidak mendukung', 'info');
        return;
    }

    try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        hideInstallPrompt();
    } catch (error) {
        console.error('Installation failed:', error);
        showNotification('Gagal menginstall aplikasi', 'error');
    }
}

function updatePWAStatus(isPWA) {
    const statusElement = document.getElementById('pwaStatus');
    if (statusElement) {
        if (isPWA) {
            statusElement.innerHTML = '<span class="status-pwa">🚀 PWA</span>';
        } else {
            statusElement.innerHTML = '<span class="status-browser">🌐 Browser</span>';
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Aplikasi Gaji Pegawai...');
    
    try {
        // Initialize database
        await db.open();
        console.log('✅ Database initialized');
        
        // Initialize features
        initNavigation();
        initInsertForm();
        initDeletePage();
        initExport();
        initPWA();
        
        // Load initial dashboard data
        loadDashboardData();
        
        console.log('✅ Aplikasi siap digunakan');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showNotification('Gagal memuat aplikasi: ' + error.message, 'error');
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration);
            })
            .catch((registrationError) => {
                console.log('❌ Service Worker registration failed:', registrationError);
            });
    });
}