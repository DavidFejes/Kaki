// ==========================================================
// ||    A KAKI NAPLÓ v2.0 - VÉGLEGES, FELHŐALAPÚ SCRIPT     ||
// ==========================================================

// --- 1. LÉPÉS: FIREBASE SZOLGÁLTATÁSOK IMPORTÁLÁSA ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- 2. LÉPÉS: A TE FIREBASE PROJEKTED KONFIGURÁCIÓJA ---
const firebaseConfig = {
  apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI",
  authDomain: "kaki-b14a4.firebaseapp.com",
  projectId: "kaki-b14a4",
  storageBucket: "kaki-b14a4.firebasestorage.app",
  messagingSenderId: "123120220357",
  appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac"
};


// --- 3. LÉPÉS: FIREBASE INICIALIZÁLÁSA ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
let currentUser = null;
let logs = [];

// === HTML ELEMEK ===
const authBtn = document.getElementById('auth-btn');
const userDisplay = document.getElementById('user-display');
const mainContainer = document.querySelector('.container');
const logBtn = document.getElementById('log-btn');
const todayCountEl = document.getElementById('today-count');
const weeklyTotalEl = document.getElementById('weekly-total');
const dailyAvgEl = document.getElementById('daily-avg');
const allTimeTotalEl = document.getElementById('all-time-total');
const logListEl = document.getElementById('log-list');
const chartCanvas = document.getElementById('log-chart').getContext('2d');
let poopChart;

// === FŐ LOGIKA ===
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        mainContainer.style.display = 'block';
        authBtn.textContent = 'Kijelentkezés';
        userDisplay.textContent = `Üdv, ${user.displayName.split(' ')[0]}!`;
        loadLogs();
    } else {
        currentUser = null;
        mainContainer.style.display = 'none';
        authBtn.textContent = 'Bejelentkezés Google-lel';
        userDisplay.textContent = '';
        logs = [];
        render(); // Rendereljük az üres állapotot is
    }
});


authBtn.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth);
    } else {
        signInWithPopup(auth, provider).catch(error => {
            console.error("Google bejelentkezési hiba:", error);
            alert("A bejelentkezés nem sikerült. Kérlek, nézd meg a konzolt (F12).");
        });
    }
});

async function loadLogs() {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    try {
        const docSnap = await getDoc(docRef);
        logs = (docSnap.exists() && docSnap.data().poopLogs) ? docSnap.data().poopLogs : [];
        render();
    } catch (error) {
        console.error("Hiba az adatok betöltésekor: ", error);
        alert("Nem sikerült betölteni az adatokat. Lehet, hogy a Firestore biztonsági szabályok nincsenek beállítva?");
    }
}

async function saveLogs() {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    try {
        await setDoc(docRef, { poopLogs: logs });
    } catch (error) {
        console.error("Hiba az adatok mentésekor: ", error);
        alert("Nem sikerült menteni az adatokat. Lehet, hogy a Firestore biztonsági szabályok nincsenek beállítva?");
    }
}

logBtn.addEventListener('click', async () => {
    logs.push(Date.now());
    await saveLogs();
    render();
});

logListEl.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    const timestampToDelete = Number(deleteBtn.dataset.timestamp);
    logs = logs.filter(log => log !== timestampToDelete);
    await saveLogs();
    render();
});

// === MEGJELENÍTÉS ÉS SZÁMÍTÁSOK ===
function render() {
    if (!mainContainer.style.display || mainContainer.style.display === 'none') {
        if(poopChart) poopChart.destroy(); // Ha a konténer rejtve van, a grafikont is töröljük
        return;
    }
    
    const stats = calculateStats();
    
    todayCountEl.textContent = stats.todayCount;
    weeklyTotalEl.textContent = stats.thisWeekCount;
    dailyAvgEl.textContent = stats.dailyAverage.toFixed(1);
    allTimeTotalEl.textContent = logs.length;
    
    logListEl.innerHTML = logs.sort((a, b) => b - a).slice(0, 10)
        .map(log => {
            const date = new Date(log);
            const formattedDate = date.toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `<li class="log-item"><span>${formattedDate}</span><button class="delete-btn" data-timestamp="${log}"><i class="fas fa-trash"></i></button></li>`;
        }).join('');
    
    renderChart(stats.weeklyChartData);
}

function calculateStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const dayOfWeek = now.getDay(); // Vasárnap = 0, Hétfő = 1, ...
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Hétfő a hét első napja
    const startOfWeek = new Date(new Date(now).setDate(diff)).setHours(0, 0, 0, 0);

    const todayCount = logs.filter(log => log >= startOfToday).length;
    const thisWeekCount = logs.filter(log => log >= startOfWeek).length;
    
    let dailyAverage = 0;
    if (logs.length > 0) {
        const firstLog = logs.sort((a,b) => a-b)[0];
        let daysSinceFirstLog = Math.ceil((Date.now() - firstLog) / (1000 * 60 * 60 * 24));
        if (daysSinceFirstLog === 0) daysSinceFirstLog = 1;
        dailyAverage = logs.length / daysSinceFirstLog;
    }
    
    const weeklyChartData = Array(7).fill(0);
    logs.forEach(log => {
        const logDate = new Date(log);
        if (logDate.getTime() >= startOfWeek) {
            let dayIndex = logDate.getDay(); // V=0, H=1, K=2, ... Szo=6
            dayIndex = (dayIndex === 0) ? 6 : dayIndex - 1; // H=0, K=1, ... V=6
            weeklyChartData[dayIndex]++;
        }
    });
    return { todayCount, thisWeekCount, dailyAverage, weeklyChartData };
}

function renderChart(data) {
    const labels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
    if (poopChart) {
        poopChart.destroy();
    }
    poopChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: 'rgba(212, 172, 110, 0.5)',
                borderColor: 'rgba(212, 172, 110, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#b0a299' } }, x: { ticks: { color: '#b0a299'} } },
            plugins: { legend: { display: false } }
        }
    });
}
