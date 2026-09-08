import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/afterlap/legal-doc";
import { LEGAL } from "@/lib/legal/config";

export const Route = createFileRoute("/legal/privacidade")({
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalDoc title="Política de privacidade">
      <p>
        Esta política informa-te, nos termos dos artigos 13.º e 14.º do Regulamento
        (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto, sobre o
        tratamento de dados pessoais no {LEGAL.appName}.
      </p>

      <h2>1. Responsável pelo tratamento</h2>
      <p>
        {LEGAL.controllerName}
        <br />
        {LEGAL.address}
        <br />
        NIF: {LEGAL.nif}
        <br />
        Correio: {LEGAL.email}
      </p>
      {LEGAL.dpoEmail ? (
        <p>Encarregado de proteção de dados: {LEGAL.dpoEmail}</p>
      ) : (
        <p>
          Não está designado encarregado de proteção de dados. O contacto para
          exercer direitos é {LEGAL.email}.
        </p>
      )}

      <h2>2. Que dados tratamos</h2>
      <p>Na versão atual (pré-lançamento, sem contas):</p>
      <ul>
        <li>
          <strong>Sessões de treino que tu inicias:</strong> desporto, marcações
          de tempo, eventos de mudança de modalidade, amostras de percurso
          (coordenadas, instante, velocidade estimada).
        </li>
        <li>
          <strong>Preferências técnicas mínimas</strong> para reabrir uma sessão
          se o separador fechar (recuperação local).
        </li>
      </ul>
      <p>Não pedimos nome, correio, palavra-passe, cartão, nem identificador de conta.</p>
      <p>
        Não tratamos categorias especiais do artigo 9.º do RGPD (saúde, origem
        racial, etc.). Não há frequência cardíaca, VO₂ nem dados médicos. Um
        percurso GPS de corrida é dado de localização — dado pessoal — não é, por
        si, um dado de saúde.
      </p>
      <p>
        Nesta prévia web o percurso é <strong>simulado</strong>, salvo se no
        futuro ativares GPS real do dispositivo. Aí as coordenadas serão as do
        teu movimento.
      </p>

      <h2>3. Onde são tratados</h2>
      <p>
        Os treinos são gravados <strong>apenas neste dispositivo</strong>, em
        armazenamento local do browser (chave técnica{" "}
        <code className="text-foreground">{LEGAL.storageKey}</code>). Não
        enviamos o histórico para um servidor nosso.
      </p>
      <p>
        Se a app estiver alojada num serviço de hosting, esse fornecedor pode
        tratar dados de conexão (endereço IP, data, user-agent) nos seus
        registos de segurança — tratamento acessório, típico de qualquer sítio
        na internet. Não usamos esses registos para perfilar treinos.
      </p>

      <h2>4. Finalidades e bases legais</h2>
      <ul>
        <li>
          <strong>Prestar o serviço que pediste</strong> (registar uma sessão
          multi-desporto, mudar de modalidade, ver histórico): art. 6.º n.º 1
          al. b) do RGPD (execução de um serviço solicitado).
        </li>
        <li>
          <strong>Manter a sessão se o processo for interrompido</strong>{" "}
          (recuperação local): mesma base.
        </li>
        <li>
          <strong>Segurança e funcionamento da hospedagem</strong> (se aplicável):
          art. 6.º n.º 1 al. f) — interesse legítimo em manter o serviço
          disponível e íntegro. Podes opor-te; a oposição pode impedir o uso da
          app na internet.
        </li>
      </ul>
      <p>Não vendemos dados. Não fazemos publicidade comportamental.</p>

      <h2>5. Destinatários e transferências</h2>
      <p>
        Não partilhamos o teu histórico de treino com terceiros. Não há
        sincronização na nuvem nesta versão.
      </p>
      <p>
        Se o hosting estiver fora da UE, aplicam-se as regras do capítulo V do
        RGPD (decisão de adequação ou cláusulas-tipo). Enquanto o tratamento
        relevante for local no teu aparelho, o risco principal é o próprio
        dispositivo.
      </p>

      <h2>6. Prazos de conservação</h2>
      <p>
        Conservamos os treinos no dispositivo até tu os apagares (sessão a
        sessão, ou limpando os dados do sítio no browser). Não há cópia nossa
        para apagar num servidor de aplicação.
      </p>

      <h2>7. Os teus direitos</h2>
      <p>Nos termos dos artigos 15.º a 22.º do RGPD, podes:</p>
      <ul>
        <li>aceder aos dados;</li>
        <li>retificar;</li>
        <li>apagar («direito a ser esquecido»);</li>
        <li>limitar o tratamento;</li>
        <li>opor-te (quando a base for interesse legítimo);</li>
        <li>portabilidade (exportação — ainda não há botão; podes pedir);</li>
        <li>retirar um consentimento, se no futuro o pedirmos, sem afetar o passado.</li>
      </ul>
      <p>
        Exercício: {LEGAL.email}. Resposta no prazo legal (em regra um mês).
        Localmente podes apagar sessões na própria app.
      </p>
      <p>Não há decisões exclusivamente automatizadas com efeitos legais.</p>

      <h2>8. Menores</h2>
      <p>
        O {LEGAL.appName} não se destina a menores de {LEGAL.minAge} anos.
        Georreferenciação de treino não é um serviço para crianças. Se
        descobrirmos dados de um menor abaixo dessa idade, apagamo-los.
      </p>

      <h2>9. Segurança</h2>
      <p>
        Medida principal nesta versão: os dados não saem do aparelho. Quem tiver
        acesso físico ou à conta do browser pode vê-los. Usa um aparelho com
        bloqueio de ecrã. Não é um cofre hospitalar — é um diário de treino no
        telemóvel.
      </p>

      <h2>10. Reclamação</h2>
      <p>
        Tens o direito de apresentar reclamação à {LEGAL.cnpdName}:{" "}
        <a href={LEGAL.cnpdUrl} rel="noreferrer" target="_blank">
          {LEGAL.cnpdUrl}
        </a>
        . Morada da CNPD: Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa.
      </p>

      <h2>11. Alterações</h2>
      <p>
        Se o tratamento mudar (contas, nuvem, Garmin, pulsómetro), atualizamos
        esta política e a data no topo. Uma conta na nuvem será um tratamento
        novo — não o faremos em silêncio.
      </p>

      <p>
        Ver também <Link to="/legal/cookies">Cookies</Link> e{" "}
        <Link to="/legal/termos">Termos</Link>.
      </p>
    </LegalDoc>
  );
}
