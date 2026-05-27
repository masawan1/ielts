// =========================================================================
// PENTING: SESUAIKAN SCRIPT_URL DENGAN LINK WEB APP APPS SCRIPT ANDA
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc6W_0drPCYbRJqRv2tFKRakLq-Fh3YvlWM_ABpHaB3l2XsURaNxMC4seFRjZRvays/exec";

document.addEventListener('DOMContentLoaded', ambilLogDariSpreadsheet);

// Fungsi memunculkan modal sekaligus mengunci efek blur layar belakang
function showMessage(title, text) {
    document.getElementById('msg-title').innerText = title;
    document.getElementById('msg-body').innerText = text;
    document.getElementById('message-modal').classList.remove('hidden');
}

// Fungsi menutup modal dan langsung mengembalikan kecerahan layar admin secara total
function closeModal() {
    document.getElementById('message-modal').classList.add('hidden');
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
    tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-slate-400">Loading log database...</td></tr>`;

    fetchJSONP(SCRIPT_URL, { action: 'getQuestions' })
    .then(data => {
        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.reverse().forEach(item => {
                tbody.innerHTML += `<tr>
                    <td class="px-6 py-4 font-bold text-blue-600">${item.pilar || 'Reading'}</td>
                    <td class="px-6 py-4 font-semibold text-slate-900">${item.judul}</td>
                    <td class="px-6 py-4 text-emerald-600 font-bold">✓ Live di Web User</td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-slate-400">Database kosong.</td></tr>`;
        }
    }).catch(() => {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-rose-500">Gagal terhubung ke database spreadsheet.</td></tr>`;
    });
}

function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarTerpilih = document.getElementById('select-pilar').value;

    btn.innerText = `Menulis Soal ${pilarTerpilih}... 🤖`;
    btn.disabled = true;

    fetchJSONP(SCRIPT_URL, { action: 'generateAI', pilar: pilarTerpilih })
    .then(res => {
        showMessage(res.status === "success" ? "Berhasil!" : "Gagal!", res.status === "success" ? `Berhasil membuat materi ${pilarTerpilih} baru!` : res.message);
        ambilLogDariSpreadsheet();
    })
    .catch((err) => showMessage('Gagal!', 'Terjadi kesalahan sistem internal atau format AI terputus.'))
    .finally(() => { 
        btn.innerText = '✨ Generate Soal Lewat AI'; 
        btn.disabled = false; 
    });
}
