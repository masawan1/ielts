const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUmoWd4je9H732lLSldBqST9rKwYZmvJJH-fxyl6_S63XJducrrpxKCM5wrpNyQIMg/exec";

document.addEventListener('DOMContentLoaded', ambilLogDariSpreadsheet);

function showMessage(title, text) {
    document.getElementById('msg-title').innerText = title;
    document.getElementById('msg-body').innerText = text;
    const modal = document.getElementById('message-modal');
    const box = document.getElementById('message-box');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 50);
}

function closeModal() {
    const modal = document.getElementById('message-modal');
    const box = document.getElementById('message-box');
    modal.classList.add('opacity-0'); box.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function fetchJSONP(url, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.round(100000 * Math.random());
        window[callbackName] = data => { resolve(data); delete window[callbackName]; const el = document.getElementById(callbackName); if (el) el.remove(); };
        const urlObj = new URL(url);
        urlObj.searchParams.set('callback', callbackName);
        for (let key in params) { urlObj.searchParams.set(key, params[key]); }
        const script = document.createElement('script');
        script.src = urlObj.toString(); script.id = callbackName;
        script.onerror = () => { reject(); delete window[callbackName]; const el = document.getElementById(callbackName); if (el) el.remove(); };
        document.body.appendChild(script);
    });
}

function ambilLogDariSpreadsheet() {
    const tbody = document.getElementById('log-output');
    tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500 italic">Membaca database...</td></tr>`;

    fetchJSONP(SCRIPT_URL, { action: 'getQuestions', _ : new Date().getTime() })
    .then(data => {
        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.reverse().forEach(item => {
                // Konfigurasi variasi warna badge khusus untuk modul General English agar kontras dengan IELTS
                let pilarBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                if(item.pilar === "Listening") pilarBadgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                if(item.pilar === "Writing") pilarBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                if(item.pilar === "Speaking") pilarBadgeColor = "bg-pink-500/10 text-pink-400 border-pink-500/20";
                
                // General English Badges (Warna Hijau Gradasi Emerald)
                if(item.pilar === "Grammar & Vocab" || item.pilar === "Daily Conversation" || item.pilar === "Short Expression" || item.pilar === "Pronunciation") {
                    pilarBadgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold";
                }

                tbody.innerHTML += `
                <tr class="hover:bg-slate-800/30 transition duration-150">
                    <td class="px-6 py-4">
                        <span class="text-[9px] uppercase tracking-wide px-2 py-0.5 border rounded ${pilarBadgeColor}">
                            ${item.pilar || 'Reading'}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-100 max-w-sm truncate">${item.judul}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="hapusSoalPerBaris('${item.waktu}')" class="text-rose-400 hover:text-rose-300 bg-rose-500/5 border border-rose-500/10 px-2.5 py-1 rounded text-[10px] transition">🗑️ Hapus</button>
                    </td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">Database masih kosong.</td></tr>`;
        }
    }).catch(() => {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-rose-400">Gagal memuat database.</td></tr>`;
    });
}

function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarTerpilih = document.getElementById('select-pilar').value;

    btn.innerText = `AI Sedang Menulis Modul ${pilarTerpilih}... 🤖`;
    btn.disabled = true;
    btn.className = "w-full bg-slate-800 border border-slate-700 text-slate-400 font-extrabold py-3.5 px-4 rounded-xl cursor-not-allowed text-xs";

    fetchJSONP(SCRIPT_URL, { action: 'generateAI', pilar: pilarTerpilih })
    .then(res => {
        showMessage(res.status === "success" ? "Berhasil!" : "Gagal!", res.status === "success" ? `Sukses membuat materi ${pilarTerpilih} baru!` : res.message);
        ambilLogDariSpreadsheet();
    })
    .catch(() => showMessage('Gagal!', 'Terjadi kesalahan sistem internal.'))
    .finally(() => { 
        btn.innerText = '✨ Generate Soal Lewat AI'; btn.disabled = false; 
        btn.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-lg";
    });
}

function hapusSoalPerBaris(waktuKey) {
    if (!confirm("Hapus materi ini secara permanen?")) return;
    fetchJSONP(SCRIPT_URL, { action: 'deleteRow', waktu: waktuKey })
    .then(res => { showMessage("Dihapus!", res.message); ambilLogDariSpreadsheet(); });
}

function hapusSemuaDatabaseSoal() {
    if (!confirm("Hapus seluruh isi spreadsheet?")) return;
    fetchJSONP(SCRIPT_URL, { action: 'deleteAll' })
    .then(res => { showMessage("Database Bersih!", res.message); ambilLogDariSpreadsheet(); });
}
