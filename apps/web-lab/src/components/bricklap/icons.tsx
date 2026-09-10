import { Bike, Dumbbell, Footprints, Gauge, PersonStanding, Sailboat, Shuffle, Waves } from "lucide-react";
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
    case "strength":
      return <Dumbbell {...props} />;
    case "rowing_indoor":
      return <Sailboat {...props} />;
    case "treadmill":
      return <Gauge {...props} />;
    case "swimming_pool":
      return <Waves {...props} />;
  }
}
