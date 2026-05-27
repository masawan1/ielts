// =========================================================================
// PENTING: SESUAIKAN SCRIPT_URL DENGAN LINK WEB APP APPS SCRIPT ANDA
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcyDKJKSzdVXgqoKpssG_GaNHjmKTUGpawktfilLCEyh9GdXQIzRY8Frv0PvP2fZBy/exec";

document.addEventListener('DOMContentLoaded', ambilLogDariSpreadsheet);

// Membuka modal dengan animasi transisi memudar halus
function showMessage(title, text) {
    document.getElementById('msg-title').innerText = title;
    document.getElementById('msg-body').innerText = text;
    
    const modal = document.getElementById('message-modal');
    const box = document.getElementById('message-box');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
    }, 50);
}

// Menutup modal dengan animasi mundur
function closeModal() {
    const modal = document.getElementById('message-modal');
    const box = document.getElementById('message-box');
    
    modal.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function fetchJSONP(url, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.round(100000 * Math.random());
        window[callbackName] = data => { 
            resolve(data); 
            delete window[callbackName]; 
            const el = document.getElementById(callbackName);
            if (el) el.remove(); 
        };
        const urlObj = new URL(url);
        urlObj.searchParams.set('callback', callbackName);
        for (let key in params) { urlObj.searchParams.set(key, params[key]); }
        const script = document.createElement('script');
        script.src = urlObj.toString();
        script.id = callbackName;
        script.onerror = () => { 
            reject(); 
            delete window[callbackName]; 
            const el = document.getElementById(callbackName);
            if (el) el.remove(); 
        };
        document.body.appendChild(script);
    });
}

function ambilLogDariSpreadsheet() {
    const tbody = document.getElementById('log-output');
    tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500 italic">Membaca log produksi dari database spreadsheet...</td></tr>`;

    // Ambil data acak timestamp untuk memecahkan cache browser
    const timestamp = new Date().getTime();

    fetchJSONP(SCRIPT_URL, { action: 'getQuestions', _ : timestamp })
    .then(data => {
        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.reverse().forEach(item => {
                // Skema badge warna bervariasi sesuai tipe pilar ujian
                let pilarBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                if(item.pilar === "Listening") pilarBadgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                if(item.pilar === "Writing") pilarBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                if(item.pilar === "Speaking") pilarBadgeColor = "bg-pink-500/10 text-pink-400 border-pink-500/20";

                tbody.innerHTML += `
                <tr class="hover:bg-slate-800/30 transition duration-150">
                    <td class="px-6 py-4">
                        <span class="text-[10px] font-extrabold px-2 py-0.5 border rounded ${pilarBadgeColor}">
                            ${item.pilar || 'Reading'}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-100 max-w-sm truncate">${item.judul}</td>
                    <td class="px-6 py-4 text-right">
                        <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
                            ✓ Live di User
                        </span>
                    </td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">Database masih kosong. Mulai generate soal baru!</td></tr>`;
        }
    }).catch(() => {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-rose-400 bg-rose-500/5 border-y border-rose-500/10">Gagal memuat log database Google Sheets.</td></tr>`;
    });
}

function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarTerpilih = document.getElementById('select-pilar').value;

    btn.innerText = `Menulis Soal ${pilarTerpilih}... 🤖`;
    btn.disabled = true;
    btn.className = "w-full bg-slate-800 border border-slate-700 text-slate-400 font-extrabold py-3.5 px-4 rounded-xl cursor-not-allowed text-xs flex items-center justify-center gap-2";

    fetchJSONP(SCRIPT_URL, { action: 'generateAI', pilar: pilarTerpilih })
    .then(res => {
        showMessage(res.status === "success" ? "Berhasil!" : "Gagal!", res.status === "success" ? `Materi modul ${pilarTerpilih} baru sukses diproduksi AI!` : res.message);
        ambilLogDariSpreadsheet();
    })
    .catch(() => showMessage('Gagal!', 'Terjadi kesalahan sistem internal atau koneksi internet terputus.'))
    .finally(() => { 
        btn.innerText = '✨ Generate Soal Lewat AI'; 
        btn.disabled = false; 
        btn.className = "w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-extrabold py-3.5 px-4 rounded-xl transition duration-200 text-xs shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2";
    });
}
