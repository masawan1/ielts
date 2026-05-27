// =========================================================================
// PENTING: SESUAIKAN SCRIPT_URL DENGAN LINK WEB APP APPS SCRIPT ANDA
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUmoWd4je9H732lLSldBqST9rKwYZmvJJH-fxyl6_S63XJducrrpxKCM5wrpNyQIMg/exec";

let modulAktif = "Reading", kunciJawabanSistem = [], sisaWaktu = 3600, intervalTimer = null, dataLoaded = false;
let rawKontenArray = [], rawPertanyaanArray = [], jawabanUserMap = {};
let synthSuara = window.speechSynthesis, utteranceSuara = null, sedangDiputar = false;
let mediaRecorder = null, audioChunks = [], sedangMerekam = false, recordedBlobs = {};

window.addEventListener('DOMContentLoaded', () => {
    pindahModul('Reading', 3600);
    inisialisasiFiturGeserPanel(); 
});

// =========================================================================
// 1. ENGINE FITUR GESER PANEL (RESIZE WORKSPACE CONTROLLER)
// =========================================================================
function inisialisasiFiturGeserPanel() {
    const container = document.getElementById('workspace-container');
    const panelKiri = document.getElementById('panel-kiri');
    const resizer = document.getElementById('panel-resizer');
    let isDragging = false;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newPercent = ((e.clientX - container.getBoundingClientRect().left) / container.clientWidth) * 100;
        if (newPercent >= 25 && newPercent <= 75) {
            panelKiri.style.width = newPercent + '%';
        }
    });

    document.addEventListener('mouseup', () => isDragging = false);
}

// =========================================================================
// 2. LOGIKA MANAJEMEN MENU DUAL-MODE (IELTS VS DUOLINGO LEARN)
// =========================================================================
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
            btn.className = (key === namaModul)
                ? ((key === 'Grammar & Vocab' || key === 'Daily Conversation' || key === 'Short Expression' || key === 'Pronunciation') ? "px-2.5 py-1 rounded bg-emerald-400 text-slate-900 shadow-sm transition" : "px-2.5 py-1 rounded bg-white text-blue-600 shadow-sm transition")
                : "px-2.5 py-1 rounded hover:text-white transition";
        }
    }

    const statusBadge = document.getElementById('mode-status-badge');
    const timerWidget = document.getElementById('timer');
    const submitBtnArea = document.querySelector('button[onclick="submitUserAnswers()"]').parentElement;

    if (namaModul === 'Grammar & Vocab' || namaModul === 'Daily Conversation' || namaModul === 'Short Expression' || namaModul === 'Pronunciation') {
        if (intervalTimer) clearInterval(intervalTimer);
        statusBadge.innerText = "DUOLINGO LEARN MODE";
        statusBadge.className = "bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black text-[10px]";
        document.getElementById('pilar-badge').innerText = `FUN LEARNING - ${namaModul.toUpperCase()}`;
        document.getElementById('total-questions-badge').innerText = "INTERACTIVE FLASHCARDS";
        
        timerWidget.innerText = "🦉 Level Up!";
        timerWidget.className = "text-xs font-extrabold px-3 py-1 bg-emerald-600 text-white rounded shadow animate-none";
        submitBtnArea.classList.add('hidden');
    } else {
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

// =========================================================================
// 3. KONEKSI DATA DATABASE SPREADSHEET (JSONP METHOD)
// =========================================================================
function ambilMateriUjian() {
    document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Loading fun study session...</p>';
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

    let label = "Stage";
    if (modulAktif === "Listening" || modulAktif === "Daily Conversation") label = "Scenario";
    if (modulAktif === "Reading") label = "Passage";

    rawKontenArray.forEach((_, index) => {
        leftNav.innerHTML += `<button onclick="showSection(${index})" id="btn-l-sec-${index}" class="px-3 py-1 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-50 transition">${label} ${index + 1}</button>`;
    });

    if (kunciJawabanSistem[0] !== "LEARN_MODE" && rawPertanyaanArray.length > 0 && rawPertanyaanArray[0] !== "") {
        rawPertanyaanArray.forEach((_, index) => {
            rightNav.innerHTML += `<button onclick="showQuestions(${index})" id="btn-r-sec-${index}" class="px-2 py-0.5 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-50 transition">Q-Set ${index + 1}</button>`;
        });
    }
}

// =========================================================================
// 4. RENDER ANTARMUKA WORKSPACE PANEL SEBELAH KIRI & KANAN FLASHCARD
// =========================================================================
function showSection(index) {
    if (rawKontenArray.length === 0 || !rawKontenArray[index]) return;
    rawKontenArray.forEach((_, i) => {
        const btn = document.getElementById(`btn-l-sec-${i}`);
        if(btn) btn.className = i === index ? "px-3 py-1 text-[10px] font-bold border rounded bg-emerald-600 text-white shadow-sm" : "px-3 py-1 text-[10px] font-bold border rounded bg-white text-slate-700";
    });

    const contentArea = document.getElementById('passage-content');
    let textHTML = rawKontenArray[index].split('\n\n').map(p => `<p class="mb-4 text-slate-700 text-sm leading-relaxed bg-white p-3 rounded-xl border border-slate-100 shadow-sm">${p}</p>`).join('');

    contentArea.innerHTML = `
        <div class="space-y-3">
            <div class="text-[10px] font-black text-emerald-600 tracking-wider uppercase">💡 Bite-Sized Core Concept:</div>
            ${textHTML}
        </div>`;

    // ENGINE TRANSLATOR KARTU INTERAKTIF MODEL DUOLINGO
    if (kunciJawabanSistem[0] === "LEARN_MODE") {
        const container = document.getElementById('quiz-container');
        container.innerHTML = "";
        
        if (rawPertanyaanArray[index]) {
            let barisKartu = rawPertanyaanArray[index].split('\n');
            let deckHTML = `
            <div class="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-2">Tap cards to flip meaning & speak!</div>
            <div class="flex flex-col gap-4 w-full pb-6">`;
            
            barisKartu.forEach((item) => {
                if (item.includes('||')) {
                    let part = item.split('||').map(s => s.trim());
                    let kataInggris = part[0] || "Word";
                    let artiIndo = part[1] || "Arti";
                    let contohKalimat = part[2] || "";
                    
                    deckHTML += `
                    <div class="flashcard-wrapper w-full h-32 relative" onclick="balikKartuHafalan(this)">
                        <div class="flashcard-inner w-full h-full">
                            <div class="card-front bg-white border-2 border-slate-200 p-5 shadow-sm flex justify-between items-center hover:border-emerald-400 transition duration-200 box-border">
                                <div class="pr-4 overflow-hidden">
                                    <span class="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">English</span>
                                    <h4 class="text-base font-black text-slate-800 mt-1 truncate">${kataInggris}</h4>
                                    <p class="text-xs text-slate-400 mt-1 italic font-medium line-clamp-2">🗣️ ${contohKalimat}</p>
                                </div>
                                <button onclick="suaraLafalDuolingo(event, '${kataInggris.replace(/'/g, "\\'")}')" class="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center text-sm shadow transition transform active:scale-95">🔊</button>
                            </div>
                            <div class="card-back bg-slate-900 border-2 border-slate-800 p-5 shadow-inner flex flex-col justify-center items-center text-center box-border text-white">
                                <span class="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">INDONESIAN MEANING</span>
                                <div class="text-base font-black mt-1 tracking-wide text-emerald-100">${artiIndo}</div>
                                <div class="text-[9px] text-slate-500 mt-2">Click to flip back</div>
                            </div>
                        </div>
                    </div>`;
                }
            });
            deckHTML += `</div>`;
            container.innerHTML = deckHTML;
        }
    } else {
        showQuestions(index);
    }
}

// =========================================================================
// 5. ENGINE HALAMAN PEMBALIK INTERAKTIF & AUDIO PLAYBACK
// =========================================================================
function balikKartuHafalan(elemen) {
    const cardInner = elemen.querySelector('.flashcard-inner');
    if (cardInner) {
        cardInner.classList.toggle('flashcard-flipped');
    }
}

function suaraLafalDuolingo(event, teks) {
    event.stopPropagation(); 
    if (synthSuara) {
        synthSuara.cancel();
        let u = new SpeechSynthesisUtterance(teks);
        u.lang = 'en-US';
        u.rate = 0.85; 
        synthSuara.speak(u);
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
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'TRUE', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'TRUE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">TRUE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'FALSE', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'FALSE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">FALSE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'NOT GIVEN', this)" class="py-1.5 text-[10px] border rounded bg-white text-slate-700 ${activeAns === 'NOT GIVEN' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600 font-bold' : ''}">NOT GIVEN</button>
                </div>
            </div>`;
        }
    });
    container.innerHTML = htmlHTML;
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
    document.getElementById('correct-fraction').innerText = `Correct: ${benar} / ${kunciJawabanSistem.length}`;
    const modal = document.getElementById('result-modal');
    modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 50);
}

function renderEmptyState() {
    document.getElementById('passage-content').innerHTML = `<div class="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs border border-amber-200">Materi belum tersedia. Silakan klik buat materi "${modulAktif}" ini di Admin Panel terlebih dahulu!</div>`;
}
