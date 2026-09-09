/**
 * Textos legais do laboratório web Bricklap, redigidos pelo Grok / Grok Build.
 * Jurisdição considerada: Portugal e União Europeia. Língua: pt-PT.
 * Identidade do responsável: preencher antes de um lançamento público.
 */
export const LEGAL = {
  appName: "Bricklap",
  tagline: "Start once. Train freely.",
  locale: "pt-PT",
  lastUpdated: "8 de setembro de 2026",
  lastUpdatedIso: "2026-09-08",
  country: "Portugal",
  law: "Direito português e da União Europeia",
  courts: "Tribunais portugueses competentes",
  /** Pessoa singular ou sociedade */
  controllerName: "[NOME COMPLETO OU DENOMINAÇÃO SOCIAL]",
  address: "[MORADA COMPLETA, CÓDIGO POSTAL, LOCALIDADE, PORTUGAL]",
  nif: "[NIF]",
  email: "[EMAIL DE CONTACTO PARA PRIVACIDADE]",
  dpoEmail: null as string | null,
  cnpdUrl: "https://www.cnpd.pt",
  cnpdName: "Comissão Nacional de Proteção de Dados (CNPD)",
  minAge: 16,
  storageKey: "bricklap.v1",
} as const;

export function identityComplete() {
  return !LEGAL.controllerName.includes("[") && !LEGAL.email.includes("[");
}
