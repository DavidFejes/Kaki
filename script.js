// ==========================================================
// ||     A KAKI NAPLÓ v3.0 - ÜZLETI MÓDDAL BŐVÍTVE      ||
// ==========================================================

// --- 1. LÉPÉS: FIREBASE SZOLGÁLTATÁSOK IMPORTÁLÁSA ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 2. LÉPÉS: A TE FIREBASE PROJEKTED KONFIGURÁCIÓJA ---
const firebaseConfig = {
    apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI",
    authDomain: "kaki-b14a4.firebaseapp.com",
    projectId: "kaki-b14a4",
    storageBucket: "kaki-b14a4.firebasestorage.app",
    messagingSenderId: "123120220357",
    appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac"
};

// --- 3. LÉPÉS: INICIALIZÁLÁS ÉS VÁLTOZÓK ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let logs = []; // Mostantól objektumok listája lesz
let settings = { businessMode: false, hourlySalary: 0 };
let currentLogLocation = null;
let weeklyChartOffset = 0; // Heti eltolás a grafikonhoz
let map;

// --- HTML ELEMEK ---
const authBtn = document.getElementById('auth-btn');
const userDisplay = document.getElementById('user-display');
const mainContainer = document.querySelector('.container');

// Nézetváltók és nézetek
const viewSwitcher = document.querySelector('.view-switcher');
const views = document.querySelectorAll('.view-content');

// Dashboard elemek
const openLogModalBtn = document.getElementById('open-log-modal-btn');
const todayCountEl = document.getElementById('today-count');
const weeklyTotalEl = document.getElementById('weekly-total');
const dailyAvgEl = document.getElementById('daily-avg');
const allTimeTotalEl = document.getElementById('all-time-total');
const earningsCard = document.getElementById('earnings-card');
const workEarningsEl = document.getElementById('work-earnings');
const peakDayEl = document.getElementById('peak-day');
const chartCanvas = document.getElementById('log-chart').getContext('2d');
let poopChart;
const prevWeekBtn = document.getElementById('prev-week-btn');
const nextWeekBtn = document.getElementById('next-week-btn');
const weekDisplay = document.getElementById('week-display');


// Részletes lista
const fullLogListEl = document.getElementById('full-log-list');

// Térkép
const mapContainer = document.getElementById('map-container');

// Modális ablakok
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const logEntryModal = document.getElementById('log-entry-modal');
const closeButtons = document.querySelectorAll('.close-btn');

// Beállítások modal elemek
const businessModeToggle = document.getElementById('business-mode-toggle');
const salaryInputGroup = document.getElementById('salary-input-group');
const hourlySalaryInput = document.getElementById('hourly-salary');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// Adatrögzítő modal elemek
const saveLogBtn = document.getElementById('save-log-btn');
const logDurationInput = document.getElementById('log-duration');
const logDescriptionInput = document.getElementById('log-description');
const logRatingInput = document.getElementById('log-rating');
const workLogGroup = document.getElementById('work-log-group');
const isWorkLogCheckbox = document.getElementById('is-work-log');
const locationStatus = document.getElementById('location-status');


// === 1. FELHASZNÁLÓI HITelesítés és ADATOK BETÖLTÉSE ===

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        mainContainer.style.display = 'block';
        authBtn.textContent = 'Kijelentkezés';
        userDisplay.textContent = `Üdv, ${user.displayName.split(' ')[0]}!`;
        loadUserData();
    } else {
        currentUser = null;
        mainContainer.style.display = 'none';
        authBtn.textContent = 'Bejelentkezés Google-lel';
        userDisplay.textContent = '';
        logs = [];
        if (map) { map.remove(); map = null; }
        renderDashboard(); // Rendereljük az üres állapotot is
    }
});

authBtn.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth);
    } else {
        signInWithPopup(auth, provider).catch(error => console.error("Google bejelentkezési hiba:", error));
    }
});

async function loadUserData() {
    if (!currentUser) return;
    
    // 1. lépés: Használd a helyes, 'users' kollekciót!
    const docRef = doc(db, 'users', currentUser.uid); 
    
    try {
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            logs = data.poopLogs || [];
            settings = { ...{ businessMode: false, hourlySalary: 0 }, ...data.settings };
            
            // 2. lépés: Automatikus adatmigráció!
            // Ellenőrizzük, hogy az adatok a régi formátumban vannak-e (számok listája).
            const needsMigration = logs.length > 0 && typeof logs[0] === 'number';

            if (needsMigration) {
                console.log("Régi adat formátum észlelve. Migráció indul...");
                // Átalakítjuk a számok listáját objektumok listájává
                logs = logs.map(timestamp => {
                    return {
                        timestamp: timestamp,
                        duration: 300,       // Alapértelmezett érték: 5 perc
                        rating: 3,           // Alapértelmezett érték
                        description: "Régi adat",
                        isWork: false,
                        location: null
                    };
                });
                // Az átalakított adatokat azonnal vissza is mentjük az adatbázisba.
                // Erre azért van szükség, hogy ez a folyamat csak egyszer fusson le.
                await saveData("MIGRACIO"); 
                console.log("Migráció befejezve és az új adatok elmentve.");
            }
            
        } else {
            // Ha a felhasználónak még nincs semmilyen adata
            logs = [];
            settings = { businessMode: false, hourlySalary: 0 };
        }
        
        weeklyChartOffset = 0;
        renderDashboard();
        renderLogListPage();
        applySettingsToUI();
        initMap(); 
        
    } catch (error) {
        console.error("Hiba az adatok betöltésekor: ", error);
    }
}

async function saveData() {
    if (!currentUser) return;
    const docRef = doc(db, 'users_v2', currentUser.uid);
    try {
        await setDoc(docRef, { poopLogs: logs, settings: settings });
    } catch (error) {
        console.error("Hiba az adatok mentésekor: ", error);
    }
}


// === 2. MODÁLIS ABLAKOK ÉS GOMBOK KEZELÉSE ===

// Beállítások ablak
settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
businessModeToggle.addEventListener('change', () => {
    salaryInputGroup.style.display = businessModeToggle.checked ? 'block' : 'none';
});

saveSettingsBtn.addEventListener('click', async () => {
    settings.businessMode = businessModeToggle.checked;
    settings.hourlySalary = Number(hourlySalaryInput.value) || 0;
    await saveData();
    settingsModal.style.display = 'none';
    applySettingsToUI();
    renderDashboard(); // Re-render stats with new settings
});

// Adatrögzítő ablak
openLogModalBtn.addEventListener('click', () => {
    resetLogForm();
    getCurrentLocation();
    logEntryModal.style.display = 'block';
});

closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        document.getElementById(modalId).style.display = 'none';
    });
});
window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});

function resetLogForm() {
    logDurationInput.value = "5";
    logDescriptionInput.value = "";
    logRatingInput.value = "3";
    isWorkLogCheckbox.checked = false;
    currentLogLocation = null;
    workLogGroup.style.display = settings.businessMode ? 'block' : 'none';
    locationStatus.textContent = 'Helyszín meghatározása...';
    locationStatus.style.color = 'var(--text-secondary)';
}


// === 3. ÚJ ESEMÉNY RÖGZÍTÉSE ÉS HELYSZÍN ===

saveLogBtn.addEventListener('click', async () => {
    const newLog = {
        timestamp: Date.now(),
        duration: (Number(logDurationInput.value) || 5) * 60, // sec
        description: logDescriptionInput.value.trim(),
        rating: Number(logRatingInput.value),
        isWork: settings.businessMode && isWorkLogCheckbox.checked,
        location: currentLogLocation
    };
    logs.push(newLog);
    await saveData();
    
    weeklyChartOffset = 0; // Reset view to current week
    renderDashboard();
    renderLogListPage();
    addMarkerToMap(newLog);
    logEntryModal.style.display = 'none';
});

function getCurrentLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLogLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                locationStatus.textContent = '✅ Helyszín rögzítve!';
                locationStatus.style.color = 'lightgreen';
            },
            () => {
                currentLogLocation = null;
                locationStatus.textContent = '⚠️ Helyszín nem elérhető.';
                locationStatus.style.color = 'orange';
            }
        );
    } else {
        locationStatus.textContent = 'Helymeghatározás nem támogatott.';
        locationStatus.style.color = 'orange';
    }
}


// === 4. NÉZETVÁLTÁS (VIEW SWITCHING) ===

viewSwitcher.addEventListener('click', e => {
    if (e.target.classList.contains('view-btn')) {
        const targetView = e.target.dataset.view;
        
        // Gombok stílusának váltása
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // Nézet váltása
        views.forEach(view => {
            if (view.id === targetView) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Ha a térkép nézet aktív, frissítsük a térképet
        if (targetView === 'map-view') {
           setTimeout(() => map.invalidateSize(), 10);
        }
    }
});


// === 5. RENDERELŐ FUNKCIÓK ===

function renderDashboard() {
    if (!mainContainer.style.display || mainContainer.style.display === 'none') return;
    
    const stats = calculateStats(weeklyChartOffset);
    
    todayCountEl.textContent = stats.todayCount;
    weeklyTotalEl.textContent = stats.thisWeekCount;
    dailyAvgEl.textContent = stats.dailyAverage.toFixed(1);
    allTimeTotalEl.textContent = logs.length;
    workEarningsEl.textContent = `${stats.workEarnings.toFixed(0)} Ft`;
    peakDayEl.textContent = stats.peakDay.date || '-';
    
    renderChart(stats.weeklyChartData);
    
    const startDate = new Date(stats.startOfWeek);
    const endDate = new Date(stats.endOfWeek);
    weekDisplay.textContent = `${startDate.toLocaleDateString('hu-HU', {month:'short', day:'numeric'})} - ${endDate.toLocaleDateString('hu-HU', {month:'short', day:'numeric'})}`;
    nextWeekBtn.disabled = weeklyChartOffset >= 0;
}

function renderLogListPage() {
    fullLogListEl.innerHTML = [...logs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(log => {
            const date = new Date(log.timestamp);
            const formattedDate = date.toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let details = `<span><i class="fas fa-clock"></i> ${(log.duration / 60).toFixed(0)} perc</span> <span><i class="fas fa-star"></i> ${log.rating}</span>`;
            if (log.isWork) {
                details += ` <span><i class="fas fa-briefcase"></i> Munkahelyi</span>`;
            }
            if(log.description) {
                 details += `<br><i>${log.description}</i>`;
            }

            return `
                <li class="log-item" id="log-${log.timestamp}">
                    <div class="log-item-main">${formattedDate}</div>
                    <div class="log-item-details">${details}</div>
                    <button class="delete-btn" data-timestamp="${log.timestamp}"><i class="fas fa-trash"></i></button>
                </li>`;
        }).join('');
}


// === 6. SZÁMÍTÁSOK ===

function calculateStats(weekOffset = 0) {
    const now = new Date();
    // Visszalépés a hetekben
    now.setDate(now.getDate() + (weekOffset * 7));
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const dayOfWeek = now.getDay(); 
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date(now).setDate(diff)).setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek).setDate(new Date(startOfWeek).getDate() + 6);

    const logsThisWeek = logs.filter(log => log.timestamp >= startOfWeek && log.timestamp <= endOfWeek);

    const weeklyChartData = Array(7).fill(0);
    logsThisWeek.forEach(log => {
        let dayIndex = new Date(log.timestamp).getDay();
        dayIndex = (dayIndex === 0) ? 6 : dayIndex - 1; // H=0, V=6
        weeklyChartData[dayIndex]++;
    });

    const workEarnings = logs
        .filter(l => l.isWork && settings.hourlySalary > 0)
        .reduce((sum, l) => sum + (l.duration / 3600) * settings.hourlySalary, 0);

    let peakDay = { date: null, count: 0 };
    if (logs.length > 0) {
        const countsByDay = logs.reduce((acc, log) => {
            const day = new Date(log.timestamp).toLocaleDateString('hu-HU');
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});
        
        for (const date in countsByDay) {
            if (countsByDay[date] > peakDay.count) {
                peakDay = { date: `${date} (${countsByDay[date]}x)`, count: countsByDay[date] };
            }
        }
    }
    
    const todayCount = logs.filter(log => log.timestamp >= new Date().setHours(0,0,0,0)).length;
    
    let dailyAverage = 0;
    if (logs.length > 0) {
        const firstLog = logs.reduce((min, l) => l.timestamp < min ? l.timestamp : min, Date.now());
        let daysSinceFirstLog = Math.ceil((Date.now() - firstLog) / (1000 * 60 * 60 * 24)) || 1;
        dailyAverage = logs.length / daysSinceFirstLog;
    }
    
    return { 
        todayCount, 
        thisWeekCount: logsThisWeek.length, 
        dailyAverage, 
        workEarnings, 
        weeklyChartData, 
        peakDay,
        startOfWeek,
        endOfWeek
    };
}


// === 7. GRAFIKON ÉS TÉRKÉP KEZELÉSE ===

function renderChart(data) {
    const labels = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
    if (poopChart) poopChart.destroy();
    
    poopChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Események',
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

prevWeekBtn.addEventListener('click', () => {
    weeklyChartOffset--;
    renderDashboard();
});

nextWeekBtn.addEventListener('click', () => {
    if (weeklyChartOffset < 0) {
        weeklyChartOffset++;
        renderDashboard();
    }
});

function initMap() {
    if (!map && mapContainer) {
        map = L.map('map-container').setView([47.4979, 19.0402], 7); // Budapest központú nézet
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);
        renderAllMarkers();
    }
}

function renderAllMarkers() {
    logs.forEach(log => addMarkerToMap(log));
}

function addMarkerToMap(log) {
    if (map && log.location) {
        const date = new Date(log.timestamp);
        const popupContent = `<b>${date.toLocaleString('hu-HU')}</b><br>${log.description || 'Nincs leírás.'}`;
        L.marker([log.location.lat, log.location.lng]).addTo(map).bindPopup(popupContent);
    }
}


// === 8. SEGÉDFÜGGVÉNYEK ÉS EGYÉB EVENTEK ===

function applySettingsToUI() {
    businessModeToggle.checked = settings.businessMode;
    hourlySalaryInput.value = settings.hourlySalary;
    salaryInputGroup.style.display = settings.businessMode ? 'block' : 'none';
    earningsCard.style.display = settings.businessMode ? 'grid' : 'none';
}

// Törlés gomb event listener
fullLogListEl.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;
    const timestampToDelete = Number(deleteBtn.dataset.timestamp);
    
    // Vizuális törlés azonnal
    const itemToRemove = document.getElementById(`log-${timestampToDelete}`);
    if(itemToRemove) itemToRemove.remove();

    // Adatbázis frissítése a háttérben
    logs = logs.filter(log => log.timestamp !== timestampToDelete);
    await saveData();
    
    // Frissítés
    renderDashboard();
    initMap(); // Újrarajzolja a térképet markerek nélkül

// A saveLogBtn eseménykezelőjébe:
saveLogBtn.addEventListener('click', async () => {
    console.log("1. Rögzítés gomb megnyomva.");
    const newLog = {
        // ... (a meglévő kódod)
    };
    logs.push(newLog);
    console.log("2. Új adat hozzáadva a listához, a lista most:", logs);
    
    await saveData();
    
    console.log("4. A mentési folyamat után a renderelés következik.");
    // ... (a meglévő kódod)
});

// A saveData függvénybe:
async function saveData() {
    console.log("3. A saveData() függvény elindult, hogy mentse az adatokat a felhőbe.");
    if (!currentUser) {
        console.error("KRITIKUS HIBA: A mentés megszakadt, mert a currentUser null!");
        return;
    }
    
    const docRef = doc(db, 'users', currentUser.uid); 
    
    try {
        await setDoc(docRef, { poopLogs: logs, settings: settings });
        console.log("SIKERES MENTÉS! Az adatok a Firebase-ben vannak.");
    } catch (error) {
        console.error("Hiba az adatok Firebase-be való írásakor: ", error);
    }
}

// === A KÉT LEGFONTOSABB FÜGGVÉNY A HIBAKERESÉSHEZ ===

saveLogBtn.addEventListener('click', async () => {
    console.log("%c--- ÚJ MENTÉSI FOLYAMAT INDUL ---", "color: blue; font-weight: bold;");
    console.log("[GOMB] 1. 'Rögzítés' gomb megnyomva.");
    
    const newLog = {
        timestamp: Date.now(),
        duration: (Number(logDurationInput.value) || 5) * 60,
        description: logDescriptionInput.value.trim(),
        rating: Number(logRatingInput.value),
        isWork: settings.businessMode && isWorkLogCheckbox.checked,
        location: currentLogLocation
    };
    
    console.log("[GOMB] 2. Új objektum létrehozva:", newLog);
    logs.push(newLog);
    console.log("[GOMB] 3. A 'logs' tömb frissítve. Új elemszám:", logs.length);
    console.log("[GOMB] 4. A saveData() meghívása előtt...");

    await saveData("GOMB_KATTINTAS"); // Küldünk egy azonosítót, hogy tudjuk, honnan jött a hívás

    console.log("[GOMB] 7. A mentés utáni renderelés következik.");
    
    // A renderelő függvények maradnak
    weeklyChartOffset = 0; 
    renderDashboard();
    renderLogListPage();
    addMarkerToMap(newLog);
    logEntryModal.style.display = 'none';
});


async function saveData(source = "ISMERETLEN") {
    console.log(`%c[MENTÉS - ${source}] 5. A saveData() függvény elindult.`, "color: green; font-weight: bold;");
    if (!currentUser) {
        console.error("KRITIKUS HIBA: A mentés megszakadt, mert a currentUser null!");
        return;
    }

    console.log(`[MENTÉS - ${source}] 6. Adatok mentése a Firestore-ba... Az 'logs' tömb elemszáma:`, logs.length);
    
    const docRef = doc(db, 'users', currentUser.uid); 
    
    try {
        await setDoc(docRef, { poopLogs: logs, settings: settings });
        console.log(`%c[MENTÉS - ${source}] SIKER! Adatok elmentve!`, "background: lightgreen; color: black;");
    } catch (error) {
        console.error(`[MENTÉS - ${source}] HIBA a setDoc során:`, error);
    }
}
});