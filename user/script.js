const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-QbU6LuHCzb7sIscbwvN6-iTYc5pkgy8Tg1gKBMeRNdWIM1aq5HTJcKbOvqcOUygY/exec";

let modulAktif = "Reading", kunciJawabanSistem = [], sisaWaktu = 3600, intervalTimer = null, dataLoaded = false;
let rawKontenArray = [], rawPertanyaanArray = [], jawabanUserMap = {};
let synthSuara = window.speechSynthesis, utteranceSuara = null, sedangDiputar = false;
let mediaRecorder = null, audioChunks = [], sedangMerekam = false, recordedBlobs = {};

window.addEventListener('DOMContentLoaded', () => {
    pindahModul('Reading', 3600);
    inisialisasiFiturGeserPanel(); 
});

function inisialisasiFiturGeserPanel() {
    const container = document.getElementById('workspace-container');
    const panelKiri = document.getElementById('panel-kiri');
    const resizer = document.getElementById('panel-resizer');
    let isDragging = false;
    resizer.addEventListener('mousedown', (e) => { e.preventDefault(); isDragging = true; });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newPercent = ( (e.clientX - container.getBoundingClientRect().left) / container.clientWidth ) * 100;
        if (newPercent >= 25 && newPercent <= 75) panelKiri.style.width = newPercent + '%';
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

// LOGIKA UTAMA: DETEKSI JENIS SEKTOR MODUL (IELTS VS GENERAL ENGLISH LEARN)
function pindahModul(namaModul, durasiDetik) {
    modulAktif = namaModul; sisaWaktu = durasiDetik; dataLoaded = false;
    rawKontenArray = []; rawPertanyaanArray = []; kunciJawabanSistem = []; jawabanUserMap = {};
    
    if (synthSuara) synthSuara.cancel(); sedangDiputar = false;
    if (mediaRecorder && sedangMerekam) { mediaRecorder.stop(); sedangMerekam = false; }

    const listMenuId = {
        'Listening': 'nav-Listening', 'Reading': 'nav-Reading', 'Writing': 'nav-Writing', 'Speaking': 'nav-Speaking',
        'Grammar & Vocab': 'nav-GrammarVocab', 'Daily Conversation': 'nav-DailyConversation', 'Short Expression': 'nav-ShortExpression', 'Pronunciation': 'nav-Pronunciation'
    };
    
    for (let key in listMenuId) {
        const btn = document.getElementById(listMenuId[key]);
        if (btn) {
            if (key === namaModul) {
                btn.className = (key === 'Grammar & Vocab' || key === 'Daily Conversation' || key === 'Short Expression' || key === 'Pronunciation')
                    ? "px-2.5 py-1 rounded bg-emerald-400 text-slate-900 shadow-sm transition"
                    : "px-2.5 py-1 rounded bg-white text-blue-600 shadow-sm transition";
            } else {
                btn.className = "px-2.5 py-1 rounded hover:text-white transition";
            }
        }
    }

    const statusBadge = document.getElementById('mode-status-badge');
    const timerWidget = document.getElementById('timer');
    const submitBtnArea = document.querySelector('button[onclick="submitUserAnswers()"]').parentElement;

    // DETEKSI APAKAH MODUL TERMASUK RUMPUN LEARN MODE (BAHASA INGGRIS UMUM)
    if (namaModul === 'Grammar & Vocab' || namaModul === 'Daily Conversation' || namaModul === 'Short Expression' || namaModul === 'Pronunciation') {
        if (intervalTimer) clearInterval(intervalTimer);
        statusBadge.innerText = "LEARN MODE";
        statusBadge.className = "bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px]";
        document.getElementById('pilar-badge').innerText = `LEARNING - ${namaModul.toUpperCase()}`;
        document.getElementById('total-questions-badge').innerText = "STUDY NOTES & INSIGHT";
        
        timerWidget.innerText = "☕ Study Room";
        timerWidget.className = "text-xs font-extrabold px-3 py-1 bg-emerald-600 text-white rounded shadow animate-none";
        
        // Sembunyikan tombol submit ujian karena tidak ada soal kuis yang perlu dikirim
        submitBtnArea.classList.add('hidden');
    } else {
        // KONDISI JIKA MODUL ADALAH REZIM SIMULASI IELTS KETAT
        statusBadge.innerText = "SIMULATION MODE";
        statusBadge.className = "bg-blue-600 text-white px-2 py-0.5 rounded font-black text-[10px]";
        document.getElementById('pilar-badge').innerText = `OFFICIAL SIMULATION - IELTS ${namaModul.toUpperCase()}`;
        document.getElementById('total-questions-badge').innerText = "PRACTICE SHEET";
        
        timerWidget.className = "text-xs font-extrabold px-3 py-1 bg-rose-600 text-white rounded shadow animate-pulse";
        submitBtnArea.classList.remove('hidden');
        startTimer();
    }

    document.getElementById('left-sub-nav').innerHTML = '';
    document.getElementById('right-sub-nav').innerHTML = '';
    ambilMateriUjian();
}

function startTimer() {
    const display = document.getElementById('timer');
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
        let m = Math.floor(sisaWaktu / 60), s = sisaWaktu % 60;
        display.innerText = `Time Left: ${(m < 10 ? '0'+m : m)}:${(s < 10 ? '0'+s : s)}`;
        if (sisaWaktu <= 0) { clearInterval(intervalTimer); submitUserAnswers(true); } else { sisaWaktu--; }
    }, 1000);
}

function ambilMateriUjian() {
    document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Streaming study guidelines from database...</p>';
    document.getElementById('quiz-container').innerHTML = '';
    const cb = 'jsonp_kuis_' + Math.round(Math.random() * 100000);
    
    window[cb] = (data) => {
        dataLoaded = true;
        if (data && data.length > 0) {
            let row = data.reverse().find(d => d.pilar && d.pilar.toUpperCase() === modulAktif.toUpperCase());
            if (row) { processDataExam(row); return; }
        }
        renderEmptyState();
    };
    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?action=getQuestions&callback=${cb}&_=${new Date().getTime()}`;
    document.body.appendChild(script);
}

function processDataExam(row) {
    rawKontenArray = row.konten ? row.konten.split('###').map(p => p.trim()) : [];
    rawPertanyaanArray = row.pertanyaan ? row.pertanyaan.split('###').map(q => q.trim()) : [];
    kunciJawabanSistem = row.kunci_jawaban ? row.kunci_jawaban.split(',') : [];
    generateSubNavigations();
    showSection(0);
}

function generateSubNavigations() {
    const leftNav = document.getElementById('left-sub-nav');
    const rightNav = document.getElementById('right-sub-nav');
    leftNav.innerHTML = ''; rightNav.innerHTML = '';

    let label = "Topic";
    if (modulAktif === "Listening" || modulAktif === "Daily Conversation") label = "Dialogue / Part";
    if (modulAktif === "Reading") label = "Passage";
    if (modulAktif === "Writing") label = "Task";

    rawKontenArray.forEach((_, index) => {
        leftNav.innerHTML += `<button onclick="showSection(${index})" id="btn-l-sec-${index}" class="px-2 py-0.5 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-50 transition">${label} ${index + 1}</button>`;
    });

    // Sub-navigasi kanan hanya dibuat jika berada di mode IELTS (karena mode belajar memetakan konten berdampingan otomatis)
    if (kunciJawabanSistem[0] !== "LEARN_MODE" && rawPertanyaanArray.length > 0 && rawPertanyaanArray[0] !== "") {
        rawPertanyaanArray.forEach((_, index) => {
            rightNav.innerHTML += `<button onclick="showQuestions(${index})" id="btn-r-sec-${index}" class="px-2 py-0.5 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-50 transition">Q-Set ${index + 1}</button>`;
        });
    }
}

function showSection(index) {
    if (rawKontenArray.length === 0 || !rawKontenArray[index]) return;
    rawKontenArray.forEach((_, i) => {
        const btn = document.getElementById(`btn-l-sec-${i}`);
        if(btn) btn.className = i === index ? "px-2 py-0.5 text-[10px] font-bold border rounded bg-slate-800 text-white shadow-sm" : "px-2 py-0.5 text-[10px] font-bold border rounded bg-white text-slate-700";
    });

    const contentArea = document.getElementById('passage-content');
    let textHTML = rawKontenArray[index].split('\n\n').map(p => `<p class="mb-3 text-justify leading-relaxed">${p}</p>`).join('');

    if (modulAktif === "Listening" || modulAktif === "Daily Conversation") {
        contentArea.innerHTML = `
            <div class="bg-slate-900 text-white p-5 rounded-xl text-center space-y-3 max-w-sm mx-auto my-4 shadow-xl">
                <div class="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Audio Listener Engine</div>
                <div class="text-2xl">🎧</div>
                <div class="pt-1 flex justify-center gap-2">
                    <button onclick="kontrolAudio('play', ${index})" id="btn-play" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-xs font-bold transition">▶ Play Audio</button>
                    <button onclick="kontrolAudio('stop', ${index})" class="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-xs font-bold transition text-slate-400">Stop</button>
                </div>
                <div id="audio-status" class="text-[9px] text-slate-500 italic">Ready to stream speech text.</div>
            </div>`;
    } else {
        contentArea.innerHTML = textHTML;
    }

    // ADAPTASI KANVAS KANAN: Jika terdeteksi data edukasi murni (LEARN_MODE), render sebagai teks review rangkuman, bukan kuis
    if (kunciJawabanSistem[0] === "LEARN_MODE") {
        const container = document.getElementById('quiz-container');
        if (rawPertanyaanArray[index]) {
            let notesHTML = rawPertanyaanArray[index].split('\n\n').map(p => `<div class="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-slate-800 leading-relaxed shadow-sm mb-2">${p}</div>`).join('');
            container.innerHTML = `
                <div class="space-y-2">
                    <div class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-2">📚 Teacher's Notes & Reference Box:</div>
                    ${notesHTML}
                </div>`;
        } else {
            container.innerHTML = `<p class="text-slate-400 italic text-xs text-center py-10">Membuka materi pendukung...</p>`;
        }
    } else {
        // Tampilan Lembar Kuis Khusus IELTS
        showQuestions(index);
    }
}

function showQuestions(index) {
    const container = document.getElementById('quiz-container');
    if (rawPertanyaanArray.length === 0 || !rawPertanyaanArray[index]) { container.innerHTML = ''; return; }

    rawPertanyaanArray.forEach((_, i) => {
        const btn = document.getElementById(`btn-r-sec-${i}`);
        if(btn) btn.className = i === index ? "px-2 py-0.5 text-[10px] font-bold border rounded bg-slate-800 text-white shadow-sm" : "px-2 py-0.5 text-[10px] font-bold border rounded bg-white text-slate-700";
    });

    let listQ = rawPertanyaanArray[index].split('\n');
    let htmlHTML = '';
    listQ.forEach((qItem, qIdx) => {
        if(qItem.trim()) {
            let globalIdx = `${index}_${qIdx}`;
            let activeAns = jawabanUserMap[globalIdx] || "";
            htmlHTML += `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <p class="font-semibold text-xs text-slate-800 leading-relaxed">${qItem}</p>
                <div class="grid grid-cols-3 gap-2 pt-1">
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'TRUE', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'TRUE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">TRUE / YES</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'FALSE', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'FALSE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">FALSE / NO</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'NOT GIVEN', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'NOT GIVEN' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">NOT GIVEN</button>
                </div>
            </div>`;
        }
    });
    container.innerHTML = htmlHTML;
}

function kontrolAudio(aksi, pilarIndex = 0) {
    const statusText = document.getElementById('audio-status');
    const btnPlay = document.getElementById('btn-play');
    if (aksi === 'play') {
        if (synthSuara.paused && sedangDiputar) { synthSuara.resume(); if(statusText) statusText.innerText = "Status: Playing audio..."; return; }
        synthSuara.cancel();
        let targetTeks = rawKontenArray[pilarIndex] ? rawKontenArray[pilarIndex] : "";
        utteranceSuara = new SpeechSynthesisUtterance(targetTeks.replace(/###/g, '').replace(/<[^>]*>/g, ''));
        utteranceSuara.lang = 'en-US'; utteranceSuara.rate = 0.95;
        utteranceSuara.onstart = () => { sedangDiputar = true; if(btnPlay) btnPlay.innerText = "⏸ Pause"; };
        utteranceSuara.onend = () => { sedangDiputar = false; if(btnPlay) btnPlay.innerText = "▶ Replay Audio"; if(statusText) statusText.innerText = "Status: Finished."; };
        synthSuara.speak(utteranceSuara);
    } else if (aksi === 'stop') { synthSuara.cancel(); sedangDiputar = false; if(btnPlay) btnPlay.innerText = "▶ Play Audio"; }
}

function simpanObjekAnswer(id, val, btn) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.className = "py-1.5 text-[10px] border rounded bg-white text-slate-700");
    btn.className = "py-1.5 text-[10px] border-2 border-blue-500 bg-blue-50 text-blue-600 rounded font-bold shadow-sm";
    jawabanUserMap[id] = val;
}

function submitUserAnswers() {
    if (synthSuara) synthSuara.cancel(); if (intervalTimer) clearInterval(intervalTimer);
    let score = "0.0", benar = 0;
    
    kunciJawabanSistem.forEach((kunci, i) => {
        let userAns = "";
        for (let key in jawabanUserMap) { if (key.startsWith(`${i}_`) || key === `0_${i}`) userAns = jawabanUserMap[key]; }
        if (userAns && userAns.trim().toUpperCase() === kunci.trim().toUpperCase()) benar++;
    });
    score = benar === kunciJawabanSistem.length ? "9.0" : benar > 0 ? "6.5" : "4.0";
    
    document.getElementById('band-score').innerText = score;
    document.getElementById('correct-fraction').innerText = `Benar ${benar} dari ${kunciJawabanSistem.length} Soal`;
    const modal = document.getElementById('result-modal');
    modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 50);
}

function renderEmptyState() {
    document.getElementById('passage-content').innerHTML = `<div class="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs border border-amber-200">Materi belum di-generate oleh Admin. Silakan buat materi pilar "${modulAktif}" ini di Admin Panel terlebih dahulu agar muncul di sini!</div>`;
}
