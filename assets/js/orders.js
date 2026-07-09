// ORDERS.JS - Lógica de negocio de órdenes de despacho
// Maneja despachos y disparadores acústicos.

/**
 * Cancela una orden de viaje activa para una unidad de la flota.
 */
function cancelUnitOrder(unit) {
    if (unit.timerInterval) clearInterval(unit.timerInterval);
    unit.timerInterval = null;
    unit.estado = "esperando_orden";
    unit.coordsDestino = null;
    unit.nombreDestino = "";
    unit.coordenadasRuta = [];
    unit.idxCoordenada = 0;
    unit.fotoCapturada = false;
    unit.damagedCount = 0;
    unit.elapsedSeconds = 0;
    unit.velocidadKmh = 0;
    unit.enTrafico = false;
    unit.segundosDetenido = 0;
    unit.alertaDetencionEmitida = false;

    // Remover capas físicas de mapa
    if (unit.routeLineRemaining) map.removeLayer(unit.routeLineRemaining);
    if (unit.routeLineTraveled) map.removeLayer(unit.routeLineTraveled);
    if (unit.geofenceCircle) map.removeLayer(unit.geofenceCircle);

    unit.routeLineRemaining = null;
    unit.routeLineTraveled = null;
    unit.geofenceCircle = null;

    if (unit.id === selectedUnitId) {
        updatePhoneView();
        const banner = document.getElementById("alert-desvio");
        if (banner) banner.style.display = "none";
    }

    updateVehiculoStatusBadge(unit, "DISPONIBLE");
    updateOptionsSelects();
    renderFleetList();
}

/**
 * Sintetiza un tono acústico de notificación para despacho de pedido.
 */
function playDispatchNotification() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15); // A5
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
        console.log("Audio Context bloqueado o no disponible.");
    }
}
