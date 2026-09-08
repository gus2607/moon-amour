# Gustavo & Luna — nuestra historia

Página de aniversario/regalo sorpresa. React + Vite, organizada estilo MVC.

## Cómo correrla

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (normalmente `http://localhost:5173`). Recarga sola cada vez que guardas un cambio.

Para generar la versión de producción (lista para subir a Netlify/Vercel/GitHub Pages):

```bash
npm run build
```

Esto genera `dist/`, que es lo que se sube al hosting.

## Estructura (MVC)

```
love-story-site/
├── index.html            → entry HTML de Vite (solo el <div id="root">)
├── src/
│   ├── main.jsx           → monta React en #root
│   ├── App.jsx             → arma la página juntando model + controller + view
│   ├── model/
│   │   ├── story.js         → TODO el contenido: textos, capítulos, galería, carta
│   │   └── dates.js         → fechas de aniversario + lógica de duración
│   ├── controller/
│   │   ├── useCountdown.js  → hook: contador en vivo (cuenta desde/hacia una fecha)
│   │   └── useLetter.js     → hook: estado abierto/cerrado del sobre
│   ├── view/
│   │   ├── Hero.jsx, Chapter.jsx, Gallery.jsx, LetterSection.jsx, Closing.jsx
│   │   ├── Countdown.jsx, Palms.jsx  → piezas reutilizables
│   │   └── Reveal.jsx       → animación scroll-in (Framer Motion, respeta reduced-motion)
│   └── styles/global.css  → mismos tokens de color/tipografía de siempre
├── public/images/          → fotos reales van acá
└── legacy-vanilla/         → versión anterior sin build (HTML/CSS/JS puro), de respaldo
```

**Model** = datos y lógica pura, sin JSX. **Controller** = hooks que conectan ese estado con la UI. **View** = componentes que solo reciben props y pintan.

## Cómo agregar las fotos

1. Copia tus fotos dentro de `public/images/` (ej. `cocora-1.jpg`).
2. Abre `src/model/story.js`, busca `export const gallery`.
3. En cualquier slot, agrega `src: "/images/cocora-1.jpg"`:
   ```js
   { id: "s-a", span: "s-a", caption: "El colegio, 2022", src: "/images/colegio-1.jpg" }
   ```
4. Puedes duplicar cualquier slot (las clases `s-a` a `s-j` controlan tamaño/posición en `src/styles/global.css`) para agregar más espacios cuando tengan las 50+ fotos organizadas.

## Cómo cambiar fechas o textos

- **Fechas del contador:** en `src/model/dates.js`, `ANNIVERSARY` y `NEXT_ANNIVERSARY`.
- **Textos de cada capítulo, la carta, el cierre:** todos en `src/model/story.js`, en español, editables directamente — no hay que tocar componentes.
- **Colores:** en `src/styles/global.css`, arriba en `:root` (`--dusk-950`, `--rose-500`, `--amber-500`, etc.).

## Publicar la página

Con Vite ya no es arrastrar-y-soltar directo: hay que compilar primero.

1. `npm run build` genera `dist/`.
2. Sube esa carpeta `dist/` a **Netlify Drop** (netlify.com/drop) o conecta el repo a **Vercel**/**Netlify** para que compile automático en cada cambio.

Avísame cuando lleguen a ese punto y te ayudo con el despliegue.
