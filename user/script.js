const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylIkpodi-acPclPTGT8zPGEALT4wKpHOubBLQJae-DhdQ3GGiIfM8rHCejO9YEFHPh/exec";

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

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); isDragging = true;
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newPercent = ((e.clientX - container.getBoundingClientRect().left) / container.clientWidth) * 100;
        if (newPercent >= 25 && newPercent <= 75) panelKiri.style.width = newPercent + '%';
    });
    document.addEventListener('mouseup', () => isDragging = false);
}

function pindahModul(namaModul, durasiDetik) {
    modulAktif = namaModul; sisaWaktu = durasiDetik; dataLoaded = false;
    rawKontenArray = []; rawPertanyaanArray = []; kunciJawabanSistem = []; jawabanUserMap = {};
    
    if (synthSuara) synthSuara.cancel(); sedangDiputar = false;
    if (mediaRecorder && sedangMerekam) { mediaRecorder.stop(); sedangMerekam = false; }

    ['Listening', 'Reading', 'Writing', 'Speaking'].forEach(m => {
        const btn = document.getElementById('nav-' + m);
        if (btn) btn.className = m === namaModul ? "px-4 py-1.5 bg-white text-blue-600 rounded-lg shadow-sm transition-all" : "px-4 py-1.5 rounded-lg hover:text-white transition-all";
    });

    document.getElementById('pilar-badge').innerText = `OFFICIAL SIMULATION - IELTS ${namaModul.toUpperCase()}`;
    startTimer();
    ambilMateriUjian();
}

function startTimer() {
    const display = document.getElementById('timer');
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
        let m = Math.floor(sisaWaktu / 60), s = sisaWaktu % 60;
        display.innerText = `Time Left: ${(m < 10 ? '0'+m : m)}:${(s < 10 ? '0'+s : s)}`;
        if (sisaWaktu <= 0) { clearInterval(intervalTimer); submitUserAnswers(); } else { sisaWaktu--; }
    }, 1000);
}

function ambilMateriUjian() {
    document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Loading data dari Google Sheets...</p>';
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

    let label = (modulAktif === "Listening" || modulAktif === "Speaking") ? "Part" : "Passage / Task";

    rawKontenArray.forEach((_, index) => {
        leftNav.innerHTML += `<button onclick="showSection(${index})" id="btn-l-sec-${index}" class="px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-white text-slate-700 hover:bg-slate-100 transition shadow-sm">${label} ${index + 1}</button>`;
    });

    if (modulAktif === "Reading" || modulAktif === "Listening") {
        rawPertanyaanArray.forEach((_, index) => {
            rightNav.innerHTML += `<button onclick="showQuestions(${index})" id="btn-r-sec-${index}" class="px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-white text-slate-700 hover:bg-slate-100 transition shadow-sm">Q-Set ${index + 1}</button>`;
        });
    }
}

function showSection(index) {
    if (rawKontenArray.length === 0 || !rawKontenArray[index]) return;
    rawKontenArray.forEach((_, i) => {
        const btn = document.getElementById('btn-l-sec-' + i);
        if(btn) btn.className = i === index ? "px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-slate-800 text-white shadow-md" : "px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-white text-slate-700 hover:bg-slate-100";
    });

    const contentArea = document.getElementById('passage-content');
    let textHTML = rawKontenArray[index].split('\n\n').map(p => `<p class="mb-4 text-justify leading-relaxed">${p}</p>`).join('');

    if (modulAktif === "Listening") {
        contentArea.innerHTML = `
            <div class="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl text-center space-y-4 max-w-sm mx-auto my-6">
                <div class="text-[10px] font-bold uppercase tracking-wider text-blue-400">Secure Native Stream: Part ${index + 1}</div>
                <div class="text-4xl">🎧</div>
                <div class="pt-2 flex justify-center gap-2">
                    <button onclick="kontrolAudio('play', ${index})" id="btn-play" class="bg-blue-600 hover:bg-blue-500 font-bold px-4 py-2 rounded-lg text-xs transition shadow-md">▶ Play Audio</button>
                    <button onclick="kontrolAudio('stop', ${index})" class="bg-slate-800 hover:bg-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition text-slate-400">Stop</button>
                </div>
                <div id="audio-status" class="text-[9px] text-slate-500 italic">Audio streaming blocks automatically after playing once.</div>
            </div>`;
    } else {
        contentArea.innerHTML = textHTML;
    }

    if (modulAktif === "Writing" || modulAktif === "Speaking") showInteractiveInput(index);
    else showQuestions(index);
}

function showQuestions(index) {
    const container = document.getElementById('quiz-container');
    if (rawPertanyaanArray.length === 0 || !rawPertanyaanArray[index]) { container.innerHTML = ''; return; }

    rawPertanyaanArray.forEach((_, i) => {
        const btn = document.getElementById('btn-r-sec-' + i);
        if(btn) btn.className = i === index ? "px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-slate-800 text-white shadow-md" : "px-2.5 py-1 text-[10px] font-bold border rounded-lg bg-white text-slate-700 hover:bg-slate-100";
    });

    let listQ = rawPertanyaanArray[index].split('\n');
    let htmlHTML = '';
    listQ.forEach((qItem, qIdx) => {
        if(qItem.trim()) {
            let globalIdx = index + '_' + qIdx;
            let activeAns = jawabanUserMap[globalIdx] || "";
            htmlHTML += `
            <div class="p-5 bg-white border border-slate-200/80 rounded-xl space-y-3.5 shadow-sm">
                <p class="font-semibold text-xs text-slate-800 leading-relaxed">${qItem}</p>
                <div class="grid grid-cols-3 gap-2 pt-1">
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'TRUE', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-50 transition ${activeAns === 'TRUE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">TRUE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'FALSE', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-50 transition ${activeAns === 'FALSE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">FALSE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'NOT GIVEN', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-50 transition ${activeAns === 'NOT GIVEN' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">NOT GIVEN</button>
                </div>
            </div>`;
        }
    });
    container.innerHTML = htmlHTML;
}

function showInteractiveInput(index) {
    const container = document.getElementById('quiz-container');
    if (modulAktif === "Writing") {
        let currentText = jawabanUserMap['writing_' + index] || "";
        let wCount = currentText === "" ? 0 : currentText.trim().split(/\s+/).length;
        container.innerHTML = `
            <div class="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
                <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">IELTS Answer Sheet: Task ${index + 1}</span>
                    <span id="word-counter" class="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border">${wCount} words</span>
                </div>
                <textarea oninput="hitungKataEssay(this, ${index})" placeholder="Type your full IELTS response essay here..." class="w-full h-80 p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 resize-none leading-relaxed transition-colors">${currentText}</textarea>
            </div>`;
    } else if (modulAktif === "Speaking") {
        container.innerHTML = `
            <div class="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center space-y-4 text-white max-w-sm mx-auto">
                <div class="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Speaking Voice Recorder: Part ${index + 1}</div>
                <div id="mic-icon" class="text-4xl py-2">🎙️</div>
                <button onclick="toggleMicSpeaking(${index})" id="btn-record" class="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-xl text-xs transition shadow-md">🔴 Start Recording Part ${index + 1}</button>
                <div id="audio-preview-container" class="pt-2 ${recordedBlobs[index] ? '' : 'hidden'}">
                    <audio id="audio-playback" controls src="${recordedBlobs[index] || ''}" class="w-full bg-slate-800 rounded-xl"></audio>
                </div>
            </div>`;
    }
}

function kontrolAudio(aksi, pilarIndex = 0) {
    const statusText = document.getElementById('audio-status');
    const btnPlay = document.getElementById('btn-play');
    if (aksi === 'play') {
        if (synthSuara.paused && sedangDiputar) { synthSuara.resume(); return; }
        synthSuara.cancel();
        let targetTeks = rawKontenArray[pilarIndex] ? rawKontenArray[pilarIndex] : "";
        utteranceSuara = new SpeechSynthesisUtterance(targetTeks.replace(/###/g, '').replace(/<[^>]*>/g, ''));
        utteranceSuara.lang = 'en-US'; utteranceSuara.rate = 0.95;
        utteranceSuara.onstart = () => { sedangDiputar = true; if(btnPlay) btnPlay.innerText = "⏸ Pause"; };
        utteranceSuara.onend = () => { sedangDiputar = false; if(btnPlay) { btnPlay.innerText = "Locked"; btnPlay.disabled = true; btnPlay.className = "bg-slate-800 text-slate-600 px-4 py-2 rounded-lg text-xs cursor-not-allowed"; } };
        synthSuara.speak(utteranceSuara);
    } else if (aksi === 'stop') { synthSuara.cancel(); sedangDiputar = false; if(btnPlay) btnPlay.innerText = "▶ Play Part " + (pilarIndex + 1); }
}

function simpanObjekAnswer(id, val, btn) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.className = "py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-50 transition");
    btn.className = "py-2 text-[10px] border-2 border-blue-500 bg-blue-50 text-blue-600 rounded-lg font-bold shadow-sm";
    jawabanUserMap[id] = val;
}

function hitungKataEssay(textarea, index) {
    let txt = textarea.value; jawabanUserMap['writing_' + index] = txt;
    document.getElementById('word-counter').innerText = (txt.trim() === "" ? 0 : txt.trim().split(/\s+/).length) + ' words';
}

function toggleMicSpeaking(index) {
    const btn = document.getElementById('btn-record'); const mic = document.getElementById('mic-icon');
    if (!sedangMerekam) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                recordedBlobs[index] = URL.createObjectURL(new Blob(audioChunks, { type: 'audio/mp3' }));
                document.getElementById('audio-playback').src = recordedBlobs[index];
                document.getElementById('audio-preview-container').classList.remove('hidden');
            };
            mediaRecorder.start(); sedangMerekam = true;
            mic.className = "text-4xl py-2 本 animate-bounce text-rose-500"; btn.innerText = "⏹ Stop & Save Part " + (index + 1);
        });
    } else {
        if (mediaRecorder) mediaRecorder.stop(); sedangMerekam = false;
        mic.className = "text-4xl py-2 text-white"; btn.innerText = "🔴 Record Again";
    }
}

function submitUserAnswers() {
    if (synthSuara) synthSuara.cancel(); if (intervalTimer) clearInterval(intervalTimer);
    let score = "0.0", benar = 0;
    kunciJawabanSistem.forEach((kunci, i) => {
        let userAns = "";
        for (let key in jawabanUserMap) { if (key.startsWith(i + '_') || key === '0_' + i) userAns = jawabanUserMap[key]; }
        if (userAns && userAns.trim().toUpperCase() === kunci.trim().toUpperCase()) benar++;
    });
    score = benar === kunciJawabanSistem.length ? "9.0" : benar > 0 ? "6.5" : "4.0";
    document.getElementById('band-score').innerText = score;
    document.getElementById('correct-fraction').innerText = `Correct: ${benar} / ${kunciJawabanSistem.length} Questions Checked`;
    const modal = document.getElementById('result-modal');
    modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 50);
}

function renderEmptyState() {
    document.getElementById('passage-content').innerHTML = `<div class="p-5 bg-amber-50 text-amber-700 rounded-xl text-xs border border-amber-200">Materi ${modulAktif} belum siap atau masih kosong di database. Silakan jalankan fitur 'Generate AI' di Control Panel Admin!</div>`;
}
