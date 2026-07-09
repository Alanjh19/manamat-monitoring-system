// FLEET.JS - Gestión del inventario de vehículos, estados y renderizadores
// Controla las camionetas y tráileres de la flota de Materiales MANAMAT.

const LIMIT_CARGA_CAMION = 5.0; // Toneladas

/**
 * Retorna la flota de camiones cargada desde demoData.
 */
function getFlota() {
    return flota;
}

/**
 * Busca una unidad específica por su identificador.
 */
function findVehiculoById(id) {
    return flota.find(u => u.id === id);
}

/**
 * Asigna la carga útil, destino y cambia el estado del flete a pendiente de aceptación.
 */
function assignOrder(unitId, destinationName, coords) {
    const unit = findVehiculoById(unitId);
    if (!unit) return null;

    unit.materiales = [
        { nombre: "Varilla de Acero 3/8", cantidad: `${cargaPreviaDispatch.varillas} piezas`, peso: cargaPreviaDispatch.varillas * 0.012 },
        { nombre: "Block de Concreto 12x20x40", cantidad: `${cargaPreviaDispatch.blocks} piezas`, peso: cargaPreviaDispatch.blocks * 0.0055 },
        { nombre: "Sacos de Cemento Gris", cantidad: `${cargaPreviaDispatch.cemento} bultos`, peso: cargaPreviaDispatch.cemento * 0.05 }
    ];

    unit.nombreDestino = destinationName;
    unit.coordsDestino = coords;
    unit.estado = "invitacion_pendiente";
    
    return unit;
}

/**
 * Trazador de rutas terrestre utilizando la API OSRM para una unidad.
 */
async function traceUnitRoute(unit, lat, lng, destinationName, isDemoMode = false) {
    unit.coordsDestino = [lat, lng];
    unit.nombreDestino = destinationName;
    unit.idxCoordenada = 0;

    // Limpiar capas previas
    if (unit.routeLineRemaining) map.removeLayer(unit.routeLineRemaining);
    if (unit.routeLineTraveled) map.removeLayer(unit.routeLineTraveled);
    if (unit.geofenceCircle) map.removeLayer(unit.geofenceCircle);

    // Trazar geocerca en el mapa principal
    unit.geofenceCircle = L.circle([lat, lng], {
        color: unit.color,
        fillColor: unit.color,
        fillOpacity: 0.03,
        radius: radioGeocerca,
        weight: 1,
        dashArray: '3, 3'
    }).addTo(map);

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsPlanta[1]},${coordsPlanta[0]};${lng},${lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
                unit.coordenadasRuta = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            }
        }
    } catch (err) {
        console.warn(`Modo offline para flete de ${unit.id}. Dibujando interpolacion lineal.`);
    }

    // Fallback de interpolación lineal si OSRM falla
    if (!unit.coordenadasRuta || unit.coordenadasRuta.length === 0) {
        const interpolatedPoints = [];
        const steps = 30; 
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const latPt = coordsPlanta[0] + (lat - coordsPlanta[0]) * t;
            const lngPt = coordsPlanta[1] + (lng - coordsPlanta[1]) * t;
            interpolatedPoints.push([latPt, lngPt]);
        }
        unit.coordenadasRuta = interpolatedPoints;
    }

    // Dibujar polilíneas
    unit.routeLineRemaining = L.polyline(unit.coordenadasRuta, {
        color: unit.color,
        weight: 5,
        opacity: 0.85
    }).addTo(map);

    unit.routeLineTraveled = L.polyline([coordsPlanta], {
        color: '#94a3b8',
        weight: 3,
        opacity: 0.5,
        dashArray: '5, 5'
    }).addTo(map);

    // Ajustar mapa si no es demo inicial
    if (!isDemoMode && unit.id === selectedUnitId) {
        map.fitBounds(unit.routeLineRemaining.getBounds(), { padding: [50, 50] });
    }
}

/**
 * Inicializa la flota demo con los recorridos y tareas activas precargadas.
 */
async function initFlotaDemo() {
    // UN-01: En ruta a Palmas (Norte)
    flota[0].estado = "en_ruta";
    flota[0].materiales = [
        { nombre: "Varilla de Acero 3/8", cantidad: "150 piezas", peso: 1.8 },
        { nombre: "Block de Concreto 12x20x40", cantidad: "200 piezas", peso: 1.1 }
    ];
    flota[0].cronometroInicio = Date.now();
    flota[0].elapsedSeconds = 120;
    await traceUnitRoute(flota[0], destinosPredefinidos["Residencial Palmas"][0], destinosPredefinidos["Residencial Palmas"][1], "Residencial Palmas", true);

    // UN-02: Descargando en Tabasco 2000
    flota[1].estado = "descargando_proceso";
    flota[1].materiales = [
        { nombre: "Sacos de Cemento Gris", cantidad: "60 bultos", peso: 3.0 }
    ];
    flota[1].fotoCapturada = true;
    await traceUnitRoute(flota[1], destinosPredefinidos["Oxxo Tabasco 2000"][0], destinosPredefinidos["Oxxo Tabasco 2000"][1], "Oxxo Tabasco 2000", true);

    // UN-03: Retornando de Ixtacomitán
    flota[2].estado = "retorno";
    flota[2].cronometroInicio = Date.now();
    flota[2].elapsedSeconds = 85;
    await traceUnitRoute(flota[2], destinosPredefinidos["Obra Ixtacomitán"][0], destinosPredefinidos["Obra Ixtacomitán"][1], "Obra Ixtacomitán", true);

    // UN-04: Listo en Patio
    flota[3].estado = "cargando_completo";
    flota[3].materiales = [
        { nombre: "Block de Concreto 12x20x40", cantidad: "300 piezas", peso: 1.65 }
    ];
    flota[3].nombreDestino = "Distribuidora Centro";
    flota[3].coordsDestino = destinosPredefinidos["Distribuidora Centro"];

    // UN-05: Cargando
    flota[4].estado = "cargando";
    flota[4].materiales = [
        { nombre: "Varilla de Acero 3/8", cantidad: "300 piezas", peso: 3.6 }
    ];

    // TR-01: Tráiler en ruta a Bodega Sendero
    flota[5].estado = "en_ruta";
    flota[5].materiales = [
        { nombre: "Varilla de Acero 3/8", cantidad: "400 piezas", peso: 4.8 }
    ];
    flota[5].cronometroInicio = Date.now();
    flota[5].elapsedSeconds = 180;
    await traceUnitRoute(flota[5], destinosPredefinidos["Bodega Sendero"][0], destinosPredefinidos["Bodega Sendero"][1], "Bodega Sendero", true);

    // TR-02: Disponible en Planta
    flota[6].estado = "esperando_orden";

    // Actualizar UI completa
    updateOptionsSelects();
    renderFleetList();
    updateSupervisorMetricsCard();
    updateMapLayersVisibility();
}

/**
 * Renderiza el bloque SVG correspondiente al camión (camioneta o tráiler).
 */
function getCustomTruckSVG(color, tipo) {
    if (tipo === "trailer") {
        return `
            <svg viewBox="0 0 80 64" width="54" height="44" style="overflow: visible; display: block;">
                <ellipse cx="40" cy="48" rx="30" ry="7" fill="rgba(15,23,42,0.18)" />
                <path d="M6 40 l64 -4 l0 6 l-64 4 z" fill="#1e293b" />
                <g fill="#0f172a">
                    <ellipse cx="14" cy="43" rx="5.5" ry="4.5" />
                    <ellipse cx="20" cy="42" rx="5.5" ry="4.5" />
                    <ellipse cx="28" cy="41" rx="5.5" ry="4.5" />
                    <ellipse cx="34" cy="40" rx="5.5" ry="4.5" />
                    <ellipse cx="62" cy="38" rx="5" ry="4" />
                </g>
                <path d="M8 32 l42 -3 l0 7 l-42 3 z" fill="#475569" stroke="#334155" stroke-width="0.5" />
                <path d="M2 28 l54 -5" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" />
                <path d="M4 30 l54 -5" stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
                <path d="M1 26 l54 -5" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" />
                <defs>
                    <linearGradient id="cabGrad-${color.replace("#", "")}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" />
                        <stop offset="45%" stop-color="#ffffff" />
                        <stop offset="85%" stop-color="${color}" />
                        <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                </defs>
                <path d="M52 26 l14 -2 l4 6 l-1 12 l-17 1 z" fill="url(#cabGrad-${color.replace("#", "")})" stroke="#334155" stroke-width="0.5" />
                <path d="M59 26.5 l6 -1 l2 4.5 l-8 1.2 z" fill="#38bdf8" opacity="0.9" />
                <path d="M53 18 l9 -2.5 l3 6.5 l-12 1 z" fill="${color}" opacity="0.8" />
            </svg>
        `;
    } else {
        return `
            <svg viewBox="0 0 64 64" width="42" height="42" style="overflow: visible; display: block;">
                <ellipse cx="32" cy="48" rx="20" ry="6" fill="rgba(15,23,42,0.18)" />
                <path d="M12 40 l40 -4 l0 5 l-40 4 z" fill="#1e293b" />
                <g fill="#0f172a">
                    <ellipse cx="20" cy="43" rx="5" ry="4" />
                    <ellipse cx="26" cy="42" rx="5" ry="4" />
                    <ellipse cx="46" cy="39" rx="4.5" ry="3.5" />
                </g>
                <path d="M14 34 l26 -3 l0 6 l-26 3 z" fill="#78350f" stroke="#451a03" stroke-width="0.5" />
                <path d="M16 28 l12 -1 l0 6 l-12 1 z" fill="#94a3b8" stroke="#475569" stroke-width="0.5" />
                <path d="M25 29 l10 -1 l0 5 l-10 1 z" fill="#d97706" stroke="#b45309" stroke-width="0.5" />
                <defs>
                    <linearGradient id="cabineGrad-${color.replace("#", "")}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" />
                        <stop offset="40%" stop-color="#ffffff" />
                        <stop offset="80%" stop-color="${color}" />
                        <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                </defs>
                <path d="M38 28 l12 -1.5 l3.5 5.5 l-1 8 l-12.5 1 z" fill="url(#cabineGrad-${color.replace("#", "")})" stroke="#475569" stroke-width="0.5" />
                <path d="M43 28.5 l4 -0.8 l2.2 4.2 l-6.2 0.8 z" fill="#38bdf8" opacity="0.9" />
                <path d="M39 30.5 l3 -0.5 l0 4 l-3 0.5 z" fill="#1e293b" opacity="0.85" />
            </svg>
        `;
    }
}
