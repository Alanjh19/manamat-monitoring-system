// EVENTS.JS - Registro de bitácora y auditoría de eventos de tránsito
// Maneja la inyección del feed de eventos y el log dinámico.

/**
 * Añade una entrada de registro al feed de eventos del supervisor.
 */
function registerEvent(text) {
    const container = document.getElementById("event-log");
    if (!container) return;
    const entry = document.createElement("div");
    entry.className = "log-entry";
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `
        <span>${text}</span>
        <span style="color:var(--text-muted);font-size:0.6rem;">${timeStr}</span>
    `;
    container.insertBefore(entry, container.firstChild);
}
