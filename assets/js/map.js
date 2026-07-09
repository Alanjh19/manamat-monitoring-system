// MAP.JS - Módulo encargado de gestionar Leaflet y dibujar capas cartográficas
// Maneja el mapa principal de administración y la simbología en pantalla.

let map = null;
let markerPlanta = null;
let markerObra = null;
let geofenceCircle = null;
let previewRouteLine = null;

let clientMap = null;
let clientMarker = null;
let clientRouteLineRemaining = null;
let clientRouteLineTraveled = null;
let clientGeofenceCircle = null;

/**
 * Inicializa el mapa principal del supervisor y posiciona la Planta Central.
 */
function initMainMap() {
    map = L.map("map", { zoomControl: false }).setView(coordsPlanta, 13);
    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const iconPlanta = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="map-icon-container" style="border-left: 3px solid #64748b;"><span>🏢 Planta Central</span></div>`,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
    });
    markerPlanta = L.marker(coordsPlanta, { icon: iconPlanta }).addTo(map);
}

/**
 * Coloca o actualiza el marcador dinámico de obra y dibuja el área de geocerca de 150m.
 */
async function setObraMarker(lat, lng, name) {
    coordsDestinoActual = [lat, lng];
    nombreDestinoActual = name;

    if (markerObra) map.removeLayer(markerObra);
    if (geofenceCircle) map.removeLayer(geofenceCircle);
    if (previewRouteLine) map.removeLayer(previewRouteLine);

    const iconObra = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="map-icon-container" style="border-left: 3px solid #22c55e; border-radius: 8px;"><span>📍 ${name}</span></div>`,
        iconSize: [140, 26],
        iconAnchor: [70, 13]
    });

    markerObra = L.marker(coordsDestinoActual, { icon: iconObra, draggable: true }).addTo(map);

    geofenceCircle = L.circle(coordsDestinoActual, {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.05,
        radius: radioGeocerca,
        weight: 1,
        dashArray: '3, 3'
    }).addTo(map);

    markerObra.bindPopup(`
        <div style="font-family:var(--font-body);font-size:0.75rem;line-height:1.4;">
            <b style="color:#22c55e;">Ubicacion de Obra</b><br>
            <b>Sitio:</b> ${name}<br>
            <span style="font-weight:700;color:#3b82f6;display:block;margin-top:4px;">Arrastra el marcador para re-ubicar</span>
        </div>
    `);

    markerObra.on("dragend", (e) => {
        const pos = e.target.getLatLng();
        setObraMarker(pos.lat, pos.lng, "Ubicacion Manual");
        const searchInput = document.getElementById("search-input");
        if (searchInput) searchInput.value = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    });

    // Trazar línea preliminar gris de despacho
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsPlanta[1]},${coordsPlanta[0]};${lng},${lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                const pts = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                previewRouteLine = L.polyline(pts, {
                    color: '#64748b',
                    weight: 4,
                    opacity: 0.4,
                    dashArray: '4, 6'
                }).addTo(map);
            }
        }
    } catch(err) {
        // Fallback lineal si está offline
        previewRouteLine = L.polyline([coordsPlanta, [lat, lng]], {
            color: '#64748b',
            weight: 4,
            opacity: 0.4,
            dashArray: '4, 6'
        }).addTo(map);
    }
}

/**
 * Modifica la visibilidad de los recorridos del mapa general según el modo seleccionado.
 */
function updateMapLayersVisibility() {
    flota.forEach(unit => {
        if (viewMode === "general") {
            if (unit.marker) {
                if (!map.hasLayer(unit.marker)) unit.marker.addTo(map);
            }
            if (unit.routeLineRemaining) {
                if (!map.hasLayer(unit.routeLineRemaining)) unit.routeLineRemaining.addTo(map);
            }
            if (unit.routeLineTraveled) {
                if (!map.hasLayer(unit.routeLineTraveled)) unit.routeLineTraveled.addTo(map);
            }
            if (unit.geofenceCircle) {
                if (!map.hasLayer(unit.geofenceCircle)) unit.geofenceCircle.addTo(map);
            }
        } else {
            // Focused mode: ocultar todos menos el seleccionado
            const isSelected = unit.id === selectedUnitId;
            if (unit.marker) {
                if (isSelected) {
                    if (!map.hasLayer(unit.marker)) unit.marker.addTo(map);
                } else {
                    if (map.hasLayer(unit.marker)) map.removeLayer(unit.marker);
                }
            }
            if (unit.routeLineRemaining) {
                if (isSelected) {
                    if (!map.hasLayer(unit.routeLineRemaining)) unit.routeLineRemaining.addTo(map);
                } else {
                    if (map.hasLayer(unit.routeLineRemaining)) map.removeLayer(unit.routeLineRemaining);
                }
            }
            if (unit.routeLineTraveled) {
                if (isSelected) {
                    if (!map.hasLayer(unit.routeLineTraveled)) unit.routeLineTraveled.addTo(map);
                } else {
                    if (map.hasLayer(unit.routeLineTraveled)) map.removeLayer(unit.routeLineTraveled);
                }
            }
            if (unit.geofenceCircle) {
                if (isSelected) {
                    if (!map.hasLayer(unit.geofenceCircle)) unit.geofenceCircle.addTo(map);
                } else {
                    if (map.hasLayer(unit.geofenceCircle)) map.removeLayer(unit.geofenceCircle);
                }
            }
        }
    });
}
