import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { useBricklap } from "@/lib/store";
import "../styles.css";

function Hydrate() {
  const hydrate = useBricklap((s) => s.hydrate);
  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

export const Route = createRootRoute({
  component: () => (
    <>
      <Hydrate />
      <Outlet />
    </>
  ),
});
