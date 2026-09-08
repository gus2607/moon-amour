// Todo el contenido de la página vive acá. Editar textos/fechas/fotos
// se hace en este archivo, sin tocar los componentes de src/view.

export const hero = {
  eyebrow: "Un regalo para ti, Lunita",
  title: "De las gradas del colegio hasta hoy.",
  subtitle:
    "Esta es la línea de tiempo de todo lo que hemos vivido: Gustavo & Luna, desde 2022 hasta ahora. Escrita por mí, para ti.",
};

export const chapters = [
  {
    id: "ch01",
    variant: "dawn",
    num: "Capítulo 01 — 2022",
    title: "Donde todo empezó",
    lede: "El colegio. Once cursos que arrancaron sin ninguna señal de lo que venía.",
    beats: [
      {
        label: "El comienzo torpe",
        text: "La primera vez que hablamos no fue el mejor comienzo: hablé de más y dejé correr un chisme que no era mío para contar, y durante un tiempo te caí mal. Me tomó su trabajo ganarme ese terreno de vuelta. Pero poco a poco las miradas empezaron a durar un segundo más de lo normal, y los detalles pequeños se volvieron costumbre.",
      },
      {
        label: "Las gradas",
        text: "No recuerdo la fecha exacta, pero recuerdo todo lo demás: estábamos solos en unas gradas, intercambiando miradas y detalles, esta vez más cerca de lo normal. Todo me temblaba. Hasta que en un punto la tensión no aguantó más, me dejé llevar, y te besé.",
      },
    ],
  },
  {
    id: "ch02",
    variant: "midday",
    num: "Capítulo 02",
    title: "Un almuerzo que lo cambió todo",
    lede: "La primera cita, en tu casa.",
    beats: [
      {
        label: "La invitación",
        text: "La semana antes de invitarme a tu casa estabas tan avergonzada que me pediste que no te mirara mientras me lo contabas. En cuanto escuché la invitación no pude evitarlo: levanté la mirada y sonreí.",
      },
      {
        label: "La tarde",
        text: "Ese día conocí a tu familia, compartimos un almuerzo delicioso y una tarde que se sintió completa. Y fue ahí, esa misma tarde, cuando me dijiste que te gustaba — y yo te correspondí.",
      },
      {
        label: "La carta en el bolsillo",
        text: "Antes de irme guardaste una carta en el bolsillo de mi chaqueta sin que me diera cuenta. La leí en el camino a casa. Sentí mariposas en el estómago, y el resto del camino lo hice flotando.",
      },
    ],
  },
  {
    id: "ch03",
    variant: "gold",
    num: "Capítulo 03 — Casi cuatro años",
    title: "Los amaneceres, tus dibujos y los detalles",
    beats: [
      {
        label: "Lo de todos los días",
        text: "Cuando teníamos que ir al técnico salíamos juntos, siempre juntos, y compartíamos amaneceres que convertían caminar temprano en algo casi mágico. Aprendí a amar tus detalles, esas cosas pequeñas que solo tú piensas en dar.",
      },
      {
        label: "Tu arte",
        text: "Y aprendí a amar verte dibujar. Eres una gran artista, y para mí siempre fuiste — y sigues siendo — el arte más hermoso que existe.",
      },
    ],
    tags: ["Amaneceres", "Tus dibujos", "Los detalles", "Casi 4 años"],
  },
  {
    id: "ch04",
    variant: "pause",
    num: "Capítulo 04",
    title: "Un año de silencio, no de final",
    lede: "Después de casi cuatro años, nos separamos durante un año. No fue fácil, y esta página no pretende simplificarlo. Fue un tiempo para reflexionar, para aprender y para crecer, cada uno por su lado.",
    ledeExtra:
      "Y a veces eso también es parte de una historia de amor: el espacio que te enseña por qué quieres volver.",
  },
  {
    id: "ch05",
    variant: "sunset",
    num: "Capítulo 05 — 7 de marzo de 2026",
    title: "El día en que decidimos volver a empezar",
    beats: [
      {
        label: "Nuestro aniversario",
        text: "El 7 de marzo de 2026 es la fecha que elegimos: el día en que decidimos intentarlo otra vez, esta vez con todo lo que aprendimos en el camino. Desde entonces hemos vuelto a acumular amaneceres — solo que ahora los apreciamos distinto.",
      },
      {
        label: "Valle de Cocora",
        text: "Hace poco viajamos juntos al Valle de Cocora. Nos reímos muchísimo, conocimos lugares nuevos y, como siempre, estabas hermosa. De esos viajes que se quedan guardados no por las fotos, sino por cómo se sintieron.",
      },
    ],
  },
];

export const gallery = {
  eyebrow: "Nuestro álbum",
  title: "Momentos que quiero guardar aquí",
  lede: "Del colegio al Valle de Cocora: los momentos que fui guardando en el camino.",
  note: "Desliza para revivir cada momento",
  // Curado a mano de las 50 fotos + 2 videos reales que Gustavo compartió.
  // Fotos van en el scroll horizontal infinito; type: "video" las saca a la
  // vitrina fija de abajo (autoplay en loop).
  slots: [
    { id: "p01", caption: "Un corazón, 2022", src: "/images/Screenshot_2022-05-09-17-40-44-593_com.whatsapp.jpg" },
    { id: "p02", caption: "Un dibujo en tu mano", src: "/images/Screenshot_2022-10-18-00-22-33-662_com.whatsapp.jpg" },
    { id: "p03", caption: "Amanecer, 2022", src: "/images/IMG_20220923_060537.jpg" },
    { id: "p04", caption: "Nosotros dos", src: "/images/IMG_20230326_160404.jpg" },
    { id: "p05", caption: "Un detalle en el plato", src: "/images/IMG_20241113_141853.jpg" },
    { id: "v01", type: "video", caption: "Un video de esos días", src: "/videos/VID-20240924-WA0064.mp4" },
    { id: "p06", caption: "El cielo se incendió", src: "/images/IMG-20250318-WA0033.jpg" },
    { id: "p07", caption: "Un atardecer cualquiera", src: "/images/IMG-20250318-WA0030.jpg" },
    { id: "p08", caption: "Fall in love", src: "/images/IMG-20260320-WA0031.jpg" },
    { id: "p09", caption: "El corazón que hacemos", src: "/images/IMG-20260324-WA0015.jpg" },
    { id: "p10", caption: "Rumbo a alguna parte", src: "/images/IMG-20260324-WA0014.jpg" },
    { id: "p11", caption: "Tú, como siempre", src: "/images/IMG-20260409-WA0016.jpg" },
    { id: "p12", caption: "Con la camiseta puesta", src: "/images/IMG-20260623-WA0032.jpg" },
    { id: "p13", caption: "Tan cerca", src: "/images/IMG-20260719-WA0006.jpg" },
    { id: "p14", caption: "Un día cualquiera, juntos", src: "/images/IMG-20260719-WA0004.jpg" },
    { id: "p15", caption: "Salidas nuestras", src: "/images/IMG-20260723-WA0018.jpg" },
    { id: "p16", caption: "En medio de la fiesta", src: "/images/IMG-20260726-WA0060.jpg" },
    { id: "p17", caption: "El corazón de palmas", src: "/images/IMG-20260726-WA0066.jpg" },
    { id: "p18", caption: "En la palma de la montaña", src: "/images/IMG-20260726-WA0084.jpg" },
    { id: "p19", caption: "Entre flores y palmas", src: "/images/IMG-20260726-WA0091.jpg" },
    { id: "p20", caption: "Un beso con vista", src: "/images/IMG-20260726-WA0120.jpg" },
    { id: "p21", caption: "Descanso en el pasto", src: "/images/IMG-20260726-WA0124.jpg" },
    { id: "p22", caption: "Con el pueblo abajo", src: "/images/IMG-20260726-WA0127.jpg" },
    { id: "p23", caption: "Línea directa al corazón", src: "/images/IMG-20260726-WA0134.jpg" },
    { id: "p24", caption: "El columpio corazón", src: "/images/IMG-20260726-WA0147.jpg" },
    { id: "p25", caption: "El columpio de flores", src: "/images/IMG-20260726-WA0157.jpg" },
    { id: "v02", type: "video", caption: "Un video del Valle", src: "/videos/VID-20260726-WA0121.mp4" },
    { id: "p26", caption: "De la mano, siempre", src: "/images/IMG-20260726-WA0169.jpg" },
    { id: "p27", caption: "Tu playlist, tu mundo", src: "/images/IMG-20260809-WA0006.jpg" },
    { id: "p28", caption: "Mirando lo que fuimos", src: "/images/IMG-20260826-WA0010.jpg" },
  ],
};

export const letter = {
  eyebrow: "Una carta para ti",
  title: "Antes de que sigas viviendo, lee esto",
  hint: "Toca el sobre para abrirlo",
  seal: "GL",
  paragraphs: [
    "Mi amor,",
    "Llevo guardando esto desde las gradas del colegio, cuando todo me temblaba y aun así me dejé llevar y te besé. Desde entonces hemos coleccionado amaneceres juntos, las cartas, dibujos y regalos que conservo en mi cajón, los besos las caricias y los momentos inolvidables que llevo grabados en el corazón y la certeza de que el año que estuvimos separados no fue una pausa en nuestra historia, sino la parte donde aprendimos a merecerla y crecimos como personas.",
    "Hoy, con este 7 de marzo que ya volvimos nuestro, solo quiero decirte lo que ya sabes pero nunca está de más repetir: para mí sigues siendo mi Lunita, mi Leoncita, y el arte más hermoso que he visto en mi vida.",
  ],
  signature: "Con todo lo que soy, mi alma y mi corazón.\nTE AMO MUCHO MI AMOR\n💋💋\nGustavo",
};

export const closing = {
  eyebrow: "Y hasta aquí, por ahora",
  title: "Esto apenas empieza otra vez.",
  body: "Del colegio al Valle de Cocora, de las gradas a esta página. Lo que sigue todavía no está escrito, y esa es la mejor parte: lo vamos a escribir juntos, un amanecer a la vez.",
  counterNote: "Para nuestro próximo 7 de marzo.",
  signature: "Con todo mi amor, Gustavo.",
  madeWith: "Para mi amorcito",
};
