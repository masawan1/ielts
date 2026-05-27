// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT KAMU SETELAH DEPLOY
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzhVw7vpyIK_KvZ37n0HfM1jeF-VO6HLNGZGKU6ZXzXjoGTF1dF9ByjrS46cZg0wWsG/exec";

function generateMateriOtomatis() {
    const btn = document.getElementById('btn-generate-ai');
    const pilarValue = document.getElementById('pilar').value;
    
    btn.innerText = 'AI sedang mengarang artikel & kuis standar Cambridge... 🤖';
    btn.disabled = true;

    const payload = {
        action: 'generateAI',
        pilar: pilarValue
    };

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(response => {
        if(response.status === "success") {
            alert('Sukses! AI telah berhasil memproduksi soal IELTS baru ke Spreadsheet.');
            tambahKeLogTabel(pilarValue, response.data.judul);
        } else {
            alert('Gagal membuat soal otomatis.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Terjadi error/kendala koneksi API.');
    })
    .finally(() => {
        btn.innerText = '✨ Generate Soal Baru Lewat AI';
        btn.disabled = false;
    });
}

function tambahKeLogTabel(pilar, judul) {
    const tbody = document.getElementById('log-output');
    const row = `<tr>
        <td><strong>${pilar}</strong></td>
        <td>${judul}</td>
        <td><span style="color: green; font-weight: bold;">✓ Live di Web User</span></td>
    </tr>`;
    tbody.innerHTML = row + tbody.innerHTML;
}