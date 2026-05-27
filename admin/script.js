const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_Qf5CgyhYR3Gn5XM1xgq4MLiRcoFX131IhHR5m7zo7cp0PX6nPhUl2m8NvcYT1uHN/exec";

document.addEventListener('DOMContentLoaded',  ambilLogDariSpreadsheet);

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
        window[callbackName] = data => { resolve(data); delete window[callbackName]; document.getElementById(callbackName)?.remove(); };
        const urlObj = new URL(url);
        urlObj.searchParams.set('callback', callbackName);
        for (let key in params) { urlObj.searchParams.set(key, params[key]); }
        const script = document.createElement('script');
        script.src = urlObj.toString(); script.id = callbackName;
        script.onerror = () => { reject(); delete window[callbackName]; document.getElementById(callbackName)?.remove(); };
        document.body.appendChild(script);
    });
}

function ambilLogDariSpreadsheet() {
    const tbody = document.getElementById('log-output');
    tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500 italic">Membaca log bank soal dari database spreadsheet...</td></tr>`;

    fetchJSONP(SCRIPT_URL, { action: 'getQuestions', _ : new Date().getTime() })
    .then(data => {
        tbody.innerHTML = '';
        if (data && data.length > 0) {
            data.reverse().forEach(item => {
                let pilarBadgeColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                if(item.pilar === "Listening") pilarBadgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                if(item.pilar === "Writing") pilarBadgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                if(item.pilar === "Speaking") pilarBadgeColor = "bg-pink-500/10 text-pink-400 border-pink-500/20";

                tbody.innerHTML += `
                <tr class="hover:bg-slate-800/30 transition duration-150">
                    <td class="px-6 py-4">
                        <span class="text-[10px] font-extrabold px-2 py-0.5 border rounded-lg ${pilarBadgeColor}">
                            ${item.pilar || 'Reading'}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-bold text-slate-100 max-w-sm truncate">${item.judul}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="hapusSoalPerBaris('${item.waktu}')" class="text-rose-400 hover:text-rose-300 font-extrabold bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 px-3 py-1 rounded-xl text-[10px] transition">
                            🗑️ Hapus
                        </button>
                    </td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">Database masih kosong. Mulai generate soal baru!</td></tr>`;
        }
    }).catch(() => {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-rose-400 bg-rose-500/5 border-y border-rose-500/10">Gagal terhubung ke database.</td></tr>`;
    });
}

function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarTerpilih = document.getElementById('select-pilar').value;

    btn.innerText = `Menulis Soal ${pilarTerpilih}... 🤖`;
    btn.disabled = true;
    btn.className = "w-full bg-slate-800 border border-slate-700 text-slate-400 font-extrabold py-3.5 px-4 rounded-xl cursor-not-allowed text-xs";

    fetchJSONP(SCRIPT_URL, { action: 'generateAI', pilar: pilarTerpilar = pilarTerpilih })
    .then(res => {
        showMessage(res.status === "success" ? "Berhasil!" : "Gagal!", res.status === "success" ? `Materi modul ${pilarTerpilih} baru sukses diproduksi AI!` : res.message);
        ambilLogDariSpreadsheet();
    })
    .catch(() => showMessage('Gagal!', 'Terjadi kesalahan sistem internal.'))
    .finally(() => { 
        btn.innerText = '✨ Generate Soal Lewat AI'; btn.disabled = false; 
        btn.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-lg";
    });
}

function hapusSoalPerBaris(waktuKey) {
    if (!confirm("Apakah Anda yakin ingin menghapus materi ujian ini secara permanen?")) return;
    fetchJSONP(SCRIPT_URL, { action: 'deleteRow', waktu: waktuKey })
    .then(res => { showMessage(res.status === "success" ? "Dihapus!" : "Gagal!", res.message); ambilLogDariSpreadsheet(); });
}

function hapusSemuaDatabaseSoal() {
    if (!confirm("⚠️ PERINGATAN KELAS BERBAHAYA!\n\nApakah Anda benar-benar yakin ingin menghapus SELURUH bank soal di spreadsheet?")) return;
    fetchJSONP(SCRIPT_URL, { action: 'deleteAll' })
    .then(res => { showMessage("Database Bersih!", res.message); ambilLogDariSpreadsheet(); });
}
