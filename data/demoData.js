// DEMODATA.JS - Datos iniciales de la simulación para ManamatGPS
// Centraliza las ubicaciones fijas, el estado inicial de la flota y variables de control global.

const coordsPlanta = [17.9426, -92.9466]; // Materiales Manamat

const destinosPredefinidos = {
    "Residencial Palmas": [17.9782, -92.9248],
    "Oxxo Tabasco 2000": [17.9972, -92.9348],
    "Bodega Sendero": [18.0050, -92.9020],
    "Distribuidora Centro": [17.9868, -92.9303],
    "Obra Ixtacomitán": [17.9400, -92.9550]
};

const flotaInicial = [
    { id: "UN-01", tipo: "camioneta", color: "#3b82f6", operador: "Carlos Hernández", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "UN-02", tipo: "camioneta", color: "#8b5cf6", operador: "Jesús Gómez", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "UN-03", tipo: "camioneta", color: "#10b981", operador: "Pedro Pérez", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "UN-04", tipo: "camioneta", color: "#f59e0b", operador: "Juan Torres", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "UN-05", tipo: "camioneta", color: "#ec4899", operador: "Marcos Ruiz", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "TR-01", tipo: "trailer", color: "#14b8a6", operador: "Luis Mendoza", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 },
    { id: "TR-02", tipo: "trailer", color: "#ef4444", operador: "Ricardo Díaz", estado: "esperando_orden", lat: coordsPlanta[0], lon: coordsPlanta[1], coordsDestino: null, nombreDestino: "", coordenadasRuta: [], idxCoordenada: 0, marker: null, routeLineRemaining: null, routeLineTraveled: null, geofenceCircle: null, fotoCapturada: false, damagedCount: 0, cronometroInicio: null, elapsedSeconds: 0, velocidadKmh: 0, materiales: [], enTrafico: false, segundosDetenido: 0 }
];

const cargaPreviaDispatch = {
    varillas: 150,
    blocks: 400,
    cemento: 20
};

// variables de estado compartidad
let coordsDestinoActual = destinosPredefinidos["Residencial Palmas"];
let nombreDestinoActual = "Residencial Palmas";
let radioGeocerca = 150; // Metros
let viewMode = "general"; // general o focused
let followMode = true;
let selectedUnitId = "UN-01"; // Unidad seleccionada para simular en el celular
let globalSimTimer = null;
let simulacionPausada = false;
let historialViajes = [];
