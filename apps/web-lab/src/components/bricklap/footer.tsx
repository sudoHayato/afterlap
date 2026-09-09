import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-5 pb-2">
      <p className="text-xs leading-relaxed text-subtle">
        Pré-lançamento. Os treinos ficam neste dispositivo. Sem contas, sem
        publicidade, sem cookies de rastreio.
      </p>
      <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Link to="/legal/privacidade" className="hover:text-foreground">
          Privacidade
        </Link>
        <Link to="/legal/cookies" className="hover:text-foreground">
          Cookies
        </Link>
        <Link to="/legal/termos" className="hover:text-foreground">
          Termos
        </Link>
        <Link to="/legal/direitos-autor" className="hover:text-foreground">
          Copyright
        </Link>
      </nav>
    </footer>
  );
}
