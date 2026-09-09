import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { t } from "@/lib/i18n";
import { useBricklap } from "@/lib/store";
import "../styles.css";

function Hydrate() {
  const hydrate = useBricklap((s) => s.hydrate);
  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);
  return null;
}

/**
 * index.html ships the English title/description as a pre-hydration
 * fallback (there is no SSR to render locale-specific meta tags). Once the
 * app mounts, update both to match the detected locale.
 */
function LocalizeDocumentHead() {
  useLayoutEffect(() => {
    document.title = t("meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"));
  }, []);
  return null;
}

export const Route = createRootRoute({
  component: () => (
    <>
      <LocalizeDocumentHead />
      <Hydrate />
      <Outlet />
    </>
  ),
});
