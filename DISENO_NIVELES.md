# Reglas de diseño de niveles (medidas con el motor, velocidad 1x)

Se obtienen con `tests/jumpinfo.js` y `tests/chainsearch.js`. Están también en `LevelKit.JUMP` (`src/levels.js`).
"Ventana" = margen de tiempo para pulsar. Cómodo >= 150 ms, justo 60-100 ms, evitar < 60 ms.

## Cubo
- Salto desde el suelo: altura 2,13 bloques, alcance 4,0 bloques (3,2 a 0,8x; 5,0 a 1,24x; 6,0 a 1,5x), 0,38 s en el aire.
- Pinchos seguidos con un solo salto: 1 -> 317 ms, 2 -> 221 ms, 3 -> 125 ms, 4 -> 29 ms (no), 5 o más (imposible).
- Subir a un bloque: de 1 de alto 300 ms; de 2 de alto 138 ms.
- Entre dos obstáculos que exigen salto: al menos 8 bloques libres.

## Orbes (una alfombra de N pinchos con un orbe a mitad del salto)
| Orbe | Máx. N | Posición del orbe (celdas desde el 1.er pincho, y=2) | Ventana |
|---|---|---|---|
| Amarillo | 5 (6 justo) | N - 4 | 233 ms (167 ms con 6) |
| Rosa | 4 (5 justo) | N - 3 | 258 ms (167 ms con 5) |
| Rojo | 6 (7 justo) | N - 5 | 233 ms (167 ms con 7) |
Una alfombra de 7 con orbe amarillo deja solo 67 ms: es la que hacía imposible la primera versión de "Gravity rush".

## Pads (el cubo los activa ~0,84 bloques antes de la celda del pad)
| Pad | Altura | Aterriza en |
|---|---|---|
| Rosa | 1,48 | pad + 2,45 |
| Amarillo | 3,51 | pad + 4,27 |
| Rojo | 5,25 | pad + 5,5 |

## Gravedad
- Tras invertir la gravedad el cubo tarda ~4 bloques en cruzar de suelo a techo: no pongas obstáculos en ese tramo.
- Con gravedad invertida el "suelo" es el techo: los pinchos colgando (rot 180, y=8) son los que hay que saltar.

## Herramientas de verificación (`tests/`)
- `windows.js <nivel>`: ventana humana (ms) por grupo de obstáculos en tramos de cubo.
- `humanbeam.js <nivel> [decisión] [toque mín.] [engrosar pinchos]`: bot con margen (pinchos engrosados, decisiones gruesas, toques espaciados).
- `test2.js` / `plans.js` / `fps_test.js` / `modes_test.js`: completabilidad exacta, FPS y física.
