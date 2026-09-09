import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/bricklap/legal-doc";
import { LEGAL, identityComplete } from "@/lib/legal/config";

export const Route = createFileRoute("/legal/")({ component: LegalIndex });

function LegalIndex() {
  return (
    <LegalDoc title="Informação legal">
      <p>
        O Bricklap está em pré-lançamento. Destina-se a pessoas em{" "}
        {LEGAL.country} e na União Europeia. Estes textos seguem o RGPD, a Lei
        n.º 58/2019 e a legislação portuguesa aplicável. Não substituem aconselhamento
        jurídico.
      </p>
      {!identityComplete() ? (
        <p>
          <strong>Atenção:</strong> o responsável pelo tratamento ainda não está
          identificado ({LEGAL.controllerName}). Preenche os campos em{" "}
          <code className="text-foreground">src/lib/legal/config.ts</code> antes de
          um lançamento público.
        </p>
      ) : null}
      <ul>
        <li>
          <Link to="/legal/privacidade">Política de privacidade</Link> — RGPD,
          dados, direitos, CNPD
        </li>
        <li>
          <Link to="/legal/cookies">Cookies e armazenamento local</Link> — o que
          fica no dispositivo
        </li>
        <li>
          <Link to="/legal/termos">Termos de utilização</Link> — regras do
          protótipo
        </li>
        <li>
          <Link to="/legal/direitos-autor">Direitos de autor</Link> — copyright e
          marcas de terceiros
        </li>
      </ul>
    </LegalDoc>
  );
}
