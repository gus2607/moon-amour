import { useState } from "react";

export function useLetter() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((prev) => !prev);
  return { open, toggle };
}
