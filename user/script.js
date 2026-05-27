const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcyDKJKSzdVXgqoKpssG_GaNHjmKTUGpawktfilLCEyh9GdXQIzRY8Frv0PvP2fZBy/exec";

let modulAktif = "Reading", kunciJawabanSistem = [], sisaWaktu = 3600, intervalTimer = null, dataLoaded = false;
let rawKontenArray = [], rawPertanyaanArray = [], jawabanUserMap = {};
let synthSuara = window.speechSynthesis, utteranceSuara = null, sedangDiputar = false;
let mediaRecorder = null, audioChunks = [], sedangMerekam = false, recordedBlobs = {};

window.addEventListener('DOMContentLoaded', () => {
    pindahModul('Reading', 3600);
    inisialisasiFiturGeserPanel(); // Aktifkan fungsi drag panel pasca load
});

// =========================================================================
// LOGIKA SAKTI: PENGGESER PANEL REAL-TIME (RESIZE CONTROLLER)
// =========================================================================
function inisialisasiFiturGeserPanel() {
    const container = document.getElementById('workspace-container');
    const panelKiri = document.getElementById('panel-kiri');
    const resizer = document.getElementById('panel-resizer');

    let isDragging = false;

    resizer.addEventListener('mousedown', function (e) {
        e.preventDefault();
        isDragging = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;

        // Hitung persentase posisi kursor terhadap lebar layar kontainer workspace
        const containerWidth = container.clientWidth;
        const currentLeftX = e.clientX - container.getBoundingClientRect().left;
        
        let newWidthPercentage = (currentLeftX / containerWidth) * 100;

        // Batasi geseran minimal 25% dan maksimal 75% agar layout tidak rusak hancur
        if (newWidthPercentage >= 25 && newWidthPercentage <= 75) {
            panelKiri.style.width = newWidthPercentage + '%';
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
        }
    });
}

function pindahModul(namaModul, durasiDetik) {
    modulAktif = namaModul; sisaWaktu = durasiDetik; dataLoaded = false;
    if (synthSuara) synthSuara.cancel(); sedangDiputar = false;
    if (mediaRecorder && sedangMerekam) { mediaRecorder.stop(); sedangMerekam = false; }

    ['Listening', 'Reading', 'Writing', 'Speaking'].forEach(m => {
        const btn = document.getElementById(`nav-${m}`);
        if (btn) btn.className = m === namaModul ? "px-4 py-2 rounded-lg bg-white text-blue-600 shadow-sm transition" : "px-4 py-2 rounded-lg hover:text-white transition";
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
        if (sisaWaktu <= 0) { clearInterval(intervalTimer); submitUserAnswers(true); } else { sisaWaktu--; }
    }, 1000);
}

function ambilMateriUjian() {
    document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Fetching secure exam database from Google Sheets...</p>';
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
    rawKontenArray = row.konten.split('###').map(p => p.trim());
    rawPertanyaanArray = row.pertanyaan ? row.pertanyaan.split('###').map(q => q.trim()) : [];
    kunciJawabanSistem = row.kunci_jawaban ? row.kunci_jawaban.split(',') : [];

    generateSubNavigations();
    showSection(0);
}

function generateSubNavigations() {
    const leftNav = document.getElementById('left-sub-nav');
    const rightNav = document.getElementById('right-sub-nav');
    leftNav.innerHTML = ''; rightNav.innerHTML = '';

    let label = modulAktif === "Listening" || modulAktif === "Speaking" ? "Part" : "Passage / Task";

    rawKontenArray.forEach((_, index) => {
        leftNav.innerHTML += `<button onclick="showSection(${index})" id="btn-l-sec-${index}" class="px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-100 transition">${label} ${index + 1}</button>`;
    });

    if (modulAktif === "Reading" || modulAktif === "Listening") {
        rawPertanyaanArray.forEach((_, index) => {
            rightNav.innerHTML += `<button onclick="showQuestions(${index})" id="btn-r-sec-${index}" class="px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-100 transition">Q-Set ${index + 1}</button>`;
        });
    }
}

function showSection(index) {
    rawKontenArray.forEach((_, i) => {
        const btn = document.getElementById(`btn-l-sec-${i}`);
        if(btn) btn.className = i === index ? "px-2.5 py-1 text-[10px] font-bold border rounded bg-slate-800 text-white shadow-sm" : "px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-100";
    });

    const contentArea = document.getElementById('passage-content');
    let textHTML = rawKontenArray[index].split('\n\n').map(p => `<p class="mb-4 text-justify leading-relaxed">${p}</p>`).join('');

    if (modulAktif === "Listening") {
        contentArea.innerHTML = `
            <div class="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-lg text-center space-y-3 max-w-sm mx-auto my-4">
                <div class="text-[10px] font-bold uppercase tracking-wider text-blue-400">Audio Stream: Part ${index + 1}</div>
                <div class="text-3xl">🎧</div>
                <div class="pt-1 flex justify-center gap-2">
                    <button onclick="kontrolAudio('play', \`${rawKontenArray[index].replace(/"/g, '\\"')}\`)" id="btn-play" class="bg-blue-600 hover:bg-blue-500 font-bold px-4 py-2 rounded text-xs transition">▶ Play Part ${index + 1}</button>
                    <button onclick="kontrolAudio('stop')" class="bg-slate-800 hover:bg-slate-700 font-bold px-4 py-2 rounded text-xs transition text-slate-400">Stop</button>
                </div>
                <div id="audio-status" class="text-[9px] text-slate-500">Audio only plays once.</div>
            </div>`;
    } else {
        contentArea.innerHTML = textHTML;
    }

    if (modulAktif === "Writing" || modulAktif === "Speaking") showInteractiveInput(index);
    else showQuestions(index);
}

function showQuestions(index) {
    if (!rawPertanyaanArray[index]) return;
    rawPertanyaanArray.forEach((_, i) => {
        const btn = document.getElementById(`btn-r-sec-${i}`);
        if(btn) btn.className = i === index ? "px-2.5 py-1 text-[10px] font-bold border rounded bg-slate-800 text-white shadow-sm" : "px-2.5 py-1 text-[10px] font-bold border rounded bg-white text-slate-700 hover:bg-slate-100";
    });

    const container = document.getElementById('quiz-container');
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
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'TRUE', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-100 transition ${activeAns === 'TRUE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">TRUE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'FALSE', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-100 transition ${activeAns === 'FALSE' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">FALSE</button>
                    <button onclick="simpanObjekAnswer('${globalIdx}', 'NOT GIVEN', this)" class="py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-100 transition ${activeAns === 'NOT GIVEN' ? 'border-2 border-blue-500 bg-blue-50 text-blue-600' : ''}">N.G</button>
                </div>
            </div>`;
        }
    });
    container.innerHTML = htmlHTML;
}

function showInteractiveInput(index) {
    const container = document.getElementById('quiz-container');
    
    if (modulAktif === "Writing") {
        let currentText = jawabanUserMap[`writing_${index}`] || "";
        let wCount = currentText === "" ? 0 : currentText.trim().split(/\s+/).length;
        container.innerHTML = `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Answer Sheet: Task ${index + 1}</span>
                    <span id="word-counter" class="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">${wCount} words</span>
                </div>
                <textarea oninput="hitungKataEssay(this, ${index})" placeholder="Write your IELTS essay answer here..." class="w-full h-80 p-4 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none resize-none leading-relaxed">${currentText}</textarea>
            </div>`;
    } else if (modulAktif === "Speaking") {
        container.innerHTML = `
            <div class="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-center space-y-4 text-white max-w-sm mx-auto">
                <div class="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Speaking Recorder: Part ${index + 1}</div>
                <div id="mic-icon" class="text-3xl py-1">🎙️</div>
                <button onclick="toggleMicSpeaking(${index})" id="btn-record" class="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-xl text-xs transition">🔴 Start Recording Part ${index + 1}</button>
                <div id="audio-preview-container" class="pt-2 ${recordedBlobs[index] ? '' : 'hidden'}">
                    <audio id="audio-playback" controls src="${recordedBlobs[index] || ''}" class="w-full bg-slate-800 rounded-lg"></audio>
                </div>
            </div>`;
    }
}

function kontrolAudio(aksi, teks) {
    const statusText = document.getElementById('audio-status');
    const btnPlay = document.getElementById('btn-play');
    if (aksi === 'play') {
        if (synthSuara.paused && sedangDiputar) { synthSuara.resume(); return; }
        synthSuara.cancel();
        utteranceSuara = new SpeechSynthesisUtterance(teks.replace(/###/g, ''));
        utteranceSuara.lang = 'en-US'; utteranceSuara.rate = 0.95;
        utteranceSuara.onstart = () => { sedangDiputar = true; btnPlay.innerText = "⏸ Pause"; };
        utteranceSuara.onend = () => { sedangDiputar = false; btnPlay.innerText = "Locked"; btnPlay.disabled = true; btnPlay.className = "bg-slate-800 text-slate-600 px-4 py-2 rounded text-xs cursor-not-allowed"; };
        synthSuara.speak(utteranceSuara);
    } else if (aksi === 'stop') { synthSuara.cancel(); sedangDiputar = false; if(btnPlay) btnPlay.innerText = "▶ Play"; }
}

function simpanObjekAnswer(id, val, btn) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.className = "py-2 text-[10px] border rounded-lg font-bold bg-white hover:bg-slate-100 transition");
    btn.className = "py-2 text-[10px] border-2 border-blue-500 bg-blue-50 text-blue-600 rounded-lg font-bold shadow-sm";
    jawabanUserMap[id] = val;
}

function hitungKataEssay(textarea, index) {
    let txt = textarea.value;
    jawabanUserMap[`writing_${index}`] = txt;
    let wCount = txt.trim() === "" ? 0 : txt.trim().split(/\s+/).length;
    document.getElementById('word-counter').innerText = `${wCount} words`;
}

function toggleMicSpeaking(index) {
    const btn = document.getElementById('btn-record');
    const mic = document.getElementById('mic-icon');
    if (!sedangMerekam) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                recordedBlobs[index] = URL.createObjectURL(blob);
                document.getElementById('audio-playback').src = recordedBlobs[index];
                document.getElementById('audio-preview-container').classList.remove('hidden');
            };
            mediaRecorder.start(); sedangMerekam = true;
            mic.className = "text-3xl py-1 animate-bounce text-rose-500";
            btn.innerText = "⏹ Stop & Save Part " + (index + 1);
            btn.className = "w-full bg-rose-600 font-bold py-3 rounded-xl text-xs text-white";
        });
    } else {
        if (mediaRecorder) mediaRecorder.stop(); sedangMerekam = false;
        mic.className = "text-3xl py-1 text-white"; btn.innerText = "🔴 Record Again";
        btn.className = "w-full bg-blue-600 font-bold py-3 rounded-xl text-xs text-white";
    }
}

function submitUserAnswers() {
    if (synthSuara) synthSuara.cancel(); if (intervalTimer) clearInterval(intervalTimer);
    
    let bandScore = "6.5";
    let detail = "Completed";

    if (modulAktif === "Reading" || modulAktif === "Listening") {
        let benar = 0;
        kunciJawabanSistem.forEach((kunci, i) => {
            let userAns = "";
            for (let key in jawabanUserMap) {
                if (key.startsWith(`${i}_`) || key === `0_${i}` || key === `1_${i}` || key === `2_${i}` || key === `3_${i}`) {
                    userAns = jawabanUserMap[key];
                }
            }
            if (userAns && userAns.trim().toUpperCase() === kunci.trim().toUpperCase()) benar++;
        });
        bandScore = benar === kunciJawabanSistem.length ? "9.0" : benar > 0 ? "6.5" : "4.0";
        detail = `Benar ${benar} dari ${kunciJawabanSistem.length} Soal`;
    } else if (modulAktif === "Writing") {
        bandScore = "Review"; detail = "Essay Saved Successfully";
    } else {
        bandScore = "Saved"; detail = "Voice Recordings Saved";
    }

    document.getElementById('band-score').innerText = bandScore;
    document.getElementById('correct-fraction').innerText = detail;
    const modal = document.getElementById('result-modal');
    modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 50);
}

function renderEmptyState() {
    document.getElementById('passage-title').innerText = `Belum Ada Soal ${modulAktif}`;
    document.getElementById('passage-content').innerHTML = `<div class="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs border border-amber-200">Materi ${modulAktif} belum siap. Sila generate di Admin panel!</div>`;
}
