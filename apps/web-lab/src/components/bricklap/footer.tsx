import { Link } from "@tanstack/react-router";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-5 pb-2">
      <p className="text-xs leading-relaxed text-subtle">{t("footer.preLaunch")}</p>
      <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Link to="/legal/privacidade" className="hover:text-foreground">
          {t("footer.privacy")}
        </Link>
        <Link to="/legal/cookies" className="hover:text-foreground">
          {t("footer.cookies")}
        </Link>
        <Link to="/legal/termos" className="hover:text-foreground">
          {t("footer.terms")}
        </Link>
        <Link to="/legal/direitos-autor" className="hover:text-foreground">
          {t("footer.copyright")}
        </Link>
      </nav>
    </footer>
  );
}
