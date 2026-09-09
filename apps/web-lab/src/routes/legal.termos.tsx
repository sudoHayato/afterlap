import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/afterlap/legal-doc";
import { LEGAL } from "@/lib/legal/config";

export const Route = createFileRoute("/legal/termos")({ component: Termos });

function Termos() {
  return (
    <LegalDoc title="Termos de utilização">
      <p>
        Estes termos regulam o uso do {LEGAL.appName} em pré-lançamento. Ao
        usar a app, aceitas este texto. Se não aceitares, não uses o serviço.
      </p>
      <p>
        Redigidos em português. Lei aplicável: {LEGAL.law}. Foro: {LEGAL.courts},
        sem prejuízo de normas imperativas de defesa do consumidor no teu Estado
        de residência na UE.
      </p>

      <h2>1. O que isto é (e o que não é)</h2>
      <p>
        O {LEGAL.appName} é um <strong>protótipo funcional</strong> de um diário
        de treino em que uma sessão pode ter vários desportos. O motor (sessão →
        eventos → segmentos) é real. A app web atual{" "}
        <strong>não é</strong> o produto nativo para Android, iOS ou Garmin.
      </p>
      <p>
        O GPS nesta prévia é, em regra, <strong>simulado</strong>. Distâncias e
        ritmos de demonstração não substituem um relógio de treino.
      </p>
      <p>
        Não é dispositivo médico. Não dá conselhos de saúde. Não está afiliado à
        Garmin, Strava, Apple, Google nem a qualquer marca de desporto citada
        como referência de produto.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>
        Idade mínima: {LEGAL.minAge} anos. O serviço destina-se a utilização
        pessoal, não profissional de saúde.
      </p>

      <h2>3. A tua responsabilidade</h2>
      <ul>
        <li>Usas o serviço por tua conta e risco, inclusive ao treinar.</li>
        <li>Não sobrecarregas, não tentas aceder a sistemas alheios, não usas a app para vigiar terceiros.</li>
        <li>Os treinos neste dispositivo são teus. Faz cópia se te importarem — nesta versão não há nuvem.</li>
      </ul>

      <h2>4. A nossa responsabilidade</h2>
      <p>
        Software em pré-lançamento: pode falhar, perder sessões, mostrar números
        errados. Na medida máxima permitida pela lei portuguesa, o serviço é
        oferecido «tal como está». Nada disto limita direitos inderrogáveis do
        consumidor quando existirem.
      </p>
      <p>
        Responsável: {LEGAL.controllerName}, {LEGAL.address}.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        O software, o nome Afterlap e a identidade visual estão reservados.
        Detalhe em <Link to="/legal/direitos-autor">Direitos de autor</Link>.
        Os dados do teu treino (o conteúdo que geras) pertencem-te.
      </p>

      <h2>6. Dados pessoais</h2>
      <p>
        Tratamento descrito na{" "}
        <Link to="/legal/privacidade">Política de privacidade</Link>. Cookies e
        armazenamento local: <Link to="/legal/cookies">Cookies</Link>.
      </p>

      <h2>7. Alterações e contacto</h2>
      <p>
        Podemos atualizar estes termos. A data no topo vale. Contacto:{" "}
        {LEGAL.email}.
      </p>
    </LegalDoc>
  );
}
