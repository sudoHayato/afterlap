import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell, Wordmark } from "@/components/bricklap/shell";
import { LEGAL } from "@/lib/legal/config";

export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AppShell>
      <Wordmark />
      <article className="mt-10 pb-8">
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Informação legal
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-tight">{title}</h1>
        <p className="mt-3 text-xs text-subtle">
          Última atualização: {LEGAL.lastUpdated} · {LEGAL.country}
        </p>
        <div className="legal-prose mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
        <nav className="mt-12 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link to="/legal" className="hover:text-foreground">
            Índice
          </Link>
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
            Direitos de autor
          </Link>
          <Link to="/" className="hover:text-foreground">
            App
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
