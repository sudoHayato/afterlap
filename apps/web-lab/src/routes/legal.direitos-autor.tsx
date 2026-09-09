import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/afterlap/legal-doc";
import { LEGAL } from "@/lib/legal/config";

export const Route = createFileRoute("/legal/direitos-autor")({
  component: DireitosAutor,
});

function DireitosAutor() {
  return (
    <LegalDoc title="Direitos de autor">
      <p>
        Protegido pelo Código do Direito de Autor e dos Direitos Conexos
        (Decreto-Lei n.º 63/85, na redação em vigor) e demais legislação da União
        Europeia. Todos os direitos reservados, salvo indicação em contrário.
      </p>

      <h2>Titular</h2>
      <p>
        © {new Date().getFullYear()} {LEGAL.controllerName}. A denominação{" "}
        <strong>Afterlap</strong>, o símbolo da pista/volta e a interface são
        criações originais deste projeto. Proibida a reprodução, distribuição ou
        comunicação ao público para fins comerciais sem autorização.
      </p>
      <p>
        Podes usar a app para o fim a que se destina (registar os teus treinos).
        Isso não te transfere a titularidade do software.
      </p>

      <h2>O que é teu</h2>
      <p>
        As sessões que registas (percursos, tempos, sequência de desportos) são
        conteúdo gerado por ti. Não reivindicamos a autoria desses dados.
      </p>

      <h2>Software e tipos de terceiros</h2>
      <p>
        A app usa bibliotecas com licenças próprias (React, TanStack, Lucide,
        entre outras), que se mantêm. As famílias tipográficas IBM Plex e Barlow
        Condensed são usadas nos termos das respetivas licenças SIL OFL.
      </p>

      <h2>Marcas de terceiros</h2>
      <p>
        Garmin®, Strava®, Apple®, Ironman® e outras marcas eventualmente
        mencionadas pertencem aos seus titulares. São usadas apenas para
        descrever o problema de produto. Não há patrocínio, parceria nem
        endosso.
      </p>
      <p>
        Um ecrã «watch face» nesta prévia é um estudo de interação. Não é uma
        app Connect IQ, não corre num relógio Garmin e não acede à API Garmin.
      </p>

      <h2>Contacto</h2>
      <p>
        Questões de copyright: {LEGAL.email}. Ver também os{" "}
        <Link to="/legal/termos">Termos</Link>.
      </p>
    </LegalDoc>
  );
}
