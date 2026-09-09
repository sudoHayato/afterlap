import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/bricklap/legal-doc";
import { LEGAL } from "@/lib/legal/config";

export const Route = createFileRoute("/legal/cookies")({ component: Cookies });

function Cookies() {
  return (
    <LegalDoc title="Cookies e armazenamento">
      <p>
        Na União Europeia, cookies e tecnologias semelhantes só exigem
        consentimento prévio quando não são estritamente necessários ao serviço
        que pediste (Diretiva 2002/58/CE, na redação em vigor, e orientação da
        CNPD sobre cookies).
      </p>

      <h2>O que usamos</h2>
      <p>
        <strong>Não usamos cookies de análise, publicidade ou redes sociais.</strong>{" "}
        Não há Google Analytics, Meta Pixel, nem identificadores de publicidade.
      </p>
      <p>
        Usamos <strong>armazenamento local do browser</strong>{" "}
        (<code className="text-foreground">localStorage</code>), chave{" "}
        <code className="text-foreground">{LEGAL.storageKey}</code>, para
        guardar as sessões que tu crias e recuperar uma sessão se o processo for
        interrompido. Sem isto a app não funciona. É equivalente a um cookie
        estritamente necessário: <strong>não pedimos consentimento</strong> para
        este armazenamento.
      </p>
      <p>
        O browser pode ainda guardar cookies técnicos de sessão do próprio
        alojamento (equilíbrio de carga, proteção). Não os usamos para te
        seguir entre sítios.
      </p>

      <h2>Tabela</h2>
      <ul>
        <li>
          <strong>{LEGAL.storageKey}</strong> — localStorage — histórico e
          sessão ao vivo — duração: até apagares os dados do sítio ou as
          sessões na app — necessário ao serviço.
        </li>
      </ul>

      <h2>Como apagar</h2>
      <p>
        Na app: apagar sessão a sessão. No browser: definições do sítio → limpar
        dados. Isso apaga o histórico neste aparelho de forma irreversível
        (não há cópia nossa).
      </p>

      <h2>Se no futuro houver cookies não essenciais</h2>
      <p>
        Só os colocaremos com consentimento prévio, granular e retirável, e com
        esta página atualizada. Um muro de cookies para o que já é necessário
        seria teatro, não cumprimento.
      </p>

      <p>
        Dados pessoais associados: ver{" "}
        <Link to="/legal/privacidade">Política de privacidade</Link>.
      </p>
    </LegalDoc>
  );
}
