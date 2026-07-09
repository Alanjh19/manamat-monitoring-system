// UTILS.JS - Funciones de ayuda generales reutilizables
// Contiene lógica matemática y de control de eventos.

/**
 * Calcula el ángulo en grados de inclinación entre dos puntos de coordenadas.
 */
function calculateAngle(p1, p2) {
    const dy = p2[0] - p1[0];
    const dx = p2[1] - p1[1];
    return Math.atan2(dx, dy) * 180 / Math.PI;
}

/**
 * Retrasa la ejecución de una función hasta que haya transcurrido
 * un lapso determinado de inactividad.
 */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
