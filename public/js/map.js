/* =============================================================
   FitJo — map view & "near me" distance (progressive enhancement)
   - distanceBadge(g): "· 2.3 km" chip on gym cards (once located)
   - gymDistanceKm(g): straight-line km from the user to a gym
   - requestGeo(onDone, onFail): ask the browser for the location
   - renderMap(list): draw the filtered gyms on a Leaflet/OSM map
   Leaflet is loaded lazily from a CDN the first time the map opens,
   so the list view still works offline and from file://.
   Relies on globals from app.js/auth.js: state, t, esc, toast,
   fmtPrice, monthlyJOD.
   ============================================================= */

/* ---------- distance maths ---------- */
function _fjHaversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = (x) => x * Math.PI / 180;
  const dLat = r(lat2 - lat1), dLng = r(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function gymDistanceKm(g) {
  if (!state.geo || !g || !g.coords) return null;
  return _fjHaversineKm(state.geo.lat, state.geo.lng, g.coords.lat, g.coords.lng);
}
function fmtDistanceKm(km) {
  const v = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  const num = v.toLocaleString(state.lang === "ar" ? "ar-JO" : "en-US");
  return `${num} ${t("km")}`;
}
function distanceBadge(g) {
  const d = gymDistanceKm(g);
  if (d == null) return "";
  return ` <span class="dist-badge">· 📍 ${fmtDistanceKm(d)}</span>`;
}

/* ---------- geolocation ---------- */
function requestGeo(onDone, onFail) {
  if (!navigator.geolocation) { toast(t("geoUnsupported")); if (onFail) onFail(); return; }
  toast(t("locating"));
  navigator.geolocation.getCurrentPosition(
    (pos) => { state.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }; if (onDone) onDone(); },
    () => { toast(t("geoDenied")); if (onFail) onFail(); },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ---------- Leaflet (lazy CDN load) ---------- */
let _fjMap = null, _fjMarkers = [], _fjUserMarker = null, _fjLeaflet = null;
function ensureLeaflet(cb) {
  if (window.L) return cb();
  if (_fjLeaflet) return _fjLeaflet.then(cb);
  _fjLeaflet = new Promise((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => resolve();
    s.onerror = () => resolve();   // resolve either way; renderMap checks window.L
    document.head.appendChild(s);
  });
  _fjLeaflet.then(cb);
}

function renderMap(list) {
  const wrap = document.getElementById("mapWrap");
  if (!wrap) return;
  ensureLeaflet(() => {
    if (!window.L) { wrap.innerHTML = `<div class="map-fallback">🗺️ ${t("mapOffline")}</div>`; return; }
    if (!document.getElementById("map")) wrap.innerHTML = `<div id="map"></div>`;

    if (!_fjMap) {
      _fjMap = L.map("map", { scrollWheelZoom: false }).setView([31.95, 35.91], 12); // Amman
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap contributors",
      }).addTo(_fjMap);
    }

    // redraw gym markers
    _fjMarkers.forEach((m) => _fjMap.removeLayer(m));
    _fjMarkers = [];
    const pts = [];
    (list || []).forEach((g) => {
      if (!g.coords) return;
      const d = gymDistanceKm(g);
      const distTxt = d != null ? ` · ${fmtDistanceKm(d)}` : "";
      const m = L.marker([g.coords.lat, g.coords.lng]).addTo(_fjMap);
      m.bindPopup(
        `<div class="map-pop">
           <b>${esc(g.name[state.lang])}</b>
           <div class="mp-area">📍 ${esc(g.area[state.lang])}${distTxt}</div>
           <div class="mp-price">${fmtPrice(monthlyJOD(g))}<small>${t("perMonth")}</small></div>
           <button class="btn sm-btn" data-open="${g.id}">${t("viewDetails")}</button>
         </div>`
      );
      _fjMarkers.push(m);
      pts.push([g.coords.lat, g.coords.lng]);
    });

    // the user's own location
    if (state.geo) {
      if (_fjUserMarker) _fjMap.removeLayer(_fjUserMarker);
      _fjUserMarker = L.circleMarker([state.geo.lat, state.geo.lng], {
        radius: 8, color: "#2563eb", weight: 3, fillColor: "#3b82f6", fillOpacity: 0.9,
      }).addTo(_fjMap).bindPopup(t("youAreHere"));
      pts.push([state.geo.lat, state.geo.lng]);
    }

    if (pts.length) _fjMap.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    // container may have been display:none while off-screen — fix its size
    setTimeout(() => { if (_fjMap) _fjMap.invalidateSize(); }, 120);
  });
}

function centerOnUser() {
  if (_fjMap && state.geo) _fjMap.setView([state.geo.lat, state.geo.lng], 14);
}
