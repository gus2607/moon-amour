// One Van Gogh painting per scroll section, chosen to track his own path
// across Europe (Nuenen -> Paris -> Arles -> Saint-Rémy -> Auvers-sur-Oise)
// and to match each section's existing background-color mood (see
// backgroundStops.js). Images are public domain (Van Gogh died 1890) and
// sourced from Wikimedia Commons.
//
// focalPoint is the [u, v] spot in the painting (0,0 = bottom-left, 1,1 =
// top-right, matching the texture's own UV space) the camera dollies
// toward as the visitor scrolls through that section — see the
// zoomProgress pan in ThreeBackground.jsx. Picked from each painting's
// actual focal detail (a star, the cypress, the one white iris) so the
// zoom-in converges on something specific instead of the bare center.
export const PAINTINGS = {
  hero: {
    title: "La noche estrellada",
    year: 1889,
    place: "Saint-Rémy-de-Provence, Francia",
    image: "/images/vangogh/starry-night.jpg",
    focalPoint: [0.38, 0.62],
  },
  dawn: {
    title: "Campo de trigo con cuervos",
    year: 1890,
    place: "Auvers-sur-Oise, Francia",
    image: "/images/vangogh/wheatfield-crows.jpg",
    focalPoint: [0.52, 0.6],
  },
  midday: {
    title: "Campo de trigo con cipreses",
    year: 1889,
    place: "Saint-Rémy-de-Provence, Francia",
    image: "/images/vangogh/wheat-field-cypresses.jpg",
    focalPoint: [0.68, 0.55],
  },
  gold: {
    title: "Los girasoles",
    year: 1888,
    place: "Arles, Francia",
    image: "/images/vangogh/sunflowers.jpg",
    focalPoint: [0.5, 0.5],
  },
  pause: {
    title: "Noche estrellada sobre el Ródano",
    year: 1888,
    place: "Arles, Francia",
    image: "/images/vangogh/starry-night-rhone.jpg",
    focalPoint: [0.62, 0.7],
  },
  sunset: {
    title: "Terraza de café por la noche",
    year: 1888,
    place: "Arles, Francia",
    image: "/images/vangogh/cafe-terrace.jpg",
    focalPoint: [0.44, 0.5],
  },
  gallery: {
    title: "Flores de almendro",
    year: 1890,
    place: "Saint-Rémy-de-Provence, Francia",
    image: "/images/vangogh/almond-blossom.jpg",
    focalPoint: [0.5, 0.55],
  },
  letter: {
    title: "Los lirios",
    year: 1889,
    place: "Saint-Rémy-de-Provence, Francia",
    image: "/images/vangogh/irises.jpg",
    focalPoint: [0.18, 0.4],
  },
  closing: {
    title: "Camino con ciprés y estrella",
    year: 1890,
    place: "Auvers-sur-Oise, Francia",
    image: "/images/vangogh/road-cypress-star.jpg",
    focalPoint: [0.63, 0.78],
  },
};

// Same order the sections render in — drives which painting is "next" as
// the visitor scrolls from one section into another.
export const PAINTING_ORDER = [
  "hero",
  "dawn",
  "midday",
  "gold",
  "pause",
  "sunset",
  "gallery",
  "letter",
  "closing",
];
