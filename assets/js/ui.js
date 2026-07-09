// UI.JS - Gestión del DOM y actualización de interfaces del portal
// Maneja los renders del celular, métricas administrativas e historial visual.

/**
 * Actualiza la información del smartphone simulado (Vistas del Chófer).
 */
function updatePhoneView() {
    const unit = findVehiculoById(selectedUnitId);
    if (!unit) return;
    
    const avatarText = document.getElementById("phone-avatar-text");
    const driverName = document.getElementById("phone-driver-name");
    const unitTag = document.getElementById("phone-unit-id-tag");

    if (avatarText) avatarText.innerText = unit.operador.split(" ").map(n => n[0]).join("");
    if (driverName) driverName.innerText = unit.operador;
    if (unitTag) unitTag.innerText = `${unit.id} · ${unit.tipo.toUpperCase()}`;

    const waitingScreen = document.getElementById("phone-waiting-screen");
    const inviteScreen = document.getElementById("phone-invitation-screen");
    const activeScreen = document.getElementById("phone-active-work-screen");

    if (waitingScreen) waitingScreen.style.display = "none";
    if (inviteScreen) inviteScreen.style.display = "none";
    if (activeScreen) activeScreen.style.display = "none";

    if (unit.estado === "esperando_orden") {
        if (waitingScreen) waitingScreen.style.display = "flex";
    } else if (unit.estado === "invitacion_pendiente") {
        const invOrderId = document.getElementById("invite-order-id");
        const invOrderDest = document.getElementById("invite-order-dest");
        if (invOrderId) invOrderId.innerText = `ORD-${unit.id.replace("-", "")}9`;
        if (invOrderDest) invOrderDest.innerText = unit.nombreDestino;
        if (inviteScreen) inviteScreen.style.display = "flex";
    } else {
        if (activeScreen) activeScreen.style.display = "flex";
        const phoneOrderId = document.getElementById("phone-order-id");
        const phoneOrderClient = document.getElementById("phone-order-client");
        if (phoneOrderId) phoneOrderId.innerText = `ORD-${unit.id.replace("-", "")}9`;
        if (phoneOrderClient) phoneOrderClient.innerText = `Obra: ${unit.nombreDestino}`;
        
        const materialsContainer = document.getElementById("phone-materials");
        if (materialsContainer) {
            materialsContainer.innerHTML = "";
            let totalPeso = 0;
            unit.materiales.forEach(mat => {
                totalPeso += mat.peso;
                const div = document.createElement("div");
                div.style.cssText = "display:flex; justify-content:space-between; font-size:0.75rem; padding:4px 0; border-bottom:1px solid var(--border);";
                div.innerHTML = `<span><b>${mat.cantidad}</b> ${mat.nombre}</span><span class="weight-badge">${mat.peso.toFixed(1)}t</span>`;
                materialsContainer.appendChild(div);
            });

            const alertCarga = document.getElementById("alert-sobrecarga");
            if (alertCarga) {
                if (totalPeso > LIMIT_CARGA_CAMION) {
                    alertCarga.style.display = "block";
                    alertCarga.innerHTML = `⚠️ Sobrecarga: <b>${totalPeso.toFixed(1)}t</b> / ${LIMIT_CARGA_CAMION}t`;
                } else {
                    alertCarga.style.display = "none";
                }
            }
        }

        updatePhoneButtonsByStatus(unit);
    }
}

/**
 * Muestra u oculta botones de estado en el smartphone según el avance del flete.
 */
function updatePhoneButtonsByStatus(unit) {
    const btnCargar = document.getElementById("btn-iniciar-carga");
    const btnSalir = document.getElementById("btn-salida-obra");
    const btnDescargar = document.getElementById("btn-iniciar-descarga");
    const btnEntregar = document.getElementById("btn-confirmar-entrega");
    const btnRetornar = document.getElementById("btn-iniciar-retorno");
    const evidenceSec = document.getElementById("phone-evidence-section");
    const previewCaptura = document.getElementById("phone-captured-preview");

    if (btnCargar) btnCargar.style.display = "none";
    if (btnSalir) btnSalir.style.display = "none";
    if (btnDescargar) btnDescargar.style.display = "none";
    if (btnEntregar) btnEntregar.style.display = "none";
    if (btnRetornar) btnRetornar.style.display = "none";
    if (evidenceSec) evidenceSec.style.display = "none";
    if (previewCaptura) previewCaptura.style.display = "none";

    if (unit.estado === "aceptado") {
        if (btnCargar) {
            btnCargar.style.display = "flex";
            btnCargar.className = "phone-btn phone-btn-primary";
            btnCargar.innerText = "📦 Iniciar Carga de Materiales";
        }
    } else if (unit.estado === "cargando") {
        if (btnCargar) {
            btnCargar.style.display = "flex";
            btnCargar.className = "phone-btn phone-btn-disabled";
            btnCargar.innerText = "⏳ Cargando materiales...";
        }
    } else if (unit.estado === "cargando_completo") {
        if (btnSalir) {
            btnSalir.style.display = "flex";
            btnSalir.className = "phone-btn phone-btn-primary";
            btnSalir.innerText = "Salida a Obra";
        }
    } else if (unit.estado === "en_ruta") {
        if (btnSalir) {
            btnSalir.style.display = "flex";
            btnSalir.className = "phone-btn phone-btn-disabled";
            btnSalir.innerText = "🚚 En ruta a obra...";
        }
    } else if (unit.estado === "en_obra") {
        if (btnDescargar) {
            btnDescargar.style.display = "flex";
            btnDescargar.className = "phone-btn phone-btn-primary";
            btnDescargar.innerText = "⚡ Iniciar Descarga de Materiales";
        }
    } else if (unit.estado === "descargando_proceso") {
        if (evidenceSec) evidenceSec.style.display = "block";
        if (btnEntregar) {
            btnEntregar.style.display = "flex";
            btnEntregar.className = "phone-btn phone-btn-primary";
            btnEntregar.innerText = "Confirmar Entrega (Firma)";
        }
        if (unit.fotoCapturada && previewCaptura) {
            previewCaptura.style.display = "block";
        }
    } else if (unit.estado === "completado") {
        if (btnRetornar) {
            btnRetornar.style.display = "flex";
            btnRetornar.className = "phone-btn phone-btn-primary";
            btnRetornar.innerText = "Iniciar Retorno a Planta";
        }
    } else if (unit.estado === "retorno") {
        if (btnRetornar) {
            btnRetornar.style.display = "flex";
            btnRetornar.className = "phone-btn phone-btn-disabled";
            btnRetornar.innerText = "🔄 Retornando a planta...";
        }
    }
}

/**
 * Recarga las opciones en los selectores dinámicos del supervisor y el chofer.
 */
function updateOptionsSelects() {
    const selectCelular = document.getElementById("simulated-unit-select");
    const selectDespacho = document.getElementById("dispatch-unit-select");
    
    if (!selectCelular || !selectDespacho) return;
    
    selectCelular.innerHTML = "";
    selectDespacho.innerHTML = "";

    flota.forEach(unit => {
        const optCel = document.createElement("option");
        optCel.value = unit.id;
        optCel.innerText = `${unit.id} (${unit.operador.split(" ")[0]})`;
        selectCelular.appendChild(optCel);

        if (unit.estado === "esperando_orden") {
            const optDes = document.createElement("option");
            optDes.value = unit.id;
            optDes.innerText = `${unit.id} - ${unit.tipo.toUpperCase()}`;
            selectDespacho.appendChild(optDes);
        }
    });

    selectCelular.value = selectedUnitId;
    updatePhoneView();
}

/**
 * Renderiza el listado lateral del monitor de la flota.
 */
function renderFleetList() {
    const container = document.getElementById("fleet-list-container");
    if (!container) return;

    container.innerHTML = "";
    
    flota.forEach(unit => {
        const item = document.createElement("div");
        item.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:6px 8px; border-radius:6px; border-left:3px solid " + unit.color + "; font-size:0.7rem; cursor:pointer;";
        
        item.onclick = () => {
            selectedUnitId = unit.id;
            const simSelect = document.getElementById("simulated-unit-select");
            if (simSelect) simSelect.value = unit.id;
            updatePhoneView();
            updateMapLayersVisibility();
            updateSupervisorMetricsCard();
            map.panTo([unit.lat, unit.lon]);
        };

        const isSelected = unit.id === selectedUnitId;
        const boldText = isSelected ? "font-weight:800; text-decoration:underline;" : "font-weight:600;";

        const statusLabels = {
            "esperando_orden": "DISPONIBLE",
            "invitacion_pendiente": "NOTIFICANDO",
            "aceptado": "ACEPTADO",
            "cargando": "CARGANDO",
            "cargando_completo": "LISTO PATIO",
            "en_ruta": "EN RUTA",
            "en_obra": "EN OBRA",
            "descargando_proceso": "DESCARGANDO",
            "completado": "ENTREGADO",
            "retorno": "RETORNO"
        };

        const statusColors = {
            "esperando_orden": "#64748b",
            "invitacion_pendiente": "#a855f7",
            "aceptado": "#14b8a6",
            "cargando": "#d97706",
            "cargando_completo": "#10b981",
            "en_ruta": "#3b82f6",
            "en_obra": "#8b5cf6",
            "descargando_proceso": "#f59e0b",
            "completado": "#10b981",
            "retorno": "#ec4899"
        };

        const labelText = statusLabels[unit.estado] || unit.estado.toUpperCase();
        const labelCol = statusColors[unit.estado] || "#64748b";

        item.innerHTML = `
            <div>
                <span style="${boldText}">${unit.id}</span>
                <span style="color:var(--text-muted); font-size:0.55rem; margin-left:4px;">${unit.tipo.charAt(0).toUpperCase() + unit.tipo.slice(1)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:700; color:${labelCol};">${labelText}</span>
                <span style="font-size:0.6rem; color:var(--text-muted);">${Math.round(unit.velocidadKmh)} km/h</span>
            </div>
        `;

        container.appendChild(item);
    });
}

/**
 * Actualiza las métricas en la tarjeta de monitoreo del supervisor.
 */
function updateSupervisorMetricsCard() {
    const unit = findVehiculoById(selectedUnitId);
    if (!unit) return;
    
    const cardTitle = document.getElementById("metrics-card-title");
    if (cardTitle) cardTitle.innerText = `Metricas de ${unit.id} (${unit.operador.split(" ")[0]})`;
    
    const distVal = document.getElementById("stat-distancia");
    const distTot = document.getElementById("stat-distancia-total");
    const etaVal = document.getElementById("stat-eta");
    const velVal = document.getElementById("stat-velocidad");
    const cronoVal = document.getElementById("stat-cronometro");
    const fillBar = document.getElementById("progress-bar-fill");
    const fillTxt = document.getElementById("progress-text");

    if (unit.estado !== "en_ruta" && unit.estado !== "retorno" && unit.estado !== "en_obra" && unit.estado !== "descargando_proceso") {
        if (distVal) distVal.innerText = "-- km";
        if (distTot) distTot.innerText = "";
        if (etaVal) etaVal.innerText = "--";
        if (velVal) velVal.innerText = "0 km/h";
        if (cronoVal) cronoVal.innerText = "00:00";
        if (fillBar) fillBar.style.width = "0%";
        if (fillTxt) fillTxt.innerText = "0%";
        
        updateSupervisorBadgeStatus("DISPONIBLE");
        return;
    }

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
    const dTotKm = (distTotal / 1000).toFixed(2);

    if (distVal) distVal.innerText = `${dRestKm} km`;
    if (distTot) distTot.innerText = `de ${dTotKm} km`;
    if (velVal) velVal.innerText = `${Math.round(unit.velocidadKmh)} km/h`;

    let eta = "--";
    if (unit.velocidadKmh > 2) {
        const mins = Math.round((distRestante / 1000) / unit.velocidadKmh * 60);
        eta = `${mins} min`;
    } else if (unit.estado === "en_ruta" || unit.estado === "retorno") {
        eta = "Transito...";
    }
    if (etaVal) etaVal.innerText = eta;

    const mins = Math.floor(unit.elapsedSeconds / 60);
    const secs = Math.floor(unit.elapsedSeconds % 60);
    if (cronoVal) cronoVal.innerText = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    let pct = 0;
    if (distTotal > 0) {
        if (unit.estado === "retorno") {
            const rec = distRestante;
            pct = Math.round((1 - (rec / distTotal)) * 100);
        } else {
            const rec = distTotal - distRestante;
            pct = Math.round((rec / distTotal) * 100);
        }
    }
    if (fillBar) fillBar.style.width = `${Math.min(100, pct)}%`;
    if (fillTxt) fillTxt.innerText = `${Math.min(100, pct)}%`;

    // Renderizar Carga Útil en Vista de Supervisor
    const payloadContainer = document.getElementById("supervisor-payload-details");
    if (payloadContainer) {
        payloadContainer.innerHTML = "";
        if (unit.materiales && unit.materiales.length > 0) {
            unit.materiales.forEach(mat => {
                const div = document.createElement("div");
                div.style.cssText = "display:flex; justify-content:space-between; font-size:0.75rem; padding:2px 0; border-bottom:1px dashed rgba(0,0,0,0.05);";
                div.innerHTML = `<span><b>${mat.cantidad}</b> ${mat.nombre}</span><span class="weight-badge" style="font-size:0.65rem; background:rgba(0,0,0,0.05); padding:1px 4px; border-radius:3px; font-weight:700;">${mat.peso.toFixed(1)}t</span>`;
                payloadContainer.appendChild(div);
            });
        } else {
            payloadContainer.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">Sin materiales cargados (Unidad vacia).</span>`;
        }
    }

    const labels = {
        "en_ruta": "EN RUTA",
        "en_obra": "EN OBRA",
        "descargando_proceso": "DESCARGA",
        "completado": "ENTREGADO",
        "retorno": "RETORNO"
    };
    updateSupervisorBadgeStatus(labels[unit.estado] || "PENDIENTE");
}

/**
 * Actualiza el indicador visual de estado (Pill) del celular del operador.
 */
function updateSupervisorBadgeStatus(text) {
    const pill = document.getElementById("status-indicator");
    if (pill) {
        pill.innerText = text;
        const colores = {
            "CARGANDO": "#d97706",
            "LISTO": "#10b981",
            "EN RUTA": "#3b82f6",
            "EN OBRA": "#8b5cf6",
            "DESCARGA": "#f59e0b",
            "ENTREGADO": "#10b981",
            "RETORNO": "#ec4899",
            "DISPONIBLE": "#64748b",
            "CANCELADO": "#ef4444"
        };
        pill.style.backgroundColor = colores[text] || "#64748b";
    }
}

/**
 * Modifica el badge de estado dentro del mapa de Leaflet para el marcador de la unidad.
 */
function updateVehiculoStatusBadge(unit, text) {
    if (!unit.marker) return;
    const el = unit.marker.getElement();
    if (el) {
        const badge = el.querySelector(".truck-status-badge");
        if (badge) {
            badge.innerText = text;
            const colores = {
                "CARGANDO": "#d97706",
                "LISTO": "#10b981",
                "EN RUTA": "#3b82f6",
                "EN OBRA": "#8b5cf6",
                "DESCARGA": "#f59e0b",
                "ENTREGADO": "#10b981",
                "RETORNO": "#ec4899",
                "DISPONIBLE": "#64748b",
                "CANCELADO": "#ef4444"
            };
            badge.style.backgroundColor = colores[text] || "#64748b";
        }
    }
}

/**
 * Opciones de colapso colapsable genérico.
 */
window.toggleCardCollapse = function(btn) {
    const card = btn.closest(".glass-card");
    const content = card.querySelector(".card-content");
    if (content) {
        content.classList.toggle("collapsed");
        btn.innerText = content.classList.contains("collapsed") ? "[+]" : "[-]";
    }
};

/**
 * Selecciona una ubicación predefinida en el panel de despacho y coloca su pin.
 */
function seleccionarUbicacionPredefinida(nombre, lat, lng) {
    coordsDestinoActual = [lat, lng];
    nombreDestinoActual = nombre;
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = nombre;
    
    // Crear el pin en el mapa de forma inmediata
    setObraMarker(lat, lng, nombre);
    
    // Ocultar wrapper y mostrar badge
    const sitesWrapper = document.getElementById("predefined-sites-wrapper");
    const siteNameSpan = document.getElementById("selected-site-name");
    const selectedBadge = document.getElementById("predefined-selected-badge");

    if (sitesWrapper) sitesWrapper.style.display = "none";
    if (siteNameSpan) siteNameSpan.innerText = nombre;
    if (selectedBadge) selectedBadge.style.display = "flex";
}

/**
 * Muestra el contenedor de sitios predefinidos y oculta el badge seleccionado.
 */
function mostrarPredefinidas() {
    const sitesWrapper = document.getElementById("predefined-sites-wrapper");
    const selectedBadge = document.getElementById("predefined-selected-badge");
    if (sitesWrapper) sitesWrapper.style.display = "block";
    if (selectedBadge) selectedBadge.style.display = "none";
}

/**
 * Muestra el formulario de despacho y oculta la confirmación de envío exitoso.
 */
function mostrarInputsDespacho() {
    const inputsWrapper = document.getElementById("dispatch-inputs-wrapper");
    const successBadge = document.getElementById("dispatch-success-badge");
    if (inputsWrapper) inputsWrapper.style.display = "flex";
    if (successBadge) successBadge.style.display = "none";
}

window.seleccionarUbicacionPredefinida = seleccionarUbicacionPredefinida;
window.mostrarPredefinidas = mostrarPredefinidas;
window.mostrarInputsDespacho = mostrarInputsDespacho;

