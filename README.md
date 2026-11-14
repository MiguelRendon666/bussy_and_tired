# Geometry Dash Web

Reimplementación de Geometry Dash en una sola página (canvas + JS, sin servidor). Progreso y niveles propios se guardan en `localStorage`.

**Jugar:** https://miguelrendon666.github.io/bussy_and_tired/

## Contenido
- Modos: cubo, nave, UFO, wave, ball y spider (con 6 diseños por vehículo).
- 7 niveles oficiales, editor de niveles, canales de color, grupos y triggers (Color, Pulse, Alpha, Toggle).

## Estructura
- `index.html`: el juego completo, generado a partir de `src/`.
- `src/`: código fuente. `node src/build.js` regenera el HTML (se escribe en `src/geometry-dash.html`; cópialo como `index.html`).
- `tests/`: pruebas de física y de completabilidad de los niveles (Node).
