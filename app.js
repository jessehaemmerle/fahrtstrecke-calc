// ── State ──────────────────────────────────────────────────────
let selectedLocation = null;
let selectedMode     = 'driving-car';
let multiMode        = false;
let timeUnit         = 'min'; // 'min' | 'h'
let markerLayer      = null;
let isoLayers        = [];

// ── Map ────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl: true }).setView([48.2, 16.4], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
    maxZoom: 19
}).addTo(map);

map.on('click', e => setLocation(e.latlng.lat, e.latlng.lng, null));

// ── Location helpers ───────────────────────────────────────────
const startIcon = L.divIcon({
    html: `<div style="
        width:14px;height:14px;border-radius:50%;
        background:#1e40af;border:3px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.35)">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: ''
});

function setLocation(lat, lng, label) {
    selectedLocation = { lat, lng };

    if (markerLayer) map.removeLayer(markerLayer);
    markerLayer = L.marker([lat, lng], { icon: startIcon })
        .bindPopup(label || `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`)
        .addTo(map);

    const locText = label || `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;
    document.getElementById('location-text').textContent = locText;
    document.getElementById('location-badge').classList.add('visible');
    document.getElementById('calc-btn').disabled = false;
}

// ── Geocoding (Nominatim – kein API-Key nötig) ─────────────────
async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'de' } });
    return res.json();
}

function renderDropdown(results) {
    const dd = document.getElementById('search-dropdown');
    dd.innerHTML = '';

    if (!results.length) {
        dd.innerHTML = '<div class="search-result" style="color:#94a3b8">Keine Ergebnisse</div>';
        dd.classList.add('visible');
        return;
    }

    results.forEach(r => {
        const el = document.createElement('div');
        el.className = 'search-result';
        el.textContent = r.display_name;
        el.addEventListener('click', () => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lon);
            setLocation(lat, lng, r.display_name.split(',').slice(0, 2).join(',').trim());
            map.setView([lat, lng], 13);
            document.getElementById('search-input').value = r.display_name.split(',')[0];
            dd.classList.remove('visible');
        });
        dd.appendChild(el);
    });

    dd.classList.add('visible');
}

document.getElementById('search-btn').addEventListener('click', async () => {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    try {
        const res = await geocode(q);
        renderDropdown(res);
    } catch { showStatus('Adresssuche fehlgeschlagen.', 'error'); }
});

document.getElementById('search-input').addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    try {
        const res = await geocode(q);
        if (res.length === 1) {
            const r = res[0];
            setLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0]);
            map.setView([r.lat, r.lon], 13);
            document.getElementById('search-dropdown').classList.remove('visible');
        } else {
            renderDropdown(res);
        }
    } catch { showStatus('Adresssuche fehlgeschlagen.', 'error'); }
});

document.addEventListener('click', e => {
    if (!e.target.closest('#search-input') && !e.target.closest('#search-dropdown')) {
        document.getElementById('search-dropdown').classList.remove('visible');
    }
});

// ── Geolocation ────────────────────────────────────────────────
document.getElementById('geo-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
        showStatus('Geolocation wird nicht unterstützt.', 'error');
        return;
    }
    showStatus('Standort wird ermittelt …', 'loading');
    navigator.geolocation.getCurrentPosition(
        pos => {
            clearStatus();
            setLocation(pos.coords.latitude, pos.coords.longitude, 'Mein Standort');
            map.setView([pos.coords.latitude, pos.coords.longitude], 13);
        },
        () => showStatus('Standort konnte nicht ermittelt werden.', 'error')
    );
});

// ── Transport mode ─────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMode = btn.dataset.mode;
    });
});

// ── Unit toggle ────────────────────────────────────────────────
document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const input = document.getElementById('time-input');
        const prev  = parseInt(input.value) || 0;
        if (btn.dataset.unit === 'h') {
            input.max   = 48;
            input.value = Math.max(1, Math.round(prev / 60)) || 1;
        } else {
            input.max   = 999;
            input.value = Math.min(999, prev * 60) || 30;
        }
        timeUnit = btn.dataset.unit;
    });
});

// ── Multi-toggle ───────────────────────────────────────────────
document.getElementById('toggle-row').addEventListener('click', () => {
    multiMode = !multiMode;
    document.getElementById('multi-toggle').classList.toggle('on', multiMode);
    document.getElementById('sub-settings').classList.toggle('visible', multiMode);
});

// ── Status ─────────────────────────────────────────────────────
function showStatus(msg, type = 'loading') {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className   = `status visible ${type}`;
}

function clearStatus() {
    const el = document.getElementById('status');
    el.className   = 'status';
    el.textContent = '';
}

// ── Color helper ───────────────────────────────────────────────
// Features arrive sorted largest→smallest (outermost first).
// index 0 = farthest ring → cool blue; last index = closest → warm green.
function isoColor(index, total) {
    const t   = total > 1 ? index / (total - 1) : 0;
    const hue = Math.round(220 - t * 90);
    return `hsl(${hue}, 72%, 48%)`;
}

// ── Valhalla costing map ───────────────────────────────────────
const COSTING = {
    'driving-car':     'auto',
    'cycling-regular': 'bicycle',
    'foot-walking':    'pedestrian'
};

// ── Isochrone calculation (Valhalla – kein API-Key nötig) ──────
async function calculate() {
    if (!selectedLocation) { showStatus('Bitte Startpunkt wählen.', 'error'); return; }

    const rawVal = parseInt(document.getElementById('time-input').value);
    if (!rawVal || rawVal < 1) { showStatus('Ungültige Reisezeit.', 'error'); return; }
    const maxMin = timeUnit === 'h' ? rawVal * 60 : rawVal;

    let contours;
    if (multiMode) {
        const step = parseInt(document.getElementById('step-input').value) || 15;
        const times = [];
        for (let t = step; t < maxMin; t += step) times.push(t);
        times.push(maxMin);
        if (times.length > 5) {
            const kept = [times[0]];
            const stride = (times.length - 1) / 4;
            for (let i = 1; i < 4; i++) kept.push(times[Math.round(i * stride)]);
            kept.push(times[times.length - 1]);
            contours = [...new Set(kept)].sort((a, b) => a - b).map(t => ({ time: t }));
        } else {
            contours = times.map(t => ({ time: t }));
        }
    } else {
        contours = [{ time: maxMin }];
    }

    const btn = document.getElementById('calc-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Berechne …';
    showStatus('Anfrage wird gesendet …', 'loading');

    try {
        const res = await fetch('https://valhalla1.openstreetmap.de/isochrone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                locations:  [{ lat: selectedLocation.lat, lon: selectedLocation.lng }],
                costing:    COSTING[selectedMode] || 'auto',
                contours:   contours,
                polygons:   true,
                denoise:    0.5,
                generalize: 150
            })
        });

        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try { const j = await res.json(); msg = j.error || msg; } catch {}
            throw new Error(msg);
        }

        const geojson = await res.json();
        renderIsochrones(geojson);
        showStatus(`Berechnung abgeschlossen (${contours.length} Ring${contours.length > 1 ? 'e' : ''}).`, 'success');

    } catch (e) {
        showStatus(`Fehler: ${e.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Isochrone berechnen';
    }
}

function renderIsochrones(geojson) {
    isoLayers.forEach(l => map.removeLayer(l));
    isoLayers = [];

    const features = [...geojson.features].sort(
        (a, b) => b.properties.contour - a.properties.contour
    );

    features.forEach((feat, idx) => {
        const color = isoColor(idx, features.length);
        const layer = L.geoJSON(feat, {
            style: {
                fillColor:   color,
                fillOpacity: 0.22,
                color:       color,
                weight:      2,
                opacity:     0.85
            }
        });

        layer.bindPopup(`<strong>${feat.properties.contour} Minuten</strong>`);
        layer.addTo(map);
        isoLayers.push(layer);
    });

    if (isoLayers.length) {
        map.fitBounds(L.featureGroup(isoLayers).getBounds(), { padding: [30, 30] });
    }

    renderLegend(features);
}

function renderLegend(features) {
    const section = document.getElementById('legend-section');
    const content = document.getElementById('legend-content');
    section.style.display = 'block';

    const sorted = [...features].sort((a, b) => a.properties.contour - b.properties.contour);
    const total  = features.length;

    content.innerHTML = sorted.map((feat, sortedIdx) => {
        const color = isoColor(total - 1 - sortedIdx, total);
        return `<div class="legend-item">
            <div class="legend-swatch" style="background:${color}"></div>
            <span class="legend-label">bis ${feat.properties.contour} Minuten</span>
        </div>`;
    }).join('');
}

// ── Clear ──────────────────────────────────────────────────────
document.getElementById('clear-btn').addEventListener('click', () => {
    isoLayers.forEach(l => map.removeLayer(l));
    isoLayers = [];
    document.getElementById('legend-section').style.display = 'none';
    clearStatus();
});

// ── Calculate button ───────────────────────────────────────────
document.getElementById('calc-btn').addEventListener('click', calculate);
