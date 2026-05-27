// =========================================================================
// PENTING: SESUAIKAN SCRIPT_URL DENGAN LINK WEB APP APPS SCRIPT ANDA
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz3hyj-S5EfOyEgt9ElpoB5hBgLWX41Ct93xiCfEfN1EWl87JPAVCP8B_KHXfIeXK2T/exec";

// Ringkasan konfigurasi pilar jika data dari database gagal dimuat (Fallback)
const PILAR_GUIDES = {
    Listening: { tag: "Listening Section Component", info: "4 Rekaman / 40 Soal", quizInfo: "Audio Fill-in / MCQ" },
    Reading: { tag: "Academic Reading Passage", info: "3 Teks / 40 Soal", quizInfo: "True / False / NG" },
    Writing: { tag: "Writing Section Component", info: "2 Tugas / Task 1 & 2", quizInfo: "Essay Response" },
    Speaking: { tag: "Speaking Interview Component", info: "3 Bagian / Tatap Muka", quizInfo: "Oral Interview" }
};

const FALLBACK_DATA = {
    pilar: "Reading",
    judul: "The Quantum Frontier: Reimagining Space Propulsion",
    konten: "Conventional chemical propulsion, while foundational to contemporary space exploration, faces prohibitive limitations when considering interstellar journeys. The logistical quagmire of carrying vast quantities of propellant and the inherent constraints of relativistic velocities render ventures beyond our solar system a distant, almost insurmountable, challenge.",
    pertanyaan: "1. The theoretical exploration into 'field propulsion' is primarily driven by traditional rocket limitations.\n2. Empirical evidence currently exists to support macroscopic exotic matter.",
    kunci_jawaban: "TRUE,FALSE"
};

let modulAktif = "Reading"; 
let kunciJawabanSistem = [];
let sisaWaktu = 3600; 
let intervalTimer = null;
let dataLoaded = false;

// Variabel Pengendali Fitur Suara (Text-to-Speech) untuk Listening
let synthSuara = window.speechSynthesis;
let utteranceSuara = null;
let sedangDiputar = false;

window.addEventListener('DOMContentLoaded', () => {
    pindahModul('Reading', 3600); 
});

// FUNGSI BERPINDAH MENU MODUL
function pindahModul(namaModul, durasiDetik) {
    modulAktif = namaModul;
    sisaWaktu = durasiDetik;
    dataLoaded = false;
    
    // Hentikan suara secara paksa jika siswa pindah pilar saat audio masih menyala
    if (synthSuara) synthSuara.cancel();
    sedangDiputar = false;

    // Perbarui visual CSS tombol tab navigasi pilar yang aktif
    ['Listening', 'Reading', 'Writing', 'Speaking'].forEach(m => {
        const btn = document.getElementById(`nav-${m}`);
        if (btn) {
            if (m === namaModul) {
                btn.className = "px-3 py-1.5 rounded-lg bg-white text-blue-600 shadow-sm transition";
            } else {
                btn.className = "px-3 py-1.5 rounded-lg hover:text-slate-800 transition";
            }
        }
    });

    document.getElementById('pilar-badge').innerText = `IELTS ${namaModul}`;
    document.getElementById('panel-tag').innerText = PILAR_GUIDES[namaModul].tag;
    document.getElementById('format-info-badge').innerText = PILAR_GUIDES[namaModul].info;
    document.getElementById('total-questions-badge').innerText = PILAR_GUIDES[namaModul].quizInfo;
    
    startTimer();

    document.getElementById('passage-title').innerText = "Memuat materi...";
    document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Menghubungkan ke database Google Sheets Anda...</p>';
    document.getElementById('quiz-container').innerHTML = '';

    ambilMateriUjian();
}

// LOGIKA COUNTDOWN TIMER
function startTimer() {
    const display = document.getElementById('timer');
    if (intervalTimer) clearInterval(intervalTimer);

    intervalTimer = setInterval(() => {
        let m = Math.floor(sisaWaktu / 60);
        let s = sisaWaktu % 60;
        display.innerText = `Time Limit: ${(m < 10 ? '0'+m : m)}:${(s < 10 ? '0'+s : s)}`;
        
        if (sisaWaktu <= 0) {
            clearInterval(intervalTimer);
            display.innerText = "Time Up!";
            submitUserAnswers(true); 
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

// AMBIL DATA DARI SPREADSHEET
function ambilMateriUjian() {
    const timeoutFetch = setTimeout(() => {
        if (!dataLoaded) {
            console.warn("Jaringan lambat, memuat materi cadangan.");
            muatMateriKeUI(FALLBACK_DATA); 
        }
    }, 4000);

    const cb = 'jsonp_kuis_' + Math.round(Math.random() * 100000);
    window[cb] = (data) => {
        dataLoaded = true;
        clearTimeout(timeoutFetch);
        
        if (data && data.length > 0) {
            let materiCocok = null;
            for (let i = data.length - 1; i >= 0; i--) {
                if (data[i].pilar && data[i].pilar.toUpperCase() === modulAktif.toUpperCase()) {
                    materiCocok = data[i];
                    break;
                }
            }

            if (materiCocok) {
                muatMateriKeUI(materiCocok);
            } else {
                document.getElementById('passage-title').innerText = `Belum Ada Soal ${modulAktif}`;
                document.getElementById('passage-content').innerHTML = `
                    <div class="p-5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs leading-relaxed">
                        Materi kuis untuk komponen <strong>${modulAktif}</strong> belum di-generate oleh Admin. 
                        Silakan buat soal pilar ini terlebih dahulu melalui Admin Panel agar muncul di halaman siswa!
                    </div>`;
                document.getElementById('quiz-container').innerHTML = `
                    <div class="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        Menunggu database...
                    </div>`;
            }
        } else {
            muatMateriKeUI(FALLBACK_DATA);
        }
        delete window[cb];
        if (document.getElementById(cb)) document.getElementById(cb).remove();
    };

    const timestamp = new Date().getTime();
    const script = document.createElement('script');
    script.src = `${SCRIPT_URL}?action=getQuestions&callback=${cb}&_=${timestamp}`;
    script.id = cb;
    
    script.onerror = () => {
        dataLoaded = true;
        clearTimeout(timeoutFetch);
        muatMateriKeUI(FALLBACK_DATA);
    };
    document.body.appendChild(script);
}

// RENDER DATA TEXT KE UI (DIUBAH MENJADI AUDIO PLAYER JIKA MODUL LISTENING)
function muatMateriKeUI(materi) {
    if (!materi.judul) return;
    document.getElementById('passage-title').innerText = materi.judul;
    
    if (modulAktif === "Listening") {
        // TAMPILKAN AUDIO PLAYER BOX (MENYEMBUNYIKAN TRANSSKRIP ASLI AGAR SISWA FOKUS MENDENGAR)
        document.getElementById('passage-content').innerHTML = `
            <div class="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl max-w-md mx-auto my-6 text-center space-y-4">
                <div class="text-xs font-bold uppercase tracking-widest text-blue-400">IELTS Audio Player Engine</div>
                <div class="text-3xl py-2">🎧</div>
                <div class="text-xs text-slate-400 px-4">Tekan tombol play di bawah untuk mendengarkan rekaman audio ujian. Audio hanya dapat diputar sekali.</div>
                
                <div class="pt-2 flex justify-center gap-3">
                    <button onclick="kontrolAudio('play', \`${materi.konten.replace(/`/g, '\\`').replace(/"/g, '\\"')}\`)" id="btn-play" class="bg-blue-600 hover:bg-blue-500 font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2">
                        ▶ Play Audio
                    </button>
                    <button onclick="kontrolAudio('stop')" id="btn-stop" class="bg-slate-800 hover:bg-slate-700 font-bold px-6 py-2.5 rounded-xl text-xs transition flex items-center gap-2 text-slate-400">
                        ⏹ Stop
                    </button>
                </div>
                
                <div id="audio-status" class="text-[10px] text-slate-500 italic">Status: Ready to stream</div>
            </div>`;
    } else {
        // Pilar biasa (Reading/Writing/Speaking) tetap memunculkan paragraf teks bacaan utuh
        const paragraphs = materi.konten.split('\n\n');
        document.getElementById('passage-content').innerHTML = paragraphs.map(p => `<p class="mb-4 text-justify leading-relaxed">${p}</p>`).join('');
    }

    if (materi.pertanyaan) renderQuiz(materi.pertanyaan, materi.kunci_jawaban);
}

// MANAGEMENT ENGINE SUARA TEXT TO SPEECH (MIMIC AUDIO STREAM)
function kontrolAudio(aksi, teksTranskrip = "") {
    const statusText = document.getElementById('audio-status');
    const btnPlay = document.getElementById('btn-play');

    if (aksi === 'play') {
        if (!synthSuara) {
            alert("Browser Anda tidak mendukung simulasi audio player ini.");
            return;
        }

        if (synthSuara.paused && sedangDiputar) {
            // Lanjutkan jika sedang di-pause
            synthSuara.resume();
            statusText.innerText = "Status: Playing audio stream...";
            return;
        }

        // Hentikan suara sisa sebelumnya jika ada
        synthSuara.cancel();

        // Bersihkan teks transkrip dari kode-kode HTML agar suara bacanya jernih
        let cleanedText = teksTranskrip.replace(/<[^>]*>/g, '').replace(/Host:/g, 'Host says:').replace(/Dr. Sharma:/g, 'Doctor Sharma says:');
        
        utteranceSuara = new SpeechSynthesisUtterance(cleanedText);
        
        // SET AKSEN DEFAULT KE ENGLISH NATIVE SPEAKER (US / UK / AUSTRALIA)
        utteranceSuara.lang = 'en-US'; 
        utteranceSuara.rate = 0.95; // Sedikit diperlambat agar artikulasi IELTS terdengar jelas
        
        utteranceSuara.onstart = () => {
            sedangDiputar = true;
            statusText.innerText = "Status: Playing audio stream...";
            statusText.className = "text-[10px] text-blue-400 font-semibold animate-pulse";
            btnPlay.innerText = "⏸ Pause Audio";
            btnPlay.setAttribute("onclick", "kontrolAudio('pause')");
        };

        utteranceSuara.onend = () => {
            sedangDiputar = false;
            statusText.innerText = "Status: Audio finished.";
            statusText.className = "text-[10px] text-slate-500 italic";
            btnPlay.innerText = "▶ Play Audio";
            btnPlay.setAttribute("onclick", "kontrolAudio('play')");
            btnPlay.className = "bg-slate-800 text-slate-600 font-bold px-6 py-2.5 rounded-xl text-xs cursor-not-allowed";
            btnPlay.disabled = true; // Sesuai aturan IELTS asli: Audio hanya diputar sekali!
        };

        synthSuara.speak(utteranceSuara);

    } else if (aksi === 'pause') {
        if (synthSuara.speaking && !synthSuara.paused) {
            synthSuara.pause();
            statusText.innerText = "Status: Audio paused";
            statusText.className = "text-[10px] text-amber-400 italic";
            btnPlay.innerText = "▶ Resume Audio";
            btnPlay.setAttribute("onclick", "kontrolAudio('play')");
        }
    } else if (aksi === 'stop') {
        synthSuara.cancel();
        sedangDiputar = false;
        statusText.innerText = "Status: Audio streaming stopped.";
        statusText.className = "text-[10px] text-slate-500 italic";
        btnPlay.innerText = "▶ Play Audio";
        btnPlay.setAttribute("onclick", "kontrolAudio('play')");
    }
}

// GENERATE FORM SOAL INTERAKTIF
function renderQuiz(soalStr, kunciStr) {
    const container = document.getElementById('quiz-container');
    kunciJawabanSistem = kunciStr ? kunciStr.split(',') : [];
    const listPertanyaan = soalStr ? soalStr.split('\n') : [];
    let htmlKuis = '';
    let nomorSoal = 0;

    listPertanyaan.forEach((item) => {
        if(item.trim()) {
            htmlKuis += `
            <div class="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-sm" data-index="${nomorSoal}">
                <p class="font-semibold text-xs leading-relaxed text-slate-800">${item}</p>
                <div class="space-y-2 pt-1">
                    <label class="flex items-center space-x-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 transition">
                        <input type="radio" name="q${nomorSoal}" value="TRUE" onchange="simpanJawaban(${nomorSoal}, 'TRUE')" class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                        <span>TRUE / YES / OPTION A</span>
                    </label>
                    <label class="flex items-center space-x-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 transition">
                        <input type="radio" name="q${nomorSoal}" value="FALSE" onchange="simpanJawaban(${nomorSoal}, 'FALSE')" class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                        <span>FALSE / NO / OPTION B</span>
                    </label>
                    <label class="flex items-center space-x-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 transition">
                        <input type="radio" name="q${nomorSoal}" value="NOT GIVEN" onchange="simpanJawaban(${nomorSoal}, 'NOT GIVEN')" class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                        <span>NOT GIVEN / OPTION C</span>
                    </label>
                </div>
            </div>`;
            nomorSoal++;
        }
    });
    container.innerHTML = htmlKuis;
}

const jawabanUserMap = {};
function simpanJawaban(index, nilai) {
    jawabanUserMap[index] = nilai;
}

// EVALUASI JAWABAN
function submitUserAnswers(dipaksaWaktuHabis = false) {
    if (synthSuara) synthSuara.cancel(); // Matikan suara jika tombol submit ditekan
    if (intervalTimer) clearInterval(intervalTimer);
    let skorBenar = 0;
    const totalSoal = kunciJawabanSistem.length;

    for (let i = 0; i < totalSoal; i++) {
        const jawabanUser = jawabanUserMap[i];
        const kunciAsli = kunciJawabanSistem[i] ? kunciJawabanSistem[i].trim().toUpperCase() : "";
        if(jawabanUser && jawabanUser.toUpperCase() === kunciAsli) skorBenar++;
    }

    let bandScore = skorBenar === totalSoal ? 9.0 : skorBenar > 0 ? 6.5 : 4.0;
    document.getElementById('modal-heading').innerText = dipaksaWaktuHabis ? "Waktu Habis!" : "Ujian Selesai!";
    document.getElementById('band-score').innerText = bandScore.toFixed(1);
    document.getElementById('correct-fraction').innerText = `Benar ${skorBenar} dari ${totalSoal} Soal`;

    const modal = document.getElementById('result-modal');
    const box = document.getElementById('result-box');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
    }, 50);
}

function reloadPage() {
    location.reload();
}
