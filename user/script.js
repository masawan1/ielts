// =========================================================================
// PENTING: SESUAIKAN SCRIPT_URL DENGAN LINK WEB APP APPS SCRIPT ANDA
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbysfhxwG6PTzWOCa8pKg8b8E8EgB933YUQU6UWqvPQcGQGXQd7wlvlch3j5NsY3gbgq/exec";

// Ringkasan panduan komponen IELTS sesuai permintaan
const PILAR_GUIDES = {
    Listening: {
        tag: "Listening Section Component",
        judul: "1. Listening (Mendengarkan)",
        konten: "<strong>Durasi:</strong> Sekitar 30–40 menit.<br><br><strong>Format:</strong> Kamu akan mendengarkan 4 rekaman audio (monolog dan percakapan) dari penutur asli (native speaker) dengan berbagai aksen (Inggris, Australia, Amerika).<br><br><strong>Soal:</strong> Ada 40 pertanyaan yang harus dijawab sambil mendengarkan audio. Audio hanya diputar satu kali.",
        info: "4 Rekaman / 40 Soal",
        quizInfo: "Audio Fill-in / MCQ"
    },
    Reading: {
        tag: "Academic Reading Passage",
        judul: "2. Reading (Membaca)",
        konten: "<strong>Durasi:</strong> 60 menit.<br><br><strong>Format:</strong> Kamu harus membaca 3 teks panjang yang diambil dari buku, jurnal, majalah, atau koran.<br><br><strong>Soal:</strong> Ada 40 pertanyaan yang menguji kemampuan kamu dalam mencari informasi spesifik, memahami ide pokok, serta menyimpulkan argumen.",
        info: "3 Teks / 40 Soal",
        quizInfo: "True / False / NG"
    },
    Writing: {
        tag: "Writing Section Component",
        judul: "3. Writing (Menulis)",
        konten: "<strong>Durasi:</strong> 60 menit.<br><br><strong>Format:</strong> Kamu wajib menyelesaikan 2 tugas menulis (Task 1 dan Task 2).<br><br><strong>Tugas:</strong><br>• <strong>Task 1:</strong> Menjelaskan data visual (grafik, diagram, atau peta untuk tipe Academic) atau menulis surat formal/informal (untuk tipe General Training). Minimal 150 kata.<br>• <strong>Task 2:</strong> Menulis esai argumen atau opini merespons sebuah isu atau topik tertentu. Minimal 250 kata.",
        info: "2 Tugas / Task 1 & 2",
        quizInfo: "Essay Response"
    },
    Speaking: {
        tag: "Speaking Interview Component",
        judul: "4. Speaking (Berbicara)",
        konten: "<strong>Durasi:</strong> 11–14 menit.<br><br><strong>Format:</strong> Uji wicara tatap muka langsung (one-on-one) dengan seorang penguji penutur asli atau melalui panggilan video (jika memilih tes berbasis komputer).<br><br><strong>Tahapan:</strong> Terdiri dari 3 bagian, mulai dari wawancara santai seputar kehidupan sehari-hari, presentasi singkat mengenai topik acak selama 2 menit, hingga diskusi dua arah yang lebih mendalam dengan penguji.",
        info: "3 Bagian / Tatap Muka",
        quizInfo: "Oral Interview"
    }
};

const FALLBACK_DATA = {
    pilar: "Reading",
    judul: "The Quantum Frontier: Reimagining Space Propulsion",
    konten: "Conventional chemical propulsion, while foundational to contemporary space exploration, faces prohibitive limitations when considering interstellar journeys. The logistical quagmire of carrying vast quantities of propellant and the inherent constraints of relativistic velocities render ventures beyond our solar system a distant, almost insurmountable, challenge.\n\nPhysicists and engineers are increasingly turning their gaze towards theoretical constructs that transcend Newton's laws, exploring the manipulation of spacetime itself rather than merely expelling mass. This burgeoning field, often termed 'field propulsion,' seeks to exploit quantum-gravitational phenomena or hypothetical hyperspace metrics, demanding a radical paradigm shift in our understanding of locomotion across astronomical scales.",
    pertanyaan: "1. The theoretical exploration into 'field propulsion' is primarily driven by traditional rocket limitations.\n2. Empirical evidence currently exists to support macroscopic exotic matter.",
    kunci_jawaban: "TRUE,FALSE"
};

let modulAktif = "Reading"; 
let kunciJawabanSistem = [];
let sisaWaktu = 3600; 
let intervalTimer = null;
let dataLoaded = false;

window.addEventListener('DOMContentLoaded', () => {
    pindahModul('Reading', 3600); 
});

function pindahModul(namaModul, durasiDetik) {
    modulAktif = namaModul;
    sisaWaktu = durasiDetik;
    dataLoaded = false;
    
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

    if (namaModul === "Reading") {
        document.getElementById('passage-title').innerText = "Memuat teks ujian terbaru...";
        document.getElementById('passage-content').innerHTML = '<p class="text-slate-400 italic text-center py-12">Menghubungkan ke database Google Sheets Anda...</p>';
        document.getElementById('quiz-container').innerHTML = '';
        ambilMateriUjian();
    } else {
        document.getElementById('passage-title').innerText = PILAR_GUIDES[namaModul].judul;
        document.getElementById('passage-content').innerHTML = `
            <div class="bg-blue-50/60 p-6 rounded-2xl border border-blue-100 text-slate-700 leading-relaxed space-y-2">
                ${PILAR_GUIDES[namaModul].konten}
            </div>`;
        document.getElementById('quiz-container').innerHTML = `
            <div class="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                Modul interaktif & pengisian jawaban untuk komponen <strong>${namaModul}</strong> sedang dalam tahap integrasi sistem.
            </div>`;
    }
}

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
            if (modulAktif === "Reading") submitUserAnswers(true);
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

function ambilMateriUjian() {
    const timeoutFetch = setTimeout(() => {
        if (!dataLoaded && modulAktif === "Reading") {
            console.warn("Jaringan lambat, memuat materi cadangan.");
            muatMateriKeUI(FALLBACK_DATA); 
        }
    }, 4000);

    const cb = 'jsonp_kuis_' + Math.round(Math.random() * 100000);
    window[cb] = (data) => {
        if (modulAktif !== "Reading") return;
        dataLoaded = true;
        clearTimeout(timeoutFetch);
        if (data && data.length > 0) {
            muatMateriKeUI(data[data.length - 1]);
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

function muatMateriKeUI(materi) {
    if (!materi.judul) return;
    document.getElementById('passage-title').innerText = materi.judul;
    const paragraphs = materi.konten.split('\n\n');
    document.getElementById('passage-content').innerHTML = paragraphs.map(p => `<p class="mb-4 text-justify leading-relaxed">${p}</p>`).join('');
    if (materi.pertanyaan) renderQuiz(materi.pertanyaan, materi.kunci_jawaban);
}

function renderQuiz(soalStr, kunciStr) {
    const container = document.getElementById('quiz-container');
    kunciJawabanSistem = kunciStr.split(',');
    const listPertanyaan = soalStr.split('\n');
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
                        <span>TRUE</span>
                    </label>
                    <label class="flex items-center space-x-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 transition">
                        <input type="radio" name="q${nomorSoal}" value="FALSE" onchange="simpanJawaban(${nomorSoal}, 'FALSE')" class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                        <span>FALSE</span>
                    </label>
                    <label class="flex items-center space-x-3 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600 transition">
                        <input type="radio" name="q${nomorSoal}" value="NOT GIVEN" onchange="simpanJawaban(${nomorSoal}, 'NOT GIVEN')" class="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                        <span>NOT GIVEN</span>
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

function submitUserAnswers(dipaksaWaktuHabis = false) {
    if (modulAktif !== "Reading") {
        alert("Fitur submit jawaban saat ini dikhususkan untuk latihan pilar Reading.");
        return;
    }
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
