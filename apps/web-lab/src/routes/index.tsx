import { createFileRoute } from "@tanstack/react-router";
import { HomeView } from "@/components/bricklap/home-view";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <HomeView />;
}
