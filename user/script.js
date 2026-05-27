// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT KAMU SETELAH DEPLOY
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBkAqX50tA0epVeCdsZZvx_WhnGM2cL-tkl5tPDRH-St0sJfqQ4ULgP12dfcIlzKha/exec";
let kunciJawabanSistem = [];

window.addEventListener('DOMContentLoaded', () => {
    fetch(`${SCRIPT_URL}?action=getQuestions`)
    .then(res => res.json())
    .then(data => {
        if(data && data.length > 0) {
            // Ambil materi paling terakhir dimasukkan oleh AI
            const materiTerbaru = data[data.length - 1];
            
            document.getElementById('pilar-badge').innerText = `IELTS ${materiTerbaru.pilar}`;
            document.getElementById('passage-title').innerText = materiTerbaru.judul;
            document.getElementById('passage-content').innerHTML = `<p>${materiTerbaru.konten.replace(/\n/g, '</p><p>')}</p>`;
            
            // Render Kuis Terbuka Secara Dinamis
            renderQuiz(materiTerbaru.pertanyaan, materiTerbaru.kunci_jawaban);
        }
    })
    .catch(err => {
        document.getElementById('passage-title').innerText = "Gagal Memuat Materi";
        console.error(err);
    });
});

function renderQuiz(pertanyaanStr, kunciStr) {
    const container = document.getElementById('quiz-container');
    
    // Parsing data teks terstruktur dari AI
    const listPertanyaan = pertanyaanStr.split('\n');
    kunciJawabanSistem = kunciStr.split(','); // Misal format: TRUE,FALSE

    let htmlKuis = '';
    listPertanyaan.forEach((item, index) => {
        if(item.trim() !== "") {
            htmlKuis += `
            <div class="question-block">
                <p class="question-text">${item}</p>
                <div class="options">
                    <label><input type="radio" name="q${index}" value="TRUE"> TRUE</label>
                    <label><input type="radio" name="q${index}" value="FALSE"> FALSE</label>
                    <label><input type="radio" name="q${index}" value="NOT GIVEN"> NOT GIVEN</label>
                </div>
            </div>`;
        }
    });
    container.innerHTML = htmlKuis;
}

function submitUserAnswers() {
    let benar = 0;
    let totalSoal = kunciJawabanSistem.length;

    kunciJawabanSistem.forEach((kunci, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        if (selected && selected.value.trim().toUpperCase() === kunci.trim().toUpperCase()) {
            benar++;
        }
    });

    alert(`Ujian Selesai!\nJawaban Benar: ${benar} dari ${totalSoal} Soal.\nEstimasi Band Score: ${benar === totalSoal ? '9.0' : benar > 0 ? '6.5' : '4.0'}`);
}
