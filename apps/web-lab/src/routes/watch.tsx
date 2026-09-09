import { createFileRoute } from "@tanstack/react-router";
import { WatchView } from "@/components/bricklap/watch-view";

export const Route = createFileRoute("/watch")({ component: WatchPage });

function WatchPage() {
  return <WatchView />;
}
