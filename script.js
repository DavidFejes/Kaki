// ==========================================================
// ||     A KAKI NAPLÓ v3.3 - ÁTIRÁNYÍTÁSOS BEJELENTKEZÉS   ||
// ==========================================================

// --- 1. LÉPÉS: FIREBASE SZOLGÁLTATÁSOK IMPORTÁLÁSA ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, onAuthStateChanged, signOut, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- BIZTONSÁGI HÁLÓ: A kód csak akkor fut le, ha a teljes HTML betöltődött ---
document.addEventListener('DOMContentLoaded', () => {

    console.log("DOM betöltődött, az alkalmazás logikája indul.");

    // --- 2. LÉPÉS: FIREBASE KONFIGURÁCIÓ ---
    const firebaseConfig = {
        apiKey: "AIzaSyDDHmub6fyzV7tEZ0lyYYVHEDYGnR4xiYI",
        authDomain: "kaki-b14a4.firebaseapp.com",
        projectId: "kaki-b14a4",
        storageBucket: "kaki-b14a4.appspot.com",
        messagingSenderId: "123120220357",
        appId: "1:123120220357:web:3386a6b8ded6c4ec3798ac"
    };

    // --- 3. LÉPÉS: INICIALIZÁLÁS ÉS ALAP VÁLTOZÓK ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    let currentUser = null;
    let logs = [];
    let settings = { businessMode: false, hourlySalary: 0 };
    let currentLogLocation = null;
    let weeklyChartOffset = 0;
    let map;
    let poopChart;

    // --- 4. LÉPÉS: HTML ELEMEK ELÉRÉSE ---
    const authBtn = document.getElementById('auth-btn');
    const userDisplay = document.getElementById('user-display');
    const mainContainer = document.querySelector('.container');
    const viewSwitcher = document.querySelector('.view-switcher');
    const views = document.querySelectorAll('.view-content');
    const openLogModalBtn = document.getElementById('open-log-modal-btn');
    const todayCountEl = document.getElementById('today-count');
    const weeklyTotalEl = document.getElementById('weekly-total');
    const dailyAvgEl = document.getElementById('daily-avg');
    const allTimeTotalEl = document.getElementById('all-time-total');
    const earningsCard = document.getElementById('earnings-card');
    const workEarningsEl = document.getElementById('work-earnings');
    const peakDayEl = document.getElementById('peak-day');
    const chartCanvas = document.getElementById('log-chart').getContext('2d');
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    const weekDisplay = document.getElementById('week-display');
    const fullLogListEl = document.getElementById('full-log-list');
    const mapContainer = document.getElementById('map-container');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const logEntryModal = document.getElementById('log-entry-modal');
    const closeButtons = document.querySelectorAll('.close-btn');
    const businessModeToggle = document.getElementById('business-mode-toggle');
    const salaryInputGroup = document.getElementById('salary-input-group');
    const hourlySalaryInput = document.getElementById('hourly-salary');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const saveLogBtn = document.getElementById('save-log-btn');
    const logDurationInput = document.getElementById('log-duration');
    const logDescriptionInput = document.getElementById('log-description');
    const logRatingInput = document.getElementById('log-rating');
    const workLogGroup = document.getElementById('work-log-group');
    const isWorkLogCheckbox = document.getElementById('is-work-log');
    const locationStatus = document.getElementById('location-status');

    if (!saveLogBtn) {
        alert("KRITIKUS HIBA: A 'save-log-btn' gomb nem található a HTML-ben! Ellenőrizd az index.html fájlt!");
        return;
    }


    // === FŐ LOGIKA: ESEMÉNYFIGYELŐK ===

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            mainContainer.style.display = 'block';
            authBtn.textContent = 'Kijelentkezés';
            userDisplay.textContent = `Üdv, ${user.displayName.split(' ')[0]}!`;
            loadUserData();
        } else {
            mainContainer.style.display = 'none';
            authBtn.textContent = 'Bejelentkezés Google-lel';
            userDisplay.textContent = '';
            logs = [];
            if (map) { map.remove(); map = null; }
        }
    });

    getRedirectResult(auth).catch((error) => {
        console.error("Hiba a visszairányítási eredmény feldolgozása közben:", error.message);
    });

    authBtn.addEventListener('click', () => {
        if (currentUser) {
            signOut(auth);
        } else {
            signInWithRedirect(auth, provider); // ITT A JAVÍTÁS!
        }
    });

    openLogModalBtn.addEventListener('click', () => {
        resetLogForm();
        getCurrentLocation();
        logEntryModal.style.display = 'block';
    });
    
    // === A HÍRES-NEVES RÖGZÍTÉS GOMB ===
    saveLogBtn.addEventListener('click', async () => {
        console.log("Rögzítés gomb kattintás észlelve!");
        
        const newLog = {
            timestamp: Date.now(),
            duration: (Number(logDurationInput.value) || 5) * 60,
            description: logDescriptionInput.value.trim(),
            rating: Number(logRatingInput.value),
            isWork: settings.businessMode && isWorkLogCheckbox.checked,
            location: currentLogLocation
        };
        logs.push(newLog);
        
        await saveData("GOMB_KATTINTAS");

        logEntryModal.style.display = 'none';
        renderEverything();
    });

    settingsBtn.addEventListener('click', () => { settingsModal.style.display = 'block'; });
    businessModeToggle.addEventListener('change', () => { salaryInputGroup.style.display = businessModeToggle.checked ? 'block' : 'none'; });
    saveSettingsBtn.addEventListener('click', async () => {
        settings.businessMode = businessModeToggle.checked;
        settings.hourlySalary = Number(hourlySalaryInput.value) || 0;
        await saveData("BEALLITASOK_MENTESE");
        settingsModal.style.display = 'none';
        applySettingsToUI();
        renderDashboard();
    });

    viewSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const targetView = e.target.dataset.view;
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            views.forEach(view => view.classList.toggle('active', view.id === targetView));
            if (targetView === 'map-view' && map) { setTimeout(() => map.invalidateSize(), 10); }
        }
    });

    closeButtons.forEach(btn => btn.addEventListener('click', (e) => e.target.closest('.modal').style.display = 'none'));
    window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; });

    fullLogListEl.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;
        const timestampToDelete = Number(deleteBtn.dataset.timestamp);
        logs = logs.filter(log => log.timestamp !== timestampToDelete);
        await saveData("ELEM_TORLESE");
        renderEverything();
    });

    prevWeekBtn.addEventListener('click', () => { weeklyChartOffset--; renderDashboard(); });
    nextWeekBtn.addEventListener('click', () => { if (weeklyChartOffset < 0) { weeklyChartOffset++; renderDashboard(); }});


    // === FŐ FÜGGVÉNYEK ===

    async function loadUserData() {
        if (!currentUser) return;
        const docRef = doc(db, 'users', currentUser.uid); 
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                logs = data.poopLogs || [];
                settings = { ...{ businessMode: false, hourlySalary: 0 }, ...data.settings };
                const needsMigration = logs.length > 0 && typeof logs[0] === 'number';
                if (needsMigration) {
                    console.log("Régi adat formátum észlelve. Migráció indul...");
                    logs = logs.map(timestamp => ({
                        timestamp: timestamp, duration: 300, rating: 3,
                        description: "Régi adat", isWork: false, location: null
                    }));
                    await saveData("MIGRACIO");
                    console.log("Migráció befejezve és az új adatok elmentve.");
                }
            } else {
                logs = []; settings = { businessMode: false, hourlySalary: 0 };
            }
            renderEverything();
        } catch (error) { console.error("Hiba az adatok betöltésekor: ", error); }
    }

    async function saveData(source = "ISMERETLEN") {
        if (!currentUser) return console.error("Mentési hiba: nincs bejelentkezett felhasználó!");
        const docRef = doc(db, 'users', currentUser.uid);
        try {
            await setDoc(docRef, { poopLogs: logs, settings: settings });
            console.log(`[MENTÉS - ${source}] Sikeres mentés!`);
        } catch (error) { console.error(`[MENTÉS - ${source}] HIBA:`, error); }
    }
    
    function resetLogForm() {
        logDurationInput.value = "5"; logDescriptionInput.value = ""; logRatingInput.value = "3";
        isWorkLogCheckbox.checked = false; currentLogLocation = null;
        workLogGroup.style.display = settings.businessMode ? 'block' : 'none';
        locationStatus.textContent = 'Helyszín meghatározása...';
        locationStatus.style.color = 'var(--text-secondary)';
    }

    function getCurrentLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (p) => { currentLogLocation = { lat: p.coords.latitude, lng: p.coords.longitude }; locationStatus.textContent = '✅ Helyszín rögzítve!'; locationStatus.style.color = 'lightgreen'; },
                () => { currentLogLocation = null; locationStatus.textContent = '⚠️ Helyszín nem elérhető.'; locationStatus.style.color = 'orange'; }
            );
        } else {
            locationStatus.textContent = 'Helymeghatározás nem támogatott.'; locationStatus.style.color = 'orange';
        }
    }

    function renderEverything() {
        weeklyChartOffset = 0;
        applySettingsToUI();
        renderDashboard();
        renderLogListPage();
        initMap();
    }
    
    function renderDashboard() {
        if (!currentUser) return;
        const stats = calculateStats(weeklyChartOffset);
        todayCountEl.textContent = stats.todayCount; weeklyTotalEl.textContent = stats.thisWeekCount;
        dailyAvgEl.textContent = stats.dailyAverage.toFixed(1); allTimeTotalEl.textContent = logs.length;
        workEarningsEl.textContent = `${stats.workEarnings.toFixed(0)} Ft`; peakDayEl.textContent = stats.peakDay.date || '-';
        renderChart(stats.weeklyChartData);
        const startDate = new Date(stats.startOfWeek);
        const endDate = new Date(stats.endOfWeek);
        weekDisplay.textContent = `${startDate.toLocaleDateString('hu-HU', {month:'short', day:'numeric'})} - ${endDate.toLocaleDateString('hu-HU', {month:'short', day:'numeric'})}`;
        nextWeekBtn.disabled = weeklyChartOffset >= 0;
    }
    
    function renderLogListPage() {
        fullLogListEl.innerHTML = [...logs].sort((a, b) => b.timestamp - a.timestamp).map(log => {
            const date = new Date(log.timestamp);
            let details = `<span><i class="fas fa-clock"></i> ${(log.duration / 60).toFixed(0)} perc</span> <span><i class="fas fa-star"></i> ${log.rating || 'N/A'}</span>`;
            if (log.isWork) details += ` <span><i class="fas fa-briefcase"></i> Munkahelyi</span>`;
            if (log.description) details += `<br><i>${log.description}</i>`;
            return `<li class="log-item" id="log-${log.timestamp}">
                <div class="log-item-main">${date.toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div class="log-item-details">${details}</div>
                <button class="delete-btn" data-timestamp="${log.timestamp}"><i class="fas fa-trash"></i></button>
            </li>`;
        }).join('');
    }

    function calculateStats(weekOffset = 0) {
        const now = new Date(); now.setDate(now.getDate() + (weekOffset * 7));
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(new Date(now).setDate(diff)).setHours(0, 0, 0, 0);
        const endOfWeek = new Date(new Date(startOfWeek).getTime() + 6 * 24 * 60 * 60 * 1000).setHours(23, 59, 59, 999);
        const weeklyChartData = Array(7).fill(0);
        logs.filter(l => l.timestamp >= startOfWeek && l.timestamp <= endOfWeek).forEach(l => {
            let dayIndex = new Date(l.timestamp).getDay(); dayIndex = (dayIndex === 0) ? 6 : dayIndex - 1; weeklyChartData[dayIndex]++;
        });
        let peakDay = { date: null, count: 0 };
        if (logs.length > 0) {
            const countsByDay = logs.reduce((acc, log) => { const day = new Date(log.timestamp).toLocaleDateString('hu-HU'); acc[day] = (acc[day] || 0) + 1; return acc; }, {});
            for (const date in countsByDay) { if (countsByDay[date] > peakDay.count) { peakDay = { date: `${date} (${countsByDay[date]}x)`, count: countsByDay[date] }; } }
        }
        let dailyAverage = 0;
        if (logs.length > 0) {
            const firstLogTime = logs.reduce((min, l) => l.timestamp < min ? l.timestamp : min, Date.now());
            const daysSinceFirstLog = Math.ceil((Date.now() - firstLogTime) / (1000 * 60 * 60 * 24)) || 1;
            dailyAverage = logs.length / daysSinceFirstLog;
        }
        return {
            todayCount: logs.filter(l => l.timestamp >= new Date().setHours(0,0,0,0)).length,
            thisWeekCount: logs.filter(l => l.timestamp >= startOfWeek && l.timestamp <= endOfWeek).length,
            dailyAverage,
            workEarnings: logs.filter(l => l.isWork && settings.hourlySalary > 0).reduce((sum, l) => sum + (l.duration / 3600) * settings.hourlySalary, 0),
            weeklyChartData, peakDay, startOfWeek, endOfWeek
        };
    }

    function renderChart(data) {
        if (poopChart) poopChart.destroy();
        poopChart = new Chart(chartCanvas, {
            type: 'bar',
            data: { labels: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'], datasets: [{ data, backgroundColor: 'rgba(212, 172, 110, 0.5)', borderColor: 'rgba(212, 172, 110, 1)', borderWidth: 1, borderRadius: 5 }] },
            options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#b0a299' } }, x: { ticks: { color: '#b0a299'} } }, plugins: { legend: { display: false } } }
        });
    }

    function initMap() {
        if (mapContainer && !map) {
            map = L.map('map-container').setView([47.4979, 19.0402], 7);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 20
            }).addTo(map);
        }
        if(map) renderAllMarkers();
    }
    
    function renderAllMarkers() {
        map.eachLayer(layer => { if(layer instanceof L.Marker) map.removeLayer(layer); });
        logs.forEach(log => {
            if (log.location) {
                const date = new Date(log.timestamp);
                const popupContent = `<b>${date.toLocaleString('hu-HU')}</b><br>${log.description || 'Nincs leírás.'}`;
                L.marker([log.location.lat, log.location.lng]).addTo(map).bindPopup(popupContent);
            }
        });
    }
    
    function applySettingsToUI() {
        businessModeToggle.checked = settings.businessMode;
        hourlySalaryInput.value = settings.hourlySalary || '';
        salaryInputGroup.style.display = settings.businessMode ? 'block' : 'none';
        earningsCard.style.display = settings.businessMode ? 'grid' : 'none';
    }

}); // Itt a vége a DOMContentLoaded eseményfigyelőnek