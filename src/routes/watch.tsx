import { createFileRoute } from "@tanstack/react-router";
import { WatchView } from "@/components/afterlap/watch-view";

export const Route = createFileRoute("/watch")({ component: WatchPage });

function WatchPage() {
  return <WatchView />;
}
