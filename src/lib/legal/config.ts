/**
 * Preenche estes campos ANTES de um lançamento público.
 * Sem identidade do responsável, a Política de Privacidade não cumpre o art. 13.º do RGPD.
 */
export const LEGAL = {
  appName: "Afterlap",
  tagline: "Start once. Train freely.",
  lastUpdated: "8 de setembro de 2026",
  lastUpdatedIso: "2026-09-08",
  country: "Portugal",
  law: "Direito português",
  courts: "Tribunais da comarca de Lisboa",
  /** Pessoa singular ou sociedade — OBRIGATÓRIO para RGPD */
  controllerName: "[NOME COMPLETO OU DENOMINAÇÃO SOCIAL]",
  /** Morada em Portugal */
  address: "[MORADA COMPLETA, CÓDIGO POSTAL, LOCALIDADE, PORTUGAL]",
  nif: "[NIF]",
  email: "[EMAIL DE CONTACTO PARA PRIVACIDADE]",
  /** Opcional: só se existir Enc. Proteção de Dados */
  dpoEmail: null as string | null,
  cnpdUrl: "https://www.cnpd.pt",
  cnpdName: "Comissão Nacional de Proteção de Dados (CNPD)",
  minAge: 16,
  storageKey: "afterlap.v1",
} as const;

export function identityComplete() {
  return !LEGAL.controllerName.includes("[") && !LEGAL.email.includes("[");
}
