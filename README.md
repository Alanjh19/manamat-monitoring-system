# ManamatGPS — Sistema Web de Monitoreo y Gestión Logística

Sistema web de monitoreo y gestión logística para la empresa **Materiales MANAMAT** (Villahermosa, Tabasco). Este software está diseñado bajo un enfoque híbrido multi-rol que permite la comunicación y sincronización de eventos entre la consola del supervisor y el dispositivo del operador en ruta.

---

## 🎯 Objetivo del Proyecto

El sistema busca optimizar el control de las unidades de reparto de Materiales MANAMAT, facilitando el seguimiento en tiempo real de los pedidos, organizando el historial de fletes realizados y proporcionando alertas automáticas ante inactividades o incidentes de tránsito.

---

## 🛠️ Tecnologías Utilizadas

- **Core**: HTML5, JavaScript Moderno (ES6+) y CSS3.
- **Cartografía y Enrutamiento**: Leaflet.js (Librería Open Source local) alimentada con la API de OpenStreetMap y OSRM (Open Source Routing Machine).
- **Alineación de Colores**: Paleta visual premium basada en tokens OKLCH.
- **Hosting / Deploy**: Vercel.

---

## 🚀 Características Clave

1. **Gestión de Flota Multitarea**: Simulación de 7 unidades concurrentes con actualización cartográfica independiente.
2. **Consola del Supervisor**: Despacho de órdenes con cálculo de carga (control de sobrecarga a 5.0t), geocercas automáticas y monitoreo de métricas dinámicas (ETA, velocidad, distancia restante).
3. **Simulador de Operador**: Interfaz móvil responsiva que emula las acciones de los operadores (carga, salida, descarga, recolección de fotos de evidencia y firma digital POD).
4. **Seguimiento para Clientes**: Portal de tracking simplificado accesible mediante enlace dinámico para conocer el progreso del flete.
5. **Detección de Tránsito y Alertas**: Herramienta de simulación de tráfico para probar detenciones en ruta y disparar alertas inmediatas.
6. **Bitácora Automatizada**: Registro secuencial de auditoría de eventos de tránsito con opción de exportación al portapapeles.

---

## 📂 Estructura del Proyecto

La estructura del código sigue las mejores prácticas de separación de responsabilidades y modularización en web pura:

```text
ManamatGPS/
│
├── README.md                           # Documentación general y académica
├── LICENSE                             # Licencia MIT del proyecto
├── .gitignore                          # Exclusiones de control de versión
├── index.html                          # Punto de entrada de la aplicación
│
├── assets/
│   ├── css/
│   │     styles.css                    # Estilos visuales base y variables OKLCH
│   │     responsive.css                # Consultas adaptativas (media queries)
│   │
│   ├── js/
│   │     app.js                        # Inicialización general y bucle de simulación
│   │     map.js                        # Control de Leaflet y capas cartográficas
│   │     fleet.js                      # Lógica de flota y ruteo OSRM
│   │     orders.js                     # Gestión de cancelaciones y sonidos de despacho
│   │     ui.js                         # Manipulación del DOM y renders de componentes
│   │     events.js                     # Control de bitácora y feed de eventos
│   │     utils.js                      # Funciones reutilizables (ángulos y debouncing)
│   │
│   ├── images/                         # Recursos gráficos y multimedia
│   ├── icons/                          # Íconos de la interfaz
│   └── fonts/                          # Tipografías del sistema
│
├── data/
│      demoData.js                      # Centralización de coordenadas y flota inicial
│
├── docs/
│      screenshots/                     # Capturas de la interfaz web
│      diagrams/                        # Diagramas de clases y secuencia UML académicos
│
└── .github/
       ISSUE_TEMPLATE/                  # Plantillas para reporte de incidencias
```

---

## 📐 Diagramas UML Académicos

Los diagramas arquitectónicos de dominio de negocio se encuentran almacenados dentro del directorio:
*   `docs/diagrams/uml_class_diagram.png` (Modelo estructural del negocio)
*   `docs/diagrams/uml_sequence_diagram.png` (Ciclo de vida y mensajería en tránsito)

---

## 🛠️ Instalación y Uso Local

Al estar desarrollado en código web puro, no requiere compiladores ni frameworks adicionales:

1. Clona el repositorio en tu máquina local:
   ```bash
   git clone https://github.com/Alanjh19/manamat-monitoring-system.git
   ```
2. Abre el archivo `index.html` en cualquier navegador web moderno.
3. Alternativamente, puedes levantar un servidor de desarrollo local de forma instantánea:
   ```bash
   npx serve ./
   ```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
