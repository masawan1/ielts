// =========================================================================
// CONFIGURATION
// =========================================================================
// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT KAMU SETELAH DEPLOY ULANG (VERSI BARU)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwJG0wHd948H_26VWhNcjWtDQs-CxE24nAN48A4dAxa8i_bZarfeHIsp9vOYSV101s/exec";

// =========================================================================
// DOM EVENTS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("IELTS AI Admin Dashboard Ready.");
    // Ambil log materi langsung dari Google Spreadsheet saat halaman pertama kali dimuat
    ambilLogDariSpreadsheet();
});

// =========================================================================
// CORE FUNCTIONS
// =========================================================================

/**
 * Mengambil seluruh data materi yang ada di Google Spreadsheet secara real-time
 * dan merendernya ke dalam tabel Log Produksi.
 */
function ambilLogDariSpreadsheet() {
    const tbody = document.getElementById('log-output');
    if (!tbody) return;

    // Tampilkan efek loading sementara menunggu data dari Google Sheets
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">Menyinkronkan dengan Google Sheets... 🔄</td></tr>`;

    // Melakukan request GET ke Apps Script untuk menarik semua data baris
    fetch(`${SCRIPT_URL}?action=getQuestions`)
    .then(res => res.json())
    .then(data => {
        tbody.innerHTML = ''; // Bersihkan tulisan loading

        if (data && data.length > 0) {
            // Balik urutan data (LIFO) agar soal yang paling baru dibuat AI muncul di baris paling atas
            const dataTerbalik = data.reverse();
            
            dataTerbalik.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.pilar || 'Reading'}</strong></td>
                    <td>${item.judul || 'Tanpa Judul'}</td>
                    <td><span style="color: #10b981; font-weight: bold;">✓ Live di Web User</span></td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 20px;">Belum ada riwayat soal di Spreadsheet. Klik tombol di atas untuk membuat!</td></tr>`;
        }
    })
    .catch(err => {
        console.error("Gagal memuat log:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444; font-weight: bold; padding: 20px;">Gagal terhubung dengan database Google Sheets. Pastikan URL Apps Script sudah benar.</td></tr>`;
    });
}

/**
 * Memicu Google Apps Script dan AI Gemini untuk membuat soal IELTS baru
 */
function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarValue = document.getElementById('pilar').value;
    
    // Validasi pilihan pilar
    if (!pilarValue) {
        alert("Silakan pilih Pilar IELTS terlebih dahulu!");
        return;
    }
    
    // Mengubah state tombol saat loading
    btn.innerText = 'AI sedang mengarang artikel & kuis standar Cambridge... 🤖';
    btn.disabled = true;

    // Struktur data yang dikirim ke Google Apps Script
    const payload = {
        action: 'generateAI',
        pilar: pilarValue
    };

    // Menggunakan trik text/plain untuk melewati proteksi CORS di browser saat di-host di GitHub Pages
    fetch(SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.text())
    .then(text => {
        try {
            const response = JSON.parse(text);
            
            if (response.status === "success") {
                alert('Sukses! AI telah berhasil memproduksi soal IELTS baru ke Spreadsheet.');
                // Ambil ulang data dari Spreadsheet agar tabel log langsung ter-update secara real-time
                ambilLogDariSpreadsheet();
            } else {
                alert('Gagal membuat soal otomatis: ' + (response.message || 'Error internal pada server AI.'));
                console.error("AI Error Details:", response.message);
            }
        } catch (e) {
            // Mengatasi kondisi jika Apps Script sukses input data ke Sheets namun terkena bypass CORS redirect
            alert('Permintaan berhasil dikirim ke Google Apps Script!\n\nSistem sedang menulis ke database. Log tabel akan diperbarui otomatis dalam beberapa detik.');
            
            // Berikan jeda 4 detik lalu lakukan refresh log otomatis
            setTimeout(ambilLogDariSpreadsheet, 4000);
        }
    })
    .catch(err => {
        console.error("Fetch Network Error:", err);
        alert('Terjadi kendala koneksi API atau masalah sinkronisasi CORS.');
    })
    .finally(() => {
        // Mengembalikan state tombol ke semula
        btn.innerText = '✨ Generate Soal Baru Lewat AI';
        btn.disabled = false;
    });
}
