import { useEffect, useState } from "react";
import { splitDuration } from "../model/dates.js";

// direction: "since" counts up from targetMs, "until" counts down to targetMs.
export function useCountdown(targetMs, direction = "since") {
  const [value, setValue] = useState(() => compute(targetMs, direction));

  useEffect(() => {
    const id = setInterval(() => setValue(compute(targetMs, direction)), 1000);
    return () => clearInterval(id);
  }, [targetMs, direction]);

  return value;
}

function compute(targetMs, direction) {
  const now = Date.now();
  const diff = direction === "since" ? now - targetMs : targetMs - now;
  return splitDuration(diff);
}
