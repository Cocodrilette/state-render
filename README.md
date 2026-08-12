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
| `src/lib/core/registry.ts` | Catálogo de canales |
| `src/lib/player.svelte.ts` | Reproductor de fotogramas |
| `src/lib/slide.svelte.ts` | Interpolador de posiciones: celdas, enlaces y etiquetas se mueven juntos |
| `src/lib/geometry.ts` | Toda la geometría del lienzo |
| `src/lib/components/Viewport.svelte` | El diagrama |

`ListState.order` es la disposición física sobre el lienzo y es independiente del orden lógico:
durante una inversión las celdas no se mueven, son los enlaces los que cambian de sentido. Al
terminar la operación, `normalize()` reacomoda el estado.

### Estructuras con dos enlaces

`VizNode.prev` solo existe si la estructura lo declara (`doubly: true` en el catálogo). Cuando
está, el lienzo abre un segundo carril — `siguiente` por arriba, `previo` por abajo — y
`ListState.tail` mantiene el puntero a la cola, que es lo que vuelve O(1) insertar y eliminar
al final. Las estructuras de un solo enlace no se enteran: para ellas ambos campos son
`undefined` y todo se dibuja en un carril.

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
