import { Bike, Footprints, PersonStanding, Shuffle } from "lucide-react";
import type { Sport } from "@bricklap/engine";

export function SportIcon({
  sport,
  className,
}: {
  sport: Sport;
  className?: string;
}) {
  const props = { className, strokeWidth: 1.75, "aria-hidden": true as const };
  switch (sport) {
    case "run":
      return <Footprints {...props} />;
    case "bike":
      return <Bike {...props} />;
    case "walk":
      return <PersonStanding {...props} />;
    case "transition":
      return <Shuffle {...props} />;
  }
}
