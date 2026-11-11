// ============================================================================
// KONFIGURATION & DATEN
// ============================================================================

// Globale Einstellungen
const config = {
    slotDurationMinutes: 120, // Dauer eines Slots in Minuten (2 Stunden)
    bookingCutoffMinutes: 10, // Wie viele Minuten vor Start wird der Slot gesperrt?
    cancelCutoffMinutes: 30   // Bis wie viele Minuten vor Start darf man stornieren?
};

// Liste der Waschmaschinen
const machines = [
    { 
        id: "m1", 
        name: "Maschine 1", 
        subtitle: "Waschmaschine Standard",
        badges: ["Waschen", "8 kg", "Eco", "Schnell", "60°C"],
        shortInfo: "Für Alltagswäsche (T-Shirts, Jeans)",
        description: "", 
        icon: "🧼" 
    },
    { 
        id: "m2", 
        name: "Maschine 2", 
        subtitle: "Schonwaschmaschine",
        badges: ["Waschen", "6 kg", "Schonwäsche", "Wolle/Fein", "Niedrige Schleuderzahl"],
        shortInfo: "Für empfindliche Kleidung",
        description: "", 
        icon: "🧼" 
    },
    { 
        id: "m3", 
        name: "Maschine 3", 
        subtitle: "Großraum-Waschmaschine",
        badges: ["Waschen", "10 kg", "Bettwäsche", "Handtücher", "Intensiv"],
        shortInfo: "Für große Mengen & Decken",
        description: "", 
        icon: "🧼" 
    },
    { 
        id: "m4", 
        name: "Maschine 4", 
        subtitle: "Waschtrockner (Kombi)",
        badges: ["Waschen+Trocknen", "7 kg/4 kg", "Kombi-Programm", "Zeit sparen", "Schonend"],
        shortInfo: "Waschen und Trocknen in einem Gerät",
        description: "", 
        icon: "🧼" 
    },
    { 
        id: "m5", 
        name: "Maschine 5", 
        subtitle: "Wäschetrockner",
        badges: ["Trocknen", "8 kg", "Sensortrocknung", "Express", "Knitterschutz"],
        shortInfo: "Schnelles Trocknen ohne Waschen",
        description: "", 
        icon: "🧼" 
    }
];

// Feste Zeit-Slots pro Tag
const timeSlots = [
    { start: "10:00", end: "12:00" },
    { start: "12:00", end: "14:00" },
    { start: "14:00", end: "16:00" },
    { start: "16:00", end: "18:00" },
    { start: "18:00", end: "20:00" }
];

// Speicher-Schlüssel für LocalStorage (Datenbank im Browser)
const keyBookings = "washapp.bookings";
const keySeeded = "washapp.seeded"; // Merker, ob Testdaten schon erzeugt wurden
const currentUserId = "me";         // ID des aktuellen Nutzers (simuliert)
const keyEvents = "washapp.events"; // Logbuch für den Monitor

// ============================================================================
// DATENBANK-HELFER (LocalStorage)
// ============================================================================

// Liest alle Buchungen aus dem Speicher
function readBookings() {
    try {
        const raw = localStorage.getItem(keyBookings);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

// Schreibt die Buchungsliste in den Speicher
function writeBookings(list) {
    localStorage.setItem(keyBookings, JSON.stringify(list));
}

// ============================================================================
// HILFSFUNKTIONEN (Zeit & Formatierung)
// ============================================================================

// Fügt eine führende Null hinzu (z.B. 9 -> "09")
function pad(n) {
    return n < 10 ? "0" + n : "" + n;
}

// Wandelt "HH:MM" in Minuten seit Mitternacht um
function parseHM(hm) {
    const [h, m] = hm.split(":").map(Number);
    return h * 60 + m;
}

// Wandelt Minuten seit Mitternacht zurück in "HH:MM"
function formatHM(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return pad(h) + ":" + pad(m);
}

// Gibt das Datum als ISO-String zurück ("YYYY-MM-DD") - LOKALZEIT
function dateISO(d) {
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${year}-${month}-${day}`;
}

// Berechnet den Montag der Woche eines Datums
function weekStart(d) {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7; // Anpassung damit Montag = 0
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
}

// Erzeugt ein Array mit 7 Datum-Objekten für eine Woche
function weekDates(ws) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        return d;
    });
}

// Gibt den Wochentag kurz zurück ("Mo", "Di"...)
function weekdayShort(d) {
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][(d.getDay() + 6) % 7];
}

// Gibt den Monat kurz zurück ("Jan", "Feb"...)
function monthShort(d) {
    return ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][d.getMonth()];
}

// Formatiert Datum für die Tabellen-Kopfzeile
function formatDateCell(d) {
    return weekdayShort(d) + " " + pad(d.getDate()) + " " + monthShort(d);
}

// Formatiert einen Slot ("10:00–12:00")
function labelSlot(s) {
    return s.start + "–" + s.end;
}

// Erzeugt ein Date-Objekt aus String ("2023-01-01") und Zeit ("10:00")
function dtFrom(dateStr, hm) {
    const d = new Date(dateStr + "T" + hm + ":00");
    return d;
}

// Liefert die aktuelle Zeit (berücksichtigt den Demo-Modus!)
function getNow() {
    return state.demo && state.demo.enabled ? new Date(state.demo.now) : new Date();
}

// Zeigt eine kleine Nachricht ("Toast") am unteren Bildschirmrand
function showToast(msg, type) {
    const c = document.getElementById("toastContainer");
    if (!c) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.remove(); }, 2500); // Verschwindet nach 2.5 Sekunden
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function randomInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ============================================================================
// BUCHUNGS-LOGIK (Core)
// ============================================================================

// Erzeugt zufällige Buchungen für Demo-Zwecke (nur beim ersten Start)
function seedRandomBookings() {
    if (localStorage.getItem(keySeeded)) return;
    const now = new Date();
    // Nutze immer das aktuelle Jahr für Jan-April, oder nächstes Jahr wenn wir spät im Jahr sind
    const targetYear = now.getFullYear(); 
    const months = [0, 1, 2, 3]; // Jan, Feb, Mär, Apr
    const bookings = readBookings();
    machines.forEach(m => {
        months.forEach(mon => {
            const dim = daysInMonth(targetYear, mon);
            
            // Wir unterteilen den Monat in Wochen, um sicherzustellen, dass JEDE Woche 2-3 Buchungen hat
            const weeks = [
                { start: 1, end: 7 },
                { start: 8, end: 14 },
                { start: 15, end: 21 },
                { start: 22, end: dim }
            ];

            weeks.forEach(week => {
                const count = randomInt(2, 3); // 2-3 Buchungen pro Woche
                for (let i = 0; i < count; i++) {
                    const day = randomInt(week.start, week.end);
                    const d = new Date(targetYear, mon, day);
                    const iso = dateISO(d);
                    const si = randomInt(0, timeSlots.length - 1);
                    const hm = timeSlots[si].start;
                    if (isReserved(bookings, m.id, iso, hm)) continue;
                    const endMin = parseHM(hm) + config.slotDurationMinutes;
                    const status = dtFrom(iso, hm) > now ? "planned" : "finished";
                    bookings.push({ id: "seed" + m.id + mon + day + si + i, machineId: m.id, userId: "other", date: iso, startTime: hm, endTime: formatHM(endMin), status });
                }
            });
        });
    });
    writeBookings(bookings);
    localStorage.setItem(keySeeded, "1");
}

// Fügt weitere zufällige Buchungen hinzu (Button "Mehr zufällige Buchungen")
function addMoreRandomBookings() {
    const now = new Date();
    const targetYear = now.getFullYear();
    const months = [0, 1, 2, 3]; // Jan, Feb, Mär, Apr
    const bookings = readBookings();
    machines.forEach(m => {
        months.forEach(mon => {
            const count = randomInt(4, 8); // Zusätzliche Buchungen
            const dim = daysInMonth(targetYear, mon);
            for (let i = 0; i < count; i++) {
                const day = randomInt(1, dim);
                const d = new Date(targetYear, mon, day);
                const iso = dateISO(d);
                const si = randomInt(0, timeSlots.length - 1);
                const hm = timeSlots[si].start;
                if (isReserved(bookings, m.id, iso, hm)) continue;
                const endMin = parseHM(hm) + config.slotDurationMinutes;
                const status = dtFrom(iso, hm) > now ? "planned" : "finished";
                bookings.push({ id: "extra" + Date.now() + m.id + mon + day + si, machineId: m.id, userId: "other", date: iso, startTime: hm, endTime: formatHM(endMin), status });
            }
        });
    });
    writeBookings(bookings);
}

// Stellt sicher, dass alte Buchungen korrekte User-IDs haben
function migrateBookingsUserId() {
    const list = readBookings();
    let changed = false;
    list.forEach(b => {
        if (!b.userId) {
            if ((b.id || "").startsWith("seed") || (b.id || "").startsWith("extra")) b.userId = "other";
            else b.userId = currentUserId;
            changed = true;
        }
    });
    if (changed) writeBookings(list);
}

// Prüft, ob ein Slot bereits gebucht ist
function isReserved(bookings, mId, dateStr, hm) {
    return bookings.some(b => b.machineId === mId && b.date === dateStr && b.startTime === hm && b.status !== "canceled");
}

// Bestimmt den Status eines Slots (available, booked, locked)
function slotStatus(mId, dateStr, hm) {
    // Zuerst prüfen, ob der Slot in der Vergangenheit liegt
    const start = dtFrom(dateStr, hm);
    const cutoff = new Date(start.getTime() - config.bookingCutoffMinutes * 60000);
    const n = getNow();
    if (n > cutoff) return "locked"; // Zu spät zum Buchen

    // Dann prüfen, ob bereits gebucht
    const bookings = readBookings();
    const reserved = isReserved(bookings, mId, dateStr, hm);
    if (reserved) return "booked";
    
    return "available";
}
// Alias für slotStatus
function getSlotState(mId, dateStr, hm) { return slotStatus(mId, dateStr, hm); }

// Prüft, ob eine Buchung noch storniert werden darf
function canCancel(b) {
    const start = dtFrom(b.date, b.startTime);
    const limit = new Date(start.getTime() - config.cancelCutoffMinutes * 60000);
    return getNow() <= limit && b.status === "planned";
}

// Erstellt eine neue Buchung
function createBooking(mId, dateStr, hm) {
    const endMin = parseHM(hm) + config.slotDurationMinutes;
    const b = { id: "b" + Date.now(), machineId: mId, userId: currentUserId, date: dateStr, startTime: hm, endTime: formatHM(endMin), status: "planned" };
    const bookings = readBookings();
    if (isReserved(bookings, mId, dateStr, hm))
        return null;
    bookings.push(b);
    writeBookings(bookings);
    logEvent("BOOKING_CREATED", { id: b.id, machineId: mId, date: dateStr, startTime: hm });
    updateFabBadge();
    return b;
}

// Storniert eine Buchung
function cancelBooking(id) {
    const bookings = readBookings();
    const i = bookings.findIndex(x => x.id === id);
    if (i >= 0) {
        const bk = bookings[i];
        bookings[i].status = "canceled";
        writeBookings(bookings);
        logEvent("BOOKING_CANCELED", { id: bk.id, machineId: bk.machineId, date: bk.date, startTime: bk.startTime });
        updateFabBadge();
    }
}

// Aktualisiert den Status von Buchungen (planned -> running -> finished)
function cleanupBookings() {
    const list = readBookings();
    const now = getNow();
    let changed = false;
    list.forEach(b => {
        const start = dtFrom(b.date, b.startTime);
        const end = dtFrom(b.date, b.endTime);
        if (b.status === "planned" && now >= start && now < end) { b.status = "running"; changed = true; }
        else if (b.status === "planned" && now >= end) { b.status = "finished"; changed = true; }
    });
    if (changed) {
        writeBookings(list);
        updateFabBadge();
    }
}

// Schreibt ein Event in das Monitor-Log
function logEvent(type, details) {
    const raw = localStorage.getItem(keyEvents);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ ts: getNow().toISOString(), type, details });
    localStorage.setItem(keyEvents, JSON.stringify(arr));
}

// Formatiert Datum/Zeit lesbar für den Menschen
function formatDateTime(d) {
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// Berechnet Minuten seit Tagesbeginn
function minutesOfDay(d) { return d.getHours() * 60 + d.getMinutes(); }

// Findet heraus, welcher Slot gerade aktiv ist
function currentSlotIndex(now) {
    const min = minutesOfDay(now);
    for (let i = 0; i < timeSlots.length; i++) {
        const start = parseHM(timeSlots[i].start);
        const end = start + config.slotDurationMinutes;
        if (min >= start && min < end) return i;
    }
    return -1;
}

// Erkennt, wenn Slots durch Zeitablauf "gesperrt" werden (für Monitor)
function detectSlotLocks() {
    const now = getNow();
    const ds = dateISO(now);
    machines.forEach(m => {
        timeSlots.forEach(ts => {
            const st = getSlotState(m.id, ds, ts.start);
            const key = m.id + "|" + ds + "|" + ts.start;
            if (st === "locked" && !state.demo.prevLocks[key]) {
                state.demo.prevLocks[key] = true;
                logEvent("SLOT_LOCKED", { machineId: m.id, date: ds, startTime: ts.start });
            }
        });
    });
}

// Setzt alles zurück (für den "Reset" Button im Monitor)
function resetDemoData() {
    localStorage.removeItem(keyBookings);
    localStorage.removeItem(keyEvents);
    localStorage.removeItem(keySeeded);
    seedRandomBookings();
    migrateBookingsUserId();
}

// Übersetzt internen Status in deutschen Text
function statusLabel(s) {
    return s === "planned" ? "Geplant" : s === "running" ? "Laufend" : s === "finished" ? "Abgeschlossen" : "Storniert";
}

// ============================================================================
// STATE & DOM
// ============================================================================

const state = {
    currentView: "machines", // Aktuelle Ansicht
    currentMachineId: null,  // Ausgewählte Maschine
    weekStart: weekStart(new Date()), // Angezeigte Woche
    selected: { date: null, slotIndex: null }, // Ausgewählter Slot
    demo: { enabled: false, now: new Date(), prevLocks: {} }, // Demo-Zustand
    monitorImportantOnly: false // Filter für Monitor-Log
};

// Referenzen auf HTML-Elemente
const machinesView = document.getElementById("machinesView");
const weekView = document.getElementById("weekView");
const confirmView = document.getElementById("confirmView");
const bookingsView = document.getElementById("bookingsView");
const finishedModal = document.getElementById("finishedModal");
const finishedOk = document.getElementById("finishedOk");
const cancelModal = document.getElementById("cancelModal");
const cancelModalCancel = document.getElementById("cancelModalCancel");
const cancelModalConfirm = document.getElementById("cancelModalConfirm");
const demoControls = document.getElementById("demoControls");
const demoClock = document.getElementById("demoClock"); // This is now the indicator
const demoDate = document.getElementById("demoDate");
const demoHour = document.getElementById("demoHour");
const demoHourLabel = document.getElementById("demoHourLabel");

// New Header Elements
const moreBtn = document.getElementById("moreBtn");
const moreMenu = document.getElementById("moreMenu");
const menuMonitor = document.getElementById("menuMonitor");
const menuDemoToggle = document.getElementById("menuDemoToggle");
const menuReset = document.getElementById("menuReset");

// FAB Elements
const fabBookings = document.getElementById("fabBookings");
const fabBadge = document.getElementById("fabBadge");

// FAB Logic
fabBookings.addEventListener("click", () => navigate("bookings"));

function updateFabBadge() {
    const bookings = readBookings();
    const planned = bookings.filter(b => b.userId === currentUserId && b.status === "planned");
    const count = planned.length;
    
    fabBadge.textContent = count;
    if (count > 0) {
        fabBadge.classList.remove("hidden");
    } else {
        fabBadge.classList.add("hidden");
    }
    // FAB is always visible
    fabBookings.classList.remove("hidden");
}

// Event Listener für Navigation und Buttons
document.querySelector(".home-btn").addEventListener("click", () => navigate("machines"));

finishedOk.addEventListener("click", () => { finishedModal.classList.add("hidden"); });

// Cancel modal logic
let pendingCancelId = null;
function openCancelModal(bookingId) {
    pendingCancelId = bookingId;
    cancelModal.classList.remove("hidden");
}
cancelModalCancel && cancelModalCancel.addEventListener("click", () => {
    pendingCancelId = null;
    cancelModal.classList.add("hidden");
});
cancelModalConfirm && cancelModalConfirm.addEventListener("click", () => {
    if (pendingCancelId) {
        cancelBooking(pendingCancelId);
        showToast("Buchung storniert", "success");
        renderBookings();
    }
    pendingCancelId = null;
    cancelModal.classList.add("hidden");
});

// --- DROPDOWN LOGIC ---
moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    moreMenu.classList.add("hidden");
});

menuMonitor.addEventListener("click", () => navigate("monitor"));

menuDemoToggle.addEventListener("click", () => {
    toggleDemoMode();
});

menuReset.addEventListener("click", () => {
    resetDemoData();
    showToast("Demo-Daten zurückgesetzt", "info");
    rerender();
});

function toggleDemoMode() {
    state.demo.enabled = !state.demo.enabled;
    demoControls.classList.toggle("hidden", !state.demo.enabled);
    demoClock.classList.toggle("hidden", !state.demo.enabled);
    
    if (state.demo.enabled) {
        const n = new Date();
        demoDate.value = n.toISOString().slice(0, 10);
        demoHour.value = n.getHours();
        updateDemoNow();
    }
    rerender();
}

// Aktualisiert die simulierte Zeit im Demo-Modus
function updateDemoNow() {
    const ds = demoDate.value || new Date().toISOString().slice(0, 10);
    const hour = parseInt(demoHour.value || "0", 10);
    state.demo.now = new Date(ds + "T" + (hour < 10 ? "0" + hour : hour) + ":00:00");
    demoHourLabel.textContent = (hour < 10 ? "0" + hour : hour) + ":00";
    demoClock.textContent = "Demo aktiv: " + ds + " " + demoHourLabel.textContent;
    cleanupBookings();
    detectSlotLocks();
}

demoDate && demoDate.addEventListener("input", () => { updateDemoNow(); rerender(); });
demoHour && demoHour.addEventListener("input", () => { updateDemoNow(); rerender(); });

// ============================================================================
// NAVIGATION & RENDER-LOGIK
// ============================================================================

// Zeichnet die aktuelle Ansicht neu
function rerender() {
    if (state.currentView === "machines") renderMachines();
    else if (state.currentView === "week") { renderWeek(); appendWeekEmptyState(); }
    else if (state.currentView === "confirm") renderConfirm();
    else if (state.currentView === "bookings") renderBookings();
    else if (state.currentView === "monitor") renderMonitor();
}

// Fügt "Keine Slots verfügbar" hinzu, falls Woche leer ist
function appendWeekEmptyState() {
    const c = document.getElementById("weekView");
    if (!c) return;
    const prev = c.querySelector(".week-empty");
    if (prev) prev.remove();
    const has = c.querySelector(".slot-grid .slot-cell.available");
    if (!has) {
        const empty = document.createElement("div");
        empty.className = "row-status week-empty";
        empty.textContent = "Keine Slots verfügbar diese Woche";
        c.appendChild(empty);
    }
}

const monitorView = document.getElementById("monitorView");
const welcomeView = document.getElementById("welcomeView");
const welcomeStartBtn = document.getElementById("welcomeStartBtn");
const appHeader = document.querySelector(".app-header");

const views = {
    welcome: welcomeView,
    machines: machinesView,
    week: weekView,
    confirm: confirmView,
    bookings: bookingsView,
    monitor: monitorView
};

// --- BUBBLES LOGIC ---
let bubbleInterval;

function createBubble(isInitial = false) {
    const container = document.getElementById("bubbleContainer");
    if (!container) return;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    
    // Random size between 10px and 40px
    const size = Math.random() * 30 + 10;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    // Random horizontal position (0% to 100%)
    bubble.style.left = `${Math.random() * 100}%`;
    
    // Slower duration (15s to 25s)
    const duration = Math.random() * 10 + 15;
    bubble.style.setProperty("--duration", `${duration}s`);
    
    // Random sway amount (-50px to 50px)
    const sway = Math.random() * 100 - 50;
    bubble.style.setProperty("--sway", `${sway}px`);

    // If initial population, start mid-animation
    if (isInitial) {
        const delay = -(Math.random() * duration);
        bubble.style.animationDelay = `${delay}s`;
    }
    
    container.appendChild(bubble);
    
    // Remove bubble after animation ends (plus a buffer)
    setTimeout(() => {
        if(bubble.parentNode) bubble.remove();
    }, duration * 1000);
}

function startBubbles() {
    if (bubbleInterval) return;
    
    const container = document.getElementById("bubbleContainer");
    // If container is empty, spawn some initial bubbles to fill the screen
    if (container && container.children.length === 0) {
        for(let i=0; i<15; i++) {
            createBubble(true);
        }
    }

    createBubble();
    // Create new bubble every 2 seconds (less frequent to avoid clutter with long duration)
    bubbleInterval = setInterval(() => createBubble(), 2000);
}

function stopBubbles() {
    if (bubbleInterval) {
        clearInterval(bubbleInterval);
        bubbleInterval = null;
    }
    // Do NOT clear container so bubbles persist when returning
}

// Hilfsfunktion zum Umschalten der Ansichten
function navigate(viewName, data = null) {
    state.currentView = viewName;
    
    // Hide all views
    Object.values(views).forEach(el => { if(el) el.classList.add("hidden"); });
    
    // Show target view
    if (views[viewName]) {
        views[viewName].classList.remove("hidden");
    }

    // Set Titles
    const titles = {
        machines: "Waschraum-Übersicht",
        week: "Datum auswählen",
        confirm: "aktuelle Buchung",
        bookings: "Meine Buchungen",
        monitor: "Monitor"
    };
    if (titles[viewName]) {
        const t = document.querySelector(".app-title");
        if(t) t.textContent = titles[viewName];
    }

    // Special handling for welcome view (hide header and FAB)
    if (viewName === "welcome") {
        if (appHeader) appHeader.classList.add("hidden");
        fabBookings.classList.add("hidden");
        if (state.demo.enabled && demoControls) demoControls.classList.add("hidden");
        startBubbles();
    } else {
        if (appHeader) appHeader.classList.remove("hidden");
        updateFabBadge(); // Shows FAB and updates badge
        if (state.demo.enabled && demoControls) demoControls.classList.remove("hidden");
        stopBubbles();
    }

    // View specific logic
    if (viewName === "machines") renderMachines();
    else if (viewName === "week") { renderWeek(data); appendWeekEmptyState(); }
    else if (viewName === "confirm") renderConfirm(data);
    else if (viewName === "bookings") renderBookings();
    else if (viewName === "monitor") renderMonitor();
}

// Welcome Screen Logic
if(welcomeStartBtn) welcomeStartBtn.addEventListener("click", () => navigate("machines"));

// Findet den nächsten freien Slot (für die Vorschau auf der Startseite)
function nextBookableForMachine(mId) {
    const start = weekStart(new Date());
    for (let w = 0; w < 2; w++) { // Sucht in den nächsten 2 Wochen
        const days = weekDates(new Date(start.getTime() + w * 7 * 86400000));
        for (const d of days) {
            const iso = dateISO(d);
            for (let i = 0; i < timeSlots.length; i++) {
                const hm = timeSlots[i].start; const st = slotStatus(mId, iso, hm);
                if (st === "available") return { date: d, slotIndex: i };
            }
        }
    }
    return null;
}

// --- ANSICHT: MASCHINEN LISTE ---
function renderMachines() {
    machinesView.innerHTML = "";
    machines.forEach(m => {
        const card = document.createElement("div");
        card.className = "card machine-card"; // Added machine-card class for specificity
        
        const info = document.createElement("div");
        info.className = "card-info";
        
        // Icon (optional, keep it if desired or remove if distracting)
        // const icon = document.createElement("div");
        // icon.textContent = m.icon;
        
        // Content Wrapper
        const content = document.createElement("div");
        content.className = "card-content";

        // Title
        const title = document.createElement("div");
        title.className = "card-title";
        title.textContent = m.name;

        // Subtitle (Type)
        const subtitle = document.createElement("div");
        subtitle.className = "card-subtitle";
        subtitle.textContent = m.subtitle;

        // Badges
        const badges = document.createElement("div");
        badges.className = "card-badges";
        if (m.badges && m.badges.length > 0) {
            m.badges.forEach(b => {
                const chip = document.createElement("span");
                chip.className = "badge";
                chip.textContent = b;
                badges.appendChild(chip);
            });
        }

        // Short Info
        const shortInfo = document.createElement("div");
        shortInfo.className = "card-short-info";
        shortInfo.textContent = m.shortInfo;

        // Next Slot Info
        const sub = document.createElement("div");
        sub.className = "card-sub";
        const nb = nextBookableForMachine(m.id);
        if (nb) {
            sub.textContent = "Nächster buchbarer Slot: " + formatDateCell(nb.date) + " " + labelSlot(timeSlots[nb.slotIndex]);
        } else {
             sub.textContent = "Keine freien Termine in nächster Zeit";
        }
        
        // Assemble Content
        content.appendChild(title);
        content.appendChild(subtitle);
        content.appendChild(badges);
        content.appendChild(shortInfo);
        content.appendChild(sub);

        // info.appendChild(icon); // Skipping icon for cleaner look as per "Style minimaliste"
        info.appendChild(content);
        
        const action = document.createElement("button");
        action.className = "btn primary";
        action.textContent = "Termine anzeigen";
        action.addEventListener("click", () => {
            state.currentMachineId = m.id;
            state.weekStart = weekStart(new Date());
            state.selected = { date: null, slotIndex: null };
            navigate("week");
        });
        
        card.appendChild(info);
        card.appendChild(action);
        machinesView.appendChild(card);
    });
    

}

// --- ANSICHT: WOCHENPLAN ---
function renderWeek() {
    weekView.innerHTML = "";
    
    // Navigation (Vorherige/Nächste Woche)
    const header = document.createElement("div");
    header.className = "grid-header";
    const title = document.createElement("div");
    title.textContent = "Datum auswählen";
    const nav = document.createElement("div");
    nav.className = "grid-nav";
    const prev = document.createElement("button");
    prev.className = "btn";
    prev.textContent = "Vorherige Woche";
    prev.addEventListener("click", () => { state.weekStart = new Date(state.weekStart.getTime() - 7 * 86400000); renderWeek(); });
    const nextWeek = document.createElement("button");
    nextWeek.className = "btn";
    nextWeek.textContent = "Nächste Woche";
    nextWeek.addEventListener("click", () => { state.weekStart = new Date(state.weekStart.getTime() + 7 * 86400000); renderWeek(); });
    nav.appendChild(prev);
    nav.appendChild(nextWeek);
    header.appendChild(title);
    header.appendChild(nav);
    weekView.appendChild(header);
    
    // Legende
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = '<span class="chip"><span class="dot available"></span>Verfügbar</span><span class="chip"><span class="dot booked"></span>Belegt</span><span class="chip"><span class="dot locked"></span>Gesperrt</span><span class="chip"><span class="dot selected"></span>Ausgewählt</span>';
    weekView.appendChild(legend);
    
    // Kalender-Tabelle
    const gridWrap = document.createElement("div");
    gridWrap.className = "grid";
    const table = document.createElement("table");
    table.className = "slot-grid";
    
    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    trh.appendChild(document.createElement("th"));
    timeSlots.forEach(s => {
        const th = document.createElement("th");
        th.textContent = labelSlot(s);
        trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    const days = weekDates(state.weekStart);
    days.forEach(d => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = formatDateCell(d);
        tr.appendChild(th);
        
        timeSlots.forEach((s, i) => {
            const td = document.createElement("td");
            td.className = "slot-cell";
            const iso = dateISO(d);
            const st = slotStatus(state.currentMachineId, iso, s.start);
            td.classList.add(st);
            
            // Tooltip für gesperrte Slots
            if (st === "locked") td.title = "Zeitslot bereits gestartet";
            
            td.textContent = labelSlot(s);
            
            // Auswahl-Logik
            if (state.selected.date === iso && state.selected.slotIndex === i) td.classList.add("selected");
            
            td.addEventListener("click", () => {
                if (st === "available") {
                    state.selected = { date: iso, slotIndex: i };
                    renderWeek(); // Neu zeichnen für Highlight
                }
            });
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    gridWrap.appendChild(table);
    weekView.appendChild(gridWrap);
    
    // Hinweis-Text unter der Tabelle
    const hint = document.createElement("div");
    hint.style.fontSize = "12px";
    hint.style.color = "#666";
    hint.style.marginTop = "8px";
    hint.textContent = "Buchung nur vor Beginn des Zeitslots möglich.";
    weekView.appendChild(hint);
    
    // Footer Actions (Zurück, Info, Weiter)
    const actions = document.createElement("div");
    actions.className = "footer-actions";
    actions.style.display = "flex";
    actions.style.justifyContent = "space-between";
    actions.style.alignItems = "center";
    actions.style.marginTop = "20px";
    
    // Zurück-Button
    const backBtn = document.createElement("button");
    backBtn.className = "btn";
    backBtn.textContent = "Zurück";
    backBtn.addEventListener("click", () => navigate("machines"));
    
    // Auswahl-Info (Mitte)
    const selectionInfo = document.createElement("div");
    selectionInfo.style.flex = "1";
    selectionInfo.style.textAlign = "center";
    selectionInfo.style.fontSize = "13px";
    selectionInfo.style.fontWeight = "bold";
    selectionInfo.style.color = "#555";
    selectionInfo.style.padding = "0 8px";
    
    if (state.selected.date) {
        const d = new Date(state.selected.date);
        const s = timeSlots[state.selected.slotIndex];
        const m = machines.find(x => x.id === state.currentMachineId);
        // Format: "Auswahl: Do 15 Jan 12:00–14:00 · Maschine 1"
        // Styled with specific writing
        selectionInfo.innerHTML = `<span style="display:block; font-size:10px; text-transform:uppercase; color:#999; margin-bottom:2px; letter-spacing:1px;">Auswahl</span>` + 
                                  formatDateCell(d) + " " + labelSlot(s) + 
                                  `<div style="font-weight:normal; font-size:12px; color:#777; margin-top:2px;">` + m.name + `</div>`;
    } else {
        selectionInfo.style.opacity = "0"; // Hide if nothing selected but keep space
    }
    
    // Weiter-Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn primary";
    nextBtn.textContent = "Weiter";
    
    if (!state.selected.date) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.5";
        nextBtn.style.cursor = "not-allowed";
    } else {
        nextBtn.addEventListener("click", () => navigate("confirm"));
    }
    
    actions.appendChild(backBtn);
    actions.appendChild(selectionInfo);
    actions.appendChild(nextBtn);
    weekView.appendChild(actions);
}

// --- ANSICHT: BESTÄTIGUNG ---
function renderConfirm() {
    confirmView.innerHTML = "";
    document.querySelector(".app-title").textContent = "Buchung bestätigen";
    
    const m = machines.find(x => x.id === state.currentMachineId);
    const s = timeSlots[state.selected.slotIndex];
    const d = new Date(state.selected.date);
    
    const box = document.createElement("div");
    box.className = "card";
    
    // Header mit Icon und Titel
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "16px";
    header.style.marginBottom = "16px";
    header.style.paddingBottom = "16px";
    header.style.borderBottom = "1px solid #eee";
    
    const icon = document.createElement("div");
    icon.textContent = m.icon;
    icon.style.fontSize = "32px";
    
    const titleBox = document.createElement("div");
    titleBox.innerHTML = `<div class="card-title">${m.name}</div><div class="card-subtitle">${m.subtitle}</div>`;
    
    header.appendChild(icon);
    header.appendChild(titleBox);
    box.appendChild(header);
    
    // Details
    const details = document.createElement("div");
    details.innerHTML = `
        <div style="margin-bottom:8px"><strong>Datum:</strong> ${formatDateCell(d)}</div>
        <div style="margin-bottom:8px"><strong>Zeit:</strong> ${labelSlot(s)}</div>
        <div style="margin-bottom:16px"><strong>Ort:</strong> Waschraum EG</div>
        
        <div style="background:#fff3e0; padding:12px; border-radius:8px; font-size:13px; color:#e65100;">
            <strong>Hinweise:</strong>
            <ul style="margin:4px 0 0 16px; padding:0;">
                <li>Buchung nur vor Beginn des Zeitslots möglich.</li>
                <li>Stornierung bis ${config.cancelCutoffMinutes} Min. vor Start möglich.</li>
                <li>Nach Ende der Zeit Wäsche bitte sofort entnehmen.</li>
            </ul>
        </div>
    `;
    box.appendChild(details);
    confirmView.appendChild(box);
    
    const actions = document.createElement("div");
    actions.className = "footer-actions";
    
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn";
    cancelBtn.textContent = "Zurück";
    cancelBtn.addEventListener("click", () => {
        state.selected = { date: null, slotIndex: null };
        navigate("week");
    });
    
    const okBtn = document.createElement("button");
    okBtn.className = "btn primary";
    okBtn.textContent = "Buchung bestätigen";
    okBtn.addEventListener("click", () => {
        const iso = state.selected.date;
        const hm = timeSlots[state.selected.slotIndex].start;
        const st = slotStatus(state.currentMachineId, iso, hm);
        
        if (st !== "available") {
            showToast("Slot wurde inzwischen belegt. Bitte neu auswählen.", "error");
            navigate("week");
            return;
        }
        
        const bookings = readBookings();
        if (isReserved(bookings, state.currentMachineId, iso, hm)) {
            showToast("Slot wurde inzwischen belegt. Bitte neu auswählen.", "error");
            navigate("week");
            return;
        }
        
        const created = createBooking(state.currentMachineId, iso, hm);
        if (created) {
            showToast("Buchung erstellt", "success");
            state.selected = { date: null, slotIndex: null };
            navigate("bookings");
        } else {
            showToast("Buchung fehlgeschlagen", "error");
            navigate("week");
        }
    });
    
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    confirmView.appendChild(actions);
}

// --- ANSICHT: MEINE BUCHUNGEN ---
function renderBookings() {
    bookingsView.innerHTML = "";
    document.querySelector(".app-title").textContent = "Meine Buchungen";
    cleanupBookings();
    
    // Filtert nur Buchungen des aktuellen Nutzers
    const all = readBookings().filter(b => b.userId === currentUserId);
    
    if (all.length === 0) {
        const empty = document.createElement("div");
        empty.className = "row-status";
        empty.style.textAlign = "center";
        empty.style.padding = "40px 20px";
        empty.style.color = "#888";
        empty.innerHTML = "<div style='font-size:32px; margin-bottom:16px'>📭</div><div>Keine Buchungen vorhanden</div>";
        bookingsView.appendChild(empty);
        return;
    }

    // Sortierung & Aufteilung
    const upcoming = all.filter(b => b.status === 'planned' || b.status === 'running')
        .sort((a, b) => dtFrom(a.date, a.startTime) - dtFrom(b.date, b.startTime));
    
    const history = all.filter(b => b.status === 'finished' || b.status === 'canceled')
        .sort((a, b) => dtFrom(b.date, b.startTime) - dtFrom(a.date, a.startTime)); // Neueste zuerst

    // Helper zum Rendern
    const renderList = (bookings, container) => {
        bookings.forEach(b => {
            const row = document.createElement("div");
            row.className = "row";
            
            const left = document.createElement("div");
            const d = new Date(b.date);
            left.innerHTML = '<div>' + formatDateCell(d) + ', ' + b.startTime + '–' + b.endTime + '</div><small>' + (machines.find(x => x.id === b.machineId).name) + '</small>';
            
            const right = document.createElement("div");
            right.style.display = "flex";
            right.style.flexDirection = "column";
            right.style.alignItems = "flex-end";
            right.style.gap = "8px";

            const statusClass = (b.status === "planned" ? "planned" : b.status === "running" ? "running" : b.status === "finished" ? "finished" : "canceled");
            const badge = document.createElement("span");
            badge.className = "badge " + statusClass;
            badge.textContent = statusLabel(b.status);
            right.appendChild(badge);
            
            // Button "Stornieren" nur anzeigen, wenn geplant
            if (b.status === "planned") {
                const btn = document.createElement("button");
                btn.className = "btn danger";
                btn.textContent = "Stornieren";
                btn.style.fontSize = "12px";
                btn.style.padding = "4px 8px";
                
                const can = canCancel(b);
                if (can) {
                    btn.addEventListener("click", () => {
                        openCancelModal(b.id);
                    });
                } else {
                    btn.disabled = true;
                    btn.style.opacity = "0.5";
                    btn.title = "Stornierung nicht mehr möglich (weniger als " + config.cancelCutoffMinutes + " Min. vor Start).";
                }
                right.appendChild(btn);
            }
            
            row.appendChild(left);
            row.appendChild(right);
            container.appendChild(row);
        });
    };

    // Section: Geplant
    if (upcoming.length > 0) {
        const h = document.createElement("h3");
        h.textContent = "Geplant";
        h.style.margin = "16px 16px 8px 16px";
        h.style.fontSize = "14px";
        h.style.color = "#666";
        h.style.textTransform = "uppercase";
        h.style.letterSpacing = "0.5px";
        bookingsView.appendChild(h);

        const list = document.createElement("div");
        list.className = "list";
        renderList(upcoming, list);
        bookingsView.appendChild(list);
    }

    // Section: Vergangen / Storniert
    if (history.length > 0) {
        const h = document.createElement("h3");
        h.textContent = "Vergangen / Storniert";
        h.style.margin = "32px 16px 8px 16px";
        h.style.fontSize = "14px";
        h.style.color = "#666";
        h.style.textTransform = "uppercase";
        h.style.letterSpacing = "0.5px";
        bookingsView.appendChild(h);

        const list = document.createElement("div");
        list.className = "list";
        list.style.opacity = "0.8"; // Etwas ausgegraut
        renderList(history, list);
        bookingsView.appendChild(list);
    }
}

// --- ANSICHT: MONITOR (ADMIN) ---
function renderMonitor() {
    const view = document.getElementById("monitorView");
    view.innerHTML = "";
    document.querySelector(".app-title").textContent = "Monitor";
    cleanupBookings();

    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = '<span class="chip"><span class="dot available"></span>Verfügbar</span><span class="chip"><span class="dot booked"></span>Belegt</span><span class="chip"><span class="dot locked"></span>Gesperrt</span>';
    view.appendChild(legend);

    const grid = document.createElement("div");
    grid.className = "monitor-grid";

    const totals = { available: 0, locked: 0, booked: 0 };
    machines.forEach(m => {
        const now = getNow();
        const today = dateISO(now);
        timeSlots.forEach(ts => {
            const st = getSlotState(m.id, today, ts.start);
            if (st === "available") totals.available++;
            else if (st === "locked") totals.locked++;
            else totals.booked++;
        });
    });

    const counters = document.createElement("div");
    counters.className = "legend";
    counters.innerHTML = '<span class="chip"><span class="dot available"></span>Verfügbar: ' + totals.available + '</span><span class="chip"><span class="dot booked"></span>Belegt: ' + totals.booked + '</span><span class="chip"><span class="dot locked"></span>Gesperrt: ' + totals.locked + '</span>';
    view.appendChild(counters);

    machines.forEach(m => {
        const today = dateISO(getNow());
        const slotsToday = timeSlots.map(ts => ({ ts, st: getSlotState(m.id, today, ts.start) }));

        const card = document.createElement("div");
        card.className = "card monitor-card";

        const title = document.createElement("div");
        title.className = "card-title";
        title.textContent = m.name;
        card.appendChild(title);

        const subtitle = document.createElement("div");
        subtitle.className = "card-sub";
        const bookedToday = slotsToday.filter(x => x.st === "booked");
        if (bookedToday.length > 0) {
            const s = bookedToday[0].ts;
            subtitle.textContent = "Heute: " + labelSlot(s) + " → BOOKED";
        } else {
            subtitle.textContent = "Heute keiner";
        }
        card.appendChild(subtitle);

        const list = document.createElement("div");
        list.className = "monitor-slot-list";

        slotsToday.forEach(({ ts, st }) => {
            const row = document.createElement("div");
            row.className = "monitor-slot-row " + st;
            const statusLabel = st === "available" ? "AVAILABLE" : st === "locked" ? "LOCKED" : "BOOKED";
            row.textContent = today + " " + ts.start + "–" + ts.end + " → " + statusLabel;
            list.appendChild(row);
        });

        card.appendChild(list);
        grid.appendChild(card);
    });

    view.appendChild(grid);

    const reset = document.createElement("button");
    reset.className = "btn";
    reset.textContent = "Demo zurücksetzen";
    reset.addEventListener("click", () => { resetDemoData(); renderMonitor(); });
    view.appendChild(reset);
    
    // --- EVENT LOG ---
    const logHeader = document.createElement("div");
    logHeader.className = "grid-header";
    const logTitle = document.createElement("div");
    logTitle.textContent = "Event Log";
    const logActions = document.createElement("div");
    const importantBtn = document.createElement("button");
    importantBtn.className = "btn";
    importantBtn.textContent = "Nur wichtige Events";
    importantBtn.addEventListener("click", () => { state.monitorImportantOnly = !state.monitorImportantOnly; renderMonitor(); });
    logActions.appendChild(importantBtn);
    logHeader.appendChild(logTitle);
    logHeader.appendChild(logActions);
    view.appendChild(logHeader);
    
    const logs = document.createElement("div");
    logs.className = "list";
    const raw = localStorage.getItem(keyEvents);
    let arr = raw ? JSON.parse(raw) : [];
    
    const importantTypes = ["BOOKING_CREATED", "BOOKING_CANCELED", "SLOT_LOCKED", "ERROR"];
    if (state.monitorImportantOnly) arr = arr.filter(e => importantTypes.includes(e.type));
    
    arr.slice().reverse().forEach(e => {
        const row = document.createElement("div");
        row.className = "row";
        
        const t = new Date(e.ts);
        const left = formatDateTime(t);
        const d = e.details || {};
        const mName = (d.machineId ? (machines.find(x => x.id === d.machineId) || { name: d.machineId }).name : "");
        
        let typeClass = e.type === "BOOKING_CREATED" ? "evt-created" : e.type === "BOOKING_CANCELED" ? "evt-canceled" : e.type === "SLOT_LOCKED" ? "evt-locked" : e.type === "ERROR" ? "evt-error" : "evt-info";
        let right = e.type;
        
        if (d.date && d.startTime) {
            const end = formatHM(parseHM(d.startTime) + config.slotDurationMinutes);
            const shortDate = d.date.slice(8, 10) + "." + d.date.slice(5, 7);
            right = e.type + " · " + mName + " · " + shortDate + " · " + d.startTime + "–" + end + (d.id ? " · " + d.id : "");
        }
        
        const leftEl = document.createElement("div");
        leftEl.textContent = left;
        const rightEl = document.createElement("div");
        rightEl.innerHTML = '<span class="evt-badge ' + typeClass + '">' + e.type + '</span> ' + right.replace(e.type, "");
        
        row.appendChild(leftEl);
        row.appendChild(rightEl);
        logs.appendChild(row);
    });
    view.appendChild(logs);
}

// Initialisierung
seedRandomBookings();
migrateBookingsUserId();

// Check for URL params
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("demo")) {
    toggleDemoMode();
}
if (urlParams.has("monitor") || window.location.pathname.endsWith("/monitor")) {
    navigate("monitor");
} else {
    navigate("welcome");
}
// FAB initial badge check (will be hidden if welcome is active)
if (!urlParams.has("monitor") && !window.location.pathname.endsWith("/monitor")) {
    // navigate welcome handles visibility
} else {
    updateFabBadge();
}
