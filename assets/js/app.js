// APP.JS - Inicialización del sistema, bucle de simulación global y controladores de eventos principales
// Orquesta los módulos de Leaflet, lógica de fletes, despacho e interfaz de usuario.

const flota = flotaInicial; // Asignar la flota importada de demoData

// Variables para historial de rutas visualizadas en mapa
let historicPolyline = null;
let historicMarkerDestino = null;

document.addEventListener("DOMContentLoaded", () => {
    initMainMap();
    configurarBuscador();
    registerSupervisorEvents();
    registerDriverEvents();
    updateOptionsSelects();
    renderFleetList();
    startGlobalSimulationLoop();

    // Carga inicial de destino preview
    seleccionarUbicacionPredefinida(nombreDestinoActual, coordsDestinoActual[0], coordsDestinoActual[1]);

    // Inicializar fletes activos para el ejemplo visual de las 7 unidades
    initFlotaDemo();

    registerEvent("Sistema logistico UMAEE iniciado. Flota de 7 unidades activa.");
});

// ─── GEOCREADOR CONFIGURACIÓN SUGERENCIAS ───
function configurarBuscador() {
    const input = document.getElementById("search-input");
    const suggestions = document.getElementById("search-suggestions");
    if (!input || !suggestions) return;

    input.addEventListener("input", debounce(async (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length < 3) {
            suggestions.style.display = "none";
            return;
        }

        suggestions.innerHTML = "";
        let matches = [];

        Object.keys(destinosPredefinidos).forEach(key => {
            if (key.toLowerCase().includes(query)) {
                matches.push({
                    display_name: `${key}, Villahermosa, Tabasco`,
                    lat: destinosPredefinidos[key][0],
                    lon: destinosPredefinidos[key][1]
                });
            }
        });

        try {
            const cleanQuery = query.replace(/\b(86153|c\.p\.|seccion|secc)\b/gi, '').trim();
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ", Villahermosa, Tabasco")}&limit=3`;
            const res = await fetch(url, { headers: { 'User-Agent': 'ManamatLogistics/2.5' } });
            if (res.ok) {
                const data = await res.json();
                data.forEach(item => {
                    matches.push({
                        display_name: item.display_name,
                        lat: parseFloat(item.lat),
                        lon: parseFloat(item.lon)
                    });
                });
            }
        } catch (err) {
            console.warn("Error geocodificacion OSM.");
        }

        if (matches.length > 0) {
            matches.forEach(match => {
                const div = document.createElement("div");
                div.className = "suggestion-item";
                div.innerText = match.display_name;
                div.addEventListener("click", () => {
                    input.value = match.display_name;
                    suggestions.style.display = "none";
                    setObraMarker(match.lat, match.lon, match.display_name.split(",")[0]);
                });
                suggestions.appendChild(div);
            });
            suggestions.style.display = "block";
        } else {
            suggestions.style.display = "none";
        }
    }, 800));

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-container")) {
            suggestions.style.display = "none";
        }
    });
}

// ─── CONTROLADORES DE EVENTOS MÓVILES (DRIVER ACTION EVENTS) ───
function registerDriverEvents() {
    // Cambio de unidad simulada
    const selectCel = document.getElementById("simulated-unit-select");
    if (selectCel) {
        selectCel.addEventListener("change", (e) => {
            selectedUnitId = e.target.value;
            updatePhoneView();
            updateMapLayersVisibility();
            updateSupervisorMetricsCard();
            const unit = findVehiculoById(selectedUnitId);
            if (unit && unit.lat) {
                map.panTo([unit.lat, unit.lon]);
            }
        });
    }

    // Aceptar Despacho
    const btnAccept = document.getElementById("btn-phone-accept") || document.getElementById("btn-accept-invite");
    if (btnAccept) {
        btnAccept.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "invitacion_pendiente") return;
            unit.estado = "aceptado";
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "ACEPTADO");
            renderFleetList();
            registerEvent(`Chofer ${unit.operador} acepto el despacho.`);
        });
    }

    // Rechazar Despacho
    const btnReject = document.getElementById("btn-phone-reject");
    if (btnReject) {
        btnReject.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "invitacion_pendiente") return;
            unit.estado = "esperando_orden";
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "DISPONIBLE");
            updateOptionsSelects();
            renderFleetList();
            registerEvent(`Chofer ${unit.operador} rechazo el despacho.`);
        });
    }

    // Iniciar Carga de Materiales
    const btnCargar = document.getElementById("btn-iniciar-carga");
    if (btnCargar) {
        btnCargar.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "aceptado") return;
            unit.estado = "cargando";
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "CARGANDO");
            renderFleetList();
            registerEvent(`Iniciando carga de materiales para la unidad ${unit.id} en patio.`);
            setTimeout(() => {
                if (unit.estado === "cargando") {
                    unit.estado = "cargando_completo";
                    updatePhoneView();
                    updateVehiculoStatusBadge(unit, "LISTO");
                    renderFleetList();
                    registerEvent(`Carga de materiales finalizada para la unidad ${unit.id}.`);
                }
            }, 3000);
        });
    }

    // Salida a Obra (Iniciar Tránsito)
    const btnSalir = document.getElementById("btn-salida-obra");
    if (btnSalir) {
        btnSalir.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "cargando_completo") return;
            unit.estado = "en_ruta";
            unit.idxCoordenada = 0;
            unit.fotoCapturada = false;
            unit.damagedCount = 0;
            unit.elapsedSeconds = 0;
            unit.cronometroInicio = Date.now();
            traceUnitRoute(unit, unit.coordsDestino[0], unit.coordsDestino[1], unit.nombreDestino);
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "EN RUTA");
            renderFleetList();
            updateSupervisorMetricsCard();
            registerEvent(`Unidad ${unit.id} salio de patio central rumbo a ${unit.nombreDestino}.`);
        });
    }

    // Iniciar Descarga de Materiales
    const btnDescargar = document.getElementById("btn-iniciar-descarga");
    if (btnDescargar) {
        btnDescargar.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "en_obra") return;
            unit.estado = "descargando_proceso";
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "DESCARGA");
            renderFleetList();
            registerEvent(`Unidad ${unit.id} inicio maniobra de descarga en obra.`);
        });
    }

    // Registrar Foto de Evidencia
    const btnCapture = document.getElementById("btn-phone-capture");
    if (btnCapture) {
        btnCapture.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "descargando_proceso") return;
            unit.fotoCapturada = true;
            const preview = document.getElementById("phone-captured-preview");
            if (preview) {
                preview.style.display = "block";
                preview.innerHTML = `
                    <div style="position:relative; width:100%; height:120px; border-radius:6px; overflow:hidden;">
                        <svg viewBox="0 0 100 60" style="width:100%; height:100%; display:block; background:#0f172a;">
                            <rect x="0" y="0" width="100" height="60" fill="#1e293b" />
                            <path d="M20 50 l30 -25 l15 12 l20 -20 l15 15 l0 18 z" fill="#22c55e" opacity="0.3"/>
                            <circle cx="75" cy="20" r="5" fill="#f59e0b" opacity="0.8"/>
                            <text x="50" y="45" font-size="5" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">EVIDENCIA REGISTRADA</text>
                        </svg>
                    </div>
                `;
            }
            updatePhoneView();
            registerEvent(`Chofer de unidad ${unit.id} capturo fotografia de evidencia.`);
        });
    }

    // Confirmar Entrega
    const btnEntregar = document.getElementById("btn-confirmar-entrega");
    if (btnEntregar) {
        btnEntregar.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "descargando_proceso") return;
            if (!unit.fotoCapturada) {
                alert("Captura la foto de evidencia primero.");
                return;
            }
            unit.estado = "completado";
            const damagedInput = document.getElementById("phone-damaged-count");
            unit.damagedCount = parseInt(damagedInput ? damagedInput.value : 0) || 0;
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "ENTREGADO");
            renderFleetList();
            const supPodQty = document.getElementById("pod-damaged-qty");
            const supPodPhoto = document.getElementById("pod-photo-container");
            const supPodCard = document.getElementById("supervisor-pod-card");
            const phonePreview = document.getElementById("phone-captured-preview");
            if (supPodQty) supPodQty.innerText = unit.damagedCount;
            if (supPodPhoto && phonePreview) supPodPhoto.innerHTML = phonePreview.innerHTML;
            if (supPodCard) supPodCard.style.display = "block";
            registerEvent(`Entrega certificada de ${unit.id}. Material defectuoso: ${unit.damagedCount} piezas.`);
        });
    }

    // Iniciar Retorno a Planta
    const btnRetornar = document.getElementById("btn-iniciar-retorno");
    if (btnRetornar) {
        btnRetornar.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit || unit.estado !== "completado") return;
            unit.estado = "retorno";
            unit.idxCoordenada = unit.coordenadasRuta.length - 1;
            unit.fotoCapturada = false;
            unit.damagedCount = 0;
            unit.elapsedSeconds = 0;
            unit.cronometroInicio = Date.now();
            const supPodCard = document.getElementById("supervisor-pod-card");
            if (supPodCard) supPodCard.style.display = "none";
            updatePhoneView();
            updateVehiculoStatusBadge(unit, "RETORNO");
            renderFleetList();
            registerEvent(`Unidad ${unit.id} inició viaje de retorno a planta.`);
        });
    }
}

// ─── CONTROLADORES DE EVENTOS DEL SUPERVISOR ───
function registerSupervisorEvents() {
    const btnGeneral = document.getElementById("btn-view-general");
    const btnFocused = document.getElementById("btn-view-focused");

    if (btnGeneral) {
        btnGeneral.addEventListener("click", () => {
            viewMode = "general";
            btnGeneral.style.backgroundColor = "#3b82f6";
            btnGeneral.style.color = "white";
            if (btnFocused) {
                btnFocused.style.backgroundColor = "";
                btnFocused.style.color = "";
            }
            updateMapLayersVisibility();
            registerEvent("Supervisor cambio a Vista General de la Flota.");
        });
    }

    if (btnFocused) {
        btnFocused.addEventListener("click", () => {
            viewMode = "focused";
            btnFocused.style.backgroundColor = "#3b82f6";
            btnFocused.style.color = "white";
            if (btnGeneral) {
                btnGeneral.style.backgroundColor = "";
                btnGeneral.style.color = "";
            }
            updateMapLayersVisibility();
            registerEvent(`Supervisor enfoco la vista en la unidad ${selectedUnitId}.`);
        });
    }

    // Despacho de Pedidos
    const btnDispatch = document.getElementById("btn-dispatch-order");
    if (btnDispatch) {
        btnDispatch.addEventListener("click", () => {
            const unitId = document.getElementById("dispatch-unit-select").value;
            if (!unitId) {
                alert("No hay unidades disponibles para despacho en planta.");
                return;
            }
            const unit = assignOrder(unitId, nombreDestinoActual, coordsDestinoActual);
            if (previewRouteLine) {
                map.removeLayer(previewRouteLine);
                previewRouteLine = null;
            }
            playDispatchNotification();
            const inputsWrapper = document.getElementById("dispatch-inputs-wrapper");
            const badge = document.getElementById("dispatch-success-badge");
            const successUnit = document.getElementById("success-unit-id");
            if (inputsWrapper) inputsWrapper.style.display = "none";
            if (successUnit) successUnit.innerText = unit.id;
            if (badge) badge.style.display = "block";
            updateOptionsSelects();
            updatePhoneView();
            renderFleetList();
            registerEvent(`Supervisor despachó Orden ORD-${unit.id.replace("-", "")}9 a ${nombreDestinoActual} asignada a ${unit.id}.`);
        });
    }

    // Controles Generales
    const btnPausar = document.getElementById("btn-pausar");
    if (btnPausar) {
        btnPausar.addEventListener("click", () => {
            simulacionPausada = !simulacionPausada;
            btnPausar.innerText = simulacionPausada ? "Reanudar" : "Pausar";
            btnPausar.style.backgroundColor = simulacionPausada ? "#22c55e" : "";
            btnPausar.style.color = simulacionPausada ? "white" : "";
            registerEvent(simulacionPausada ? "Supervisor pauso la simulacion." : "Supervisor reanudo la simulacion.");
        });
    }

    const btnFollow = document.getElementById("btn-follow");
    if (btnFollow) {
        btnFollow.addEventListener("click", () => {
            followMode = !followMode;
            btnFollow.style.opacity = followMode ? "1" : "0.5";
        });
    }

    const btnCancelar = document.getElementById("btn-cancelar");
    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (unit && unit.estado !== "esperando_orden") {
                cancelUnitOrder(unit);
                registerEvent(`Supervisor cancelo flete de la unidad ${unit.id}.`);
            }
        });
    }

    // Copiar Log
    const btnCopiarLog = document.getElementById("btn-copiar-log");
    if (btnCopiarLog) {
        btnCopiarLog.addEventListener("click", () => {
            const logs = Array.from(document.querySelectorAll("#event-log .log-entry span:first-child")).map(el => el.innerText).join("\n");
            navigator.clipboard.writeText(logs).then(() => {
                registerEvent("Log copiado al portapapeles.");
            });
        });
    }

    // Simular Tránsito (Obstrucción/Tráfico)
    const btnTrafico = document.getElementById("btn-trafico");
    if (btnTrafico) {
        btnTrafico.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (unit && (unit.estado === "en_ruta" || unit.estado === "retorno")) {
                unit.enTrafico = !unit.enTrafico;
                if (unit.enTrafico) {
                    btnTrafico.style.backgroundColor = "var(--accent-orange)";
                    btnTrafico.style.color = "var(--primary)";
                    btnTrafico.innerText = "Reanudar Transito";
                    unit.velocidadKmh = 0;
                    registerEvent(`Supervisor simulo obstruccion de trafico para la unidad ${unit.id}.`);
                } else {
                    btnTrafico.style.backgroundColor = "";
                    btnTrafico.style.color = "";
                    btnTrafico.innerText = "Simular Trafico";
                    registerEvent(`Supervisor resolvio obstruccion de trafico para la unidad ${unit.id}.`);
                }
                updateSupervisorMetricsCard();
                renderFleetList();
            } else {
                alert("La unidad debe estar en ruta o retorno para simular trafico.");
            }
        });
    }

    // Alternar visibilidad de paneles de historial
    const btnTogglePanels = document.getElementById("btn-toggle-panels");
    if (btnTogglePanels) {
        btnTogglePanels.addEventListener("click", () => {
            const cardViajes = document.getElementById("card-historial-viajes");
            const cardEventos = document.getElementById("card-historial-eventos");
            if (cardViajes && cardEventos) {
                if (cardViajes.style.display === "none") {
                    cardViajes.style.display = "block";
                    cardEventos.style.display = "flex";
                    btnTogglePanels.innerText = "Ocultar Historiales";
                    btnTogglePanels.style.backgroundColor = "";
                    btnTogglePanels.style.color = "";
                } else {
                    cardViajes.style.display = "none";
                    cardEventos.style.display = "none";
                    btnTogglePanels.innerText = "Mostrar Historiales";
                    btnTogglePanels.style.backgroundColor = "var(--accent-orange)";
                    btnTogglePanels.style.color = "var(--primary)";
                }
            }
        });
    }

    // Enlace de Seguimiento de Cliente
    const btnVerSeguimiento = document.getElementById("btn-ver-seguimiento-cliente");
    if (btnVerSeguimiento) {
        btnVerSeguimiento.addEventListener("click", () => {
            const unit = findVehiculoById(selectedUnitId);
            if (!unit) return;
            if (unit.estado === "esperando_orden" || unit.estado === "invitacion_pendiente") {
                alert("La unidad debe estar despachada, en ruta o en entrega para ver su seguimiento.");
                return;
            }
            const clientView = document.getElementById("client-tracking-view");
            if (clientView) clientView.style.display = "flex";
            const clientOrderId = document.getElementById("client-order-id");
            if (clientOrderId) clientOrderId.innerText = `ORD-${unit.id.replace("-", "")}9`;

            // Inicializar mapa de cliente si es necesario
            if (!clientMap) {
                clientMap = L.map("client-map", { zoomControl: false }).setView(coordsPlanta, 13);
                L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(clientMap);
            }

            // Limpiar capas previas del mapa de cliente
            if (clientMarker) clientMap.removeLayer(clientMarker);
            if (clientRouteLineRemaining) clientMap.removeLayer(clientRouteLineRemaining);
            if (clientRouteLineTraveled) clientMap.removeLayer(clientRouteLineTraveled);
            if (clientGeofenceCircle) clientMap.removeLayer(clientGeofenceCircle);

            // Trazar capas en el mapa de cliente
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div class="map-icon-container" style="border:none;background:none;box-shadow:none;">
                        <div class="client-truck-3d-wrapper" style="width:44px;height:44px;transition:transform 0.3s ease;">
                            ${getCustomTruckSVG(unit.color, unit.tipo)}
                        </div>
                    </div>
                `,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });
            clientMarker = L.marker([unit.lat, unit.lon], { icon: icon }).addTo(clientMap);

            if (unit.coordsDestino) {
                clientGeofenceCircle = L.circle(unit.coordsDestino, {
                    color: '#22c55e',
                    fillColor: '#22c55e',
                    fillOpacity: 0.05,
                    radius: radioGeocerca,
                    weight: 1,
                    dashArray: '3, 3'
                }).addTo(clientMap);
                const iconObra = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="map-icon-container" style="border-left: 3px solid #22c55e; border-radius: 8px;"><span>Destino</span></div>`,
                    iconSize: [80, 26],
                    iconAnchor: [40, 13]
                });
                L.marker(unit.coordsDestino, { icon: iconObra }).addTo(clientMap);
            }

            if (unit.coordenadasRuta && unit.coordenadasRuta.length > 0) {
                clientRouteLineRemaining = L.polyline(unit.coordenadasRuta.slice(unit.idxCoordenada), {
                    color: unit.color, weight: 5, opacity: 0.85
                }).addTo(clientMap);
                clientRouteLineTraveled = L.polyline(unit.coordenadasRuta.slice(0, unit.idxCoordenada + 1), {
                    color: '#94a3b8', weight: 3, opacity: 0.5, dashArray: '5, 5'
                }).addTo(clientMap);
                clientMap.fitBounds(clientRouteLineRemaining.getBounds(), { padding: [50, 50] });
            }

            actualizarPantallaClienteMetricas(unit);
        });
    }

    const btnCerrarCliente = document.getElementById("btn-cerrar-cliente");
    if (btnCerrarCliente) {
        btnCerrarCliente.addEventListener("click", () => {
            const clientView = document.getElementById("client-tracking-view");
            if (clientView) clientView.style.display = "none";
        });
    }
}

// ─── BUCLE DE SIMULACIÓN GLOBAL CONCURRENTE (1 TICK = 1.2 SEG) ───
function startGlobalSimulationLoop() {
    if (globalSimTimer) clearInterval(globalSimTimer);

    globalSimTimer = setInterval(() => {
        if (simulacionPausada) return;

        flota.forEach(unit => {
            if (!unit.marker && unit.lat) {
                const icon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                        <div class="map-icon-container" style="border:none;background:none;box-shadow:none;flex-direction:column;align-items:center;">
                            <div class="truck-3d-wrapper" style="width:44px;height:44px;transition:transform 0.3s ease;">
                                ${getCustomTruckSVG(unit.color, unit.tipo)}
                            </div>
                            <div class="truck-status-badge" style="background:#64748b;color:white;font-size:0.55rem;font-weight:800;padding:1px 6px;border-radius:4px;margin-top:-4px;white-space:nowrap;">DISPONIBLE</div>
                        </div>
                    `,
                    iconSize: [60, 60],
                    iconAnchor: [30, 30]
                });
                unit.marker = L.marker([unit.lat, unit.lon], { icon: icon }).addTo(map);
                unit.marker.on("click", () => {
                    selectedUnitId = unit.id;
                    const simSelect = document.getElementById("simulated-unit-select");
                    if (simSelect) simSelect.value = unit.id;
                    updatePhoneView();
                    updateMapLayersVisibility();
                    updateSupervisorMetricsCard();
                });

                const statusLabelsMap = {
                    "esperando_orden": "DISPONIBLE", "cargando": "CARGANDO",
                    "cargando_completo": "LISTO", "en_ruta": "EN RUTA",
                    "en_obra": "EN OBRA", "descargando_proceso": "DESCARGA",
                    "completado": "ENTREGADO", "retorno": "RETORNO"
                };
                updateVehiculoStatusBadge(unit, statusLabelsMap[unit.estado] || "DISPONIBLE");
            }

            // SIMULACIÓN DE IDA (EN RUTA)
            if (unit.estado === "en_ruta" && unit.coordenadasRuta.length > 0) {
                if (unit.idxCoordenada >= unit.coordenadasRuta.length) {
                    unit.estado = "en_obra";
                    unit.velocidadKmh = 0;
                    if (unit.id === selectedUnitId) {
                        updatePhoneView();
                        updateSupervisorBadgeStatus("EN OBRA");
                    }
                    updateVehiculoStatusBadge(unit, "EN OBRA");
                    renderFleetList();
                    registerEvent(`Unidad ${unit.id} llegó automáticamente a la obra.`);
                    return;
                }

                const prevPt = unit.coordenadasRuta[Math.max(0, unit.idxCoordenada - 1)];
                const currPt = unit.coordenadasRuta[unit.idxCoordenada];
                const distSeg = map.distance(prevPt, currPt);
                unit.velocidadKmh = unit.enTrafico ? 0 : (distSeg / 1.2) * 3.6;

                if (unit.enTrafico) {
                    unit.segundosDetenido += 1.2;
                    if (unit.segundosDetenido >= 5 && !unit.alertaDetencionEmitida) {
                        unit.alertaDetencionEmitida = true;
                        registerEvent(`Alerta: Unidad ${unit.id} detenida por obstruccion de trafico.`);
                        const banner = document.getElementById("alert-desvio");
                        if (banner) {
                            banner.style.backgroundColor = "var(--accent-orange)";
                            banner.style.color = "var(--primary)";
                            banner.innerHTML = `Alerta: Unidad ${unit.id} detenida en ruta.`;
                            banner.style.display = "flex";
                            setTimeout(() => { banner.style.display = "none"; }, 5000);
                        }
                    }
                } else {
                    unit.segundosDetenido = 0;
                    unit.alertaDetencionEmitida = false;
                    unit.lat = currPt[0];
                    unit.lon = currPt[1];
                    unit.marker.setLatLng(currPt);
                    const angle = calculateAngle(prevPt, currPt);
                    const markerElem = unit.marker.getElement();
                    if (markerElem) {
                        const iconSvg = markerElem.querySelector(".truck-3d-wrapper");
                        if (iconSvg) iconSvg.style.transform = `rotate(${angle - 90}deg)`;
                    }
                    unit.routeLineTraveled.setLatLngs(unit.coordenadasRuta.slice(0, unit.idxCoordenada + 1));
                    unit.routeLineRemaining.setLatLngs(unit.coordenadasRuta.slice(unit.idxCoordenada));
                    const distToDest = map.distance(currPt, unit.coordsDestino);
                    if (distToDest <= radioGeocerca) {
                        unit.estado = "en_obra";
                        unit.velocidadKmh = 0;
                        if (unit.id === selectedUnitId) {
                            updatePhoneView();
                            updateSupervisorBadgeStatus("EN OBRA");
                            const banner = document.getElementById("alert-desvio");
                            if (banner) {
                                banner.style.backgroundColor = "#22c55e";
                                banner.innerHTML = `Llegada de ${unit.id} detectada por geocerca.`;
                                banner.style.display = "flex";
                                setTimeout(() => { banner.style.display = "none"; }, 5000);
                            }
                        }
                        updateVehiculoStatusBadge(unit, "EN OBRA");
                        renderFleetList();
                        registerEvent(`Geocerca detectada: ${unit.id} arribo a zona de descarga.`);
                    }
                    unit.idxCoordenada++;
                }
                unit.elapsedSeconds += 1.2;
            }

            // SIMULACIÓN DE VUELTA (RETORNO)
            if (unit.estado === "retorno" && unit.coordenadasRuta.length > 0) {
                if (unit.idxCoordenada < 0) {
                    unit.estado = "esperando_orden";
                    unit.velocidadKmh = 0;
                    if (unit.routeLineRemaining) map.removeLayer(unit.routeLineRemaining);
                    if (unit.routeLineTraveled) map.removeLayer(unit.routeLineTraveled);
                    if (unit.geofenceCircle) map.removeLayer(unit.geofenceCircle);
                    unit.routeLineRemaining = null;
                    unit.routeLineTraveled = null;
                    unit.geofenceCircle = null;
                    if (unit.id === selectedUnitId) updatePhoneView();
                    updateVehiculoStatusBadge(unit, "DISPONIBLE");
                    updateOptionsSelects();
                    renderFleetList();
                    registerEvent(`Unidad ${unit.id} retornó exitosamente y se encuentra en Planta.`);

                    // Archivar viaje en historial
                    const mins = Math.floor(unit.elapsedSeconds / 60);
                    const secs = Math.floor(unit.elapsedSeconds % 60);
                    const duracionStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
                    historialViajes.push({
                        idViaje: `VIAJE-${unit.id}-${Date.now().toString().slice(-4)}`,
                        unidadId: unit.id,
                        operador: unit.operador,
                        destino: unit.nombreDestino,
                        materiales: [...unit.materiales],
                        duracion: duracionStr,
                        danados: unit.damagedCount,
                        color: unit.color,
                        coordsRuta: [...unit.coordenadasRuta]
                    });
                    renderHistorialViajes();
                    return;
                }

                const prevPt = unit.coordenadasRuta[Math.min(unit.coordenadasRuta.length - 1, unit.idxCoordenada + 1)];
                const currPt = unit.coordenadasRuta[unit.idxCoordenada];
                const distSeg = map.distance(prevPt, currPt);
                unit.velocidadKmh = (distSeg / 1.2) * 3.6;
                unit.lat = currPt[0];
                unit.lon = currPt[1];
                unit.marker.setLatLng(currPt);
                const angle = calculateAngle(prevPt, currPt);
                const markerElem = unit.marker.getElement();
                if (markerElem) {
                    const iconSvg = markerElem.querySelector(".truck-3d-wrapper");
                    if (iconSvg) iconSvg.style.transform = `rotate(${angle - 90}deg)`;
                }
                unit.routeLineTraveled.setLatLngs(unit.coordenadasRuta.slice(unit.idxCoordenada));
                unit.routeLineRemaining.setLatLngs(unit.coordenadasRuta.slice(0, unit.idxCoordenada + 1));
                unit.elapsedSeconds += 1.2;
                unit.idxCoordenada--;
            }
        });

        if (followMode) {
            const activeUnit = flota.find(u => u.id === selectedUnitId);
            if (activeUnit && (activeUnit.estado === "en_ruta" || activeUnit.estado === "retorno")) {
                map.panTo([activeUnit.lat, activeUnit.lon]);
            }
        }

        // Actualizar pantalla y mapa de cliente si el modal está abierto
        const clientView = document.getElementById("client-tracking-view");
        if (clientView && clientView.style.display === "flex") {
            const activeUnit = flota.find(u => u.id === selectedUnitId);
            if (activeUnit) {
                actualizarPantallaClienteMetricas(activeUnit);
                if (clientMarker) {
                    clientMarker.setLatLng([activeUnit.lat, activeUnit.lon]);
                    const prevPt = activeUnit.coordenadasRuta[Math.max(0, activeUnit.idxCoordenada - 1)];
                    const currPt = activeUnit.coordenadasRuta[activeUnit.idxCoordenada] || [activeUnit.lat, activeUnit.lon];
                    const angle = calculateAngle(prevPt, currPt);
                    const markerElem = clientMarker.getElement();
                    if (markerElem) {
                        const iconSvg = markerElem.querySelector(".client-truck-3d-wrapper");
                        if (iconSvg) iconSvg.style.transform = `rotate(${angle - 90}deg)`;
                    }
                }
                if (clientRouteLineRemaining && clientRouteLineTraveled) {
                    clientRouteLineRemaining.setLatLngs(activeUnit.coordenadasRuta.slice(activeUnit.idxCoordenada));
                    clientRouteLineTraveled.setLatLngs(activeUnit.coordenadasRuta.slice(0, activeUnit.idxCoordenada + 1));
                }
                if (followMode && clientMap) {
                    clientMap.panTo([activeUnit.lat, activeUnit.lon]);
                }
            }
        }

        updateSupervisorMetricsCard();
    }, 1200);
}

// ─── SEGUMIENTO DE CLIENTE ───
function actualizarPantallaClienteMetricas(unit) {
    if (!unit) return;

    let distRestante = 0;
    const start = Math.min(unit.idxCoordenada, unit.coordenadasRuta.length - 1);
    for (let i = start; i < unit.coordenadasRuta.length - 1; i++) {
        distRestante += map.distance(unit.coordenadasRuta[i], unit.coordenadasRuta[i+1]);
    }
    let distTotal = 0;
    for (let i = 0; i < unit.coordenadasRuta.length - 1; i++) {
        distTotal += map.distance(unit.coordenadasRuta[i], unit.coordenadasRuta[i+1]);
    }
    const dRestKm = (distRestante / 1000).toFixed(2);

    const elDist = document.getElementById("client-stat-distancia");
    if (elDist) elDist.innerText = `${dRestKm} km`;

    let eta = "--";
    if (unit.velocidadKmh > 2) {
        const mins = Math.round((distRestante / 1000) / unit.velocidadKmh * 60);
        eta = `${mins} min`;
    } else if (unit.estado === "en_ruta" || unit.estado === "retorno") {
        eta = "En Transito";
    } else if (unit.estado === "en_obra" || unit.estado === "descargando_proceso") {
        eta = "En Destino";
    }
    const elEta = document.getElementById("client-stat-eta");
    if (elEta) elEta.innerText = eta;

    let pct = 0;
    if (distTotal > 0) {
        if (unit.estado === "retorno") {
            pct = Math.round((1 - (distRestante / distTotal)) * 100);
        } else {
            pct = Math.round(((distTotal - distRestante) / distTotal) * 100);
        }
    }
    const elBar = document.getElementById("client-progress-bar-fill");
    const elTxt = document.getElementById("client-progress-text");
    if (elBar) elBar.style.width = `${Math.min(100, pct)}%`;
    if (elTxt) elTxt.innerText = `${Math.min(100, pct)}%`;

    // Checklist de pasos
    const steps = ["cargando", "camino", "descarga", "entregado"];
    steps.forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (el) {
            el.style.opacity = "0.4";
            const dot = el.querySelector(".step-dot");
            if (dot) { dot.style.background = "white"; dot.style.borderColor = "var(--text-muted)"; }
        }
    });
    let activeStep = "";
    if (["aceptado","cargando","cargando_completo"].includes(unit.estado)) activeStep = "cargando";
    else if (["en_ruta","retorno"].includes(unit.estado)) activeStep = "camino";
    else if (["en_obra","descargando_proceso"].includes(unit.estado)) activeStep = "descarga";
    else if (unit.estado === "completado") activeStep = "entregado";

    if (activeStep) {
        const activeEl = document.getElementById(`step-${activeStep}`);
        if (activeEl) {
            activeEl.style.opacity = "1.0";
            const dot = activeEl.querySelector(".step-dot");
            if (dot) { dot.style.background = "var(--accent-blue)"; dot.style.borderColor = "var(--accent-blue)"; }
        }
    }
}

// ─── HISTORIAL DE VIAJES COMPLETADOS ───
function mostrarRutaHistorica(idx) {
    const viaje = historialViajes[idx];
    if (!viaje) return;
    if (historicPolyline) map.removeLayer(historicPolyline);
    if (historicMarkerDestino) map.removeLayer(historicMarkerDestino);

    historicPolyline = L.polyline(viaje.coordsRuta, {
        color: '#64748b', weight: 4, opacity: 0.6, dashArray: '8, 8'
    }).addTo(map);

    const iconObra = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="map-icon-container" style="border-left: 3px solid #64748b; border-radius: 8px;"><span>Historial: ${viaje.destino}</span></div>`,
        iconSize: [160, 26], iconAnchor: [80, 13]
    });
    const lastCoords = viaje.coordsRuta[viaje.coordsRuta.length - 1];
    historicMarkerDestino = L.marker(lastCoords, { icon: iconObra }).addTo(map);
    historicMarkerDestino.bindPopup(`
        <div style="font-family:sans-serif;font-size:0.75rem;line-height:1.4;">
            <b style="color:#64748b;">Viaje Completado Historico</b><br>
            <b>Folio:</b> ${viaje.idViaje}<br>
            <b>Unidad:</b> ${viaje.unidadId} (${viaje.operador})<br>
            <b>Destino:</b> ${viaje.destino}<br>
            <b>Duracion:</b> ${viaje.duracion}<br>
            <b>Defectuosos:</b> ${viaje.danados} piezas
        </div>
    `).openPopup();
    map.fitBounds(historicPolyline.getBounds(), { padding: [50, 50] });
    registerEvent(`Supervisor visualizo ruta historica del flete ${viaje.idViaje}.`);
}

function renderHistorialViajes() {
    const container = document.getElementById("completed-trips-container");
    if (!container) return;
    container.innerHTML = "";
    if (historialViajes.length === 0) {
        container.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">No hay viajes registrados.</span>`;
        return;
    }
    historialViajes.forEach((viaje, idx) => {
        const div = document.createElement("div");
        div.style.cssText = "background:rgba(255,255,255,0.4); padding:8px; border-radius:6px; border-left:3px solid " + viaje.color + "; font-size:0.7rem; display:flex; flex-direction:column; gap:4px; cursor:pointer; margin-top: 4px;";
        div.onclick = () => mostrarRutaHistorica(idx);
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:700;">
                <span>${viaje.idViaje}</span>
                <span style="color:var(--accent-green); font-size: 0.6rem;">ENTREGADO</span>
            </div>
            <div style="font-size:0.6rem; color:var(--text-muted); line-height:1.3;">
                Unidad: <b>${viaje.unidadId}</b> (${viaje.operador.split(" ")[0]})<br>
                Destino: <b>${viaje.destino}</b><br>
                Duracion: <b>${viaje.duracion}</b> | Danados: <b>${viaje.danados}</b>
            </div>
        `;
        container.appendChild(div);
    });
}

// Exponer funciones al scope global para botones onclick inline en HTML
window.seleccionarUbicacionPredefinida = seleccionarUbicacionPredefinida;
window.mostrarPredefinidas = mostrarPredefinidas;
window.mostrarInputsDespacho = mostrarInputsDespacho;
window.toggleCardCollapse = toggleCardCollapse;
window.mostrarRutaHistorica = mostrarRutaHistorica;
window.renderHistorialViajes = renderHistorialViajes;
window.actualizarPantallaClienteMetricas = actualizarPantallaClienteMetricas;
