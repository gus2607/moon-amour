// Cambia estas dos fechas si en algún momento ajustan el aniversario.
export const ANNIVERSARY = new Date("2026-03-07T00:00:00-05:00").getTime();
export const NEXT_ANNIVERSARY = new Date("2027-03-07T00:00:00-05:00").getTime();

export function splitDuration(ms) {
  const clamped = Math.max(0, ms);
  return {
    days: Math.floor(clamped / 86400000),
    hours: Math.floor((clamped % 86400000) / 3600000),
    minutes: Math.floor((clamped % 3600000) / 60000),
    seconds: Math.floor((clamped % 60000) / 1000),
  };
}
