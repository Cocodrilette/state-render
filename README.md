# StateRender

Plataforma para aprender estructuras de datos viendo cada operación ejecutarse paso a paso.
Cada operación se **renderiza** como una secuencia de fotogramas: se reproduce, se pausa, se
retrocede y se arrastra por la línea de tiempo, con el pseudocódigo sincronizado y una
narración que explica el porqué de cada paso.

Canales disponibles:

| Canal | Estructura | Lo que enseña |
| --- | --- | --- |
| CH1 | Lista simplemente ligada | Un enlace por nodo; todo termina en ∅ |
| CH2 | Lista circular | El último vuelve a la cabeza: no hay ∅ que sirva de parada |
| CH3 | Lista doblemente ligada | Dos enlaces por nodo y puntero a la cola: se recorre en los dos sentidos |

Y un escenario: un problema que ninguna estructura resuelve sola.

| Escenario | Estructuras | Lo que enseña |
| --- | --- | --- |
| SIM1 | Garajes del metro | Seis listas que se intercambian nodos durante cinco días |

## Empezar

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # pruebas del núcleo
pnpm check      # tipos
pnpm build      # producción
```

Atajos: **espacio** reproduce y pausa, **←/→** avanzan y retroceden un fotograma.

## Cómo está armado

La idea que sostiene todo, y de donde viene el nombre: **una operación no devuelve un
resultado, devuelve una secuencia de fotogramas**. Cada operación es un generador que emite un
`Frame` — un estado completo y autocontenido de la lista — por cada paso del algoritmo.

```ts
*run(state, args): Generator<Frame, ListState> {
  const fresh = createNode(state, args.value);
  yield snapshot(state, { codeLine: 1, caption: 'Se crea el nodo…' });
  fresh.next = state.head;
  yield snapshot(state, { codeLine: 2, caption: 'El nodo nuevo apunta a la cabeza…' });
  // …
}
```

Como cada fotograma es independiente, reproducir, pausar, retroceder y arrastrar la línea de
tiempo son la misma operación: cambiar un índice del arreglo. La lógica del algoritmo no sabe
nada del dibujo, y el dibujo no sabe nada del algoritmo.

| Archivo | Qué hace |
| --- | --- |
| `src/lib/core/types.ts` | `Frame`, `ListState`, `OperationDef`, `StructureDef` |
| `src/lib/core/list-state.ts` | Helpers puros: crear, clonar, recorrer, normalizar, fotografiar |
| `src/lib/core/singly.ts` | Operaciones de la lista simple (y Floyd, compartida con la circular) |
| `src/lib/core/circular.ts` | Operaciones de la lista circular |
| `src/lib/core/doubly.ts` | Operaciones de la lista doblemente ligada |
| `src/lib/core/registry.ts` | Catálogo de canales y escenarios |
| `src/lib/core/metro.ts` | El escenario del metro: seis listas y la semana completa |
| `src/lib/playback.svelte.ts` | Transporte de fotogramas, sin saber qué hay dentro de uno |
| `src/lib/player.svelte.ts` | Reproductor de un canal de estructura |
| `src/lib/metro-player.svelte.ts` | Reproductor del escenario |
| `src/lib/slide.svelte.ts` | Interpolador de posiciones: celdas, enlaces y etiquetas se mueven juntos |
| `src/lib/geometry.ts` | Toda la geometría del lienzo |
| `src/lib/components/Viewport.svelte` | El diagrama de una lista |
| `src/lib/components/MetroViewport.svelte` | El tablero del escenario |

`ListState.order` es la disposición física sobre el lienzo y es independiente del orden lógico:
durante una inversión las celdas no se mueven, son los enlaces los que cambian de sentido. Al
terminar la operación, `normalize()` reacomoda el estado.

### Estructuras con dos enlaces

`VizNode.prev` solo existe si la estructura lo declara (`doubly: true` en el catálogo). Cuando
está, el lienzo abre un segundo carril — `siguiente` por arriba, `previo` por abajo — y
`ListState.tail` mantiene el puntero a la cola, que es lo que vuelve O(1) insertar y eliminar
al final. Las estructuras de un solo enlace no se enteran: para ellas ambos campos son
`undefined` y todo se dibuja en un carril.

## Escenarios

Un escenario no es una estructura más: es un problema que necesita varias trabajando juntas.
SIM1 monta seis listas y las hace intercambiarse nodos durante cinco jornadas — un tren **es**
una lista doblemente ligada de vagones, los trenes en servicio viven en otra, garaje y taller
son dos pares más, y el taller es simplemente ligado porque una cola FIFO no necesita volver.

Lo que comparte con un canal es exactamente el chasis: `Playback` mueve el índice, `Deck` y
`FrameStrip` dibujan el transporte y `CodePanel` sincroniza el pseudocódigo. Lo que aporta
cada uno es su fotograma, su visor y su consola. Por eso `Playback` es abstracta y pide solo
cuatro cosas — cuántos fotogramas hay, la narración, el tono y cómo reducir un fotograma a
marcas para la tira: nada de eso sabe si detrás hay una lista o seis.

El nodo que migra es siempre el mismo objeto, nunca una copia, así que cada fotograma verifica
la **conservación**: cabezas en trenes + garaje + taller = 13, y lo mismo con los 100 vagones.
Si la suma no cuadra, algún puntero quedó a medias. Es la prueba más útil del escenario y se
lee en el rótulo del visor.

La consola es la parte jugable. Subir las cabezas o su vida útil y volver a renderizar es la
forma de ver de dónde sale el cuello de botella: con los valores del enunciado la semana es
imposible por aritmética —13 cabezas × 3 jornadas = 39 días-cabeza contra los 50 que exigen
10 trenes durante 5 días— y el panel lo dice antes de simular. Pero es una **cota inferior**:
cumplirla no garantiza nada. Con 17 cabezas el conteo ya no lo descarta y aun así el día 5 se
queda corto; hacen falta 18, porque el plan de averías también gasta cabezas y una agotada el
último día ya no se recicla. Esa distinción entre «demostrado imposible» y «no descartado» es
la mitad de lo que el escenario enseña.

## Añadir una estructura

1. Crea `src/lib/core/<estructura>.ts` y exporta un arreglo de `OperationDef`. Cada operación
   declara su pseudocódigo, su complejidad, una nota sobre por qué cuesta lo que cuesta, sus
   argumentos y el generador `run`.
2. Agrega una entrada en `structures` dentro de `registry.ts`.

Ningún componente necesita enterarse: la consola, el panel de pseudocódigo y los controles se
construyen solos a partir del catálogo.

## Diseño

Una suite de monitoreo: monitor oscuro donde se mira un fotograma, escritorio claro donde se
lee y se opera. El amarillo significa una sola cosa en toda la plataforma: «esto es lo que el
fotograma actual está tocando». Tipografías: **Martian Mono** (rótulos, usando su eje de
ancho), **Instrument Sans** (interfaz) y **Spline Sans Mono** (código y datos). La animación
respeta `prefers-reduced-motion` y toda la interfaz se navega con teclado.
