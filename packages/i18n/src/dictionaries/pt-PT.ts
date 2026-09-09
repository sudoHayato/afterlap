import type { Dictionary } from "../dictionary";

/**
 * First translation. Mirrors the wording the Android app already shipped
 * with in session 01 (Iniciar/Mudar/Parar and friends), now sourced from
 * here instead of being hard-coded in the component.
 */
export const ptPT: Dictionary = {
  common: {
    start: "Iniciar",
    stop: "Parar",
    change: "Mudar",
    cancel: "Cancelar",
    done: "Concluído",
    home: "Início",
    back: "Voltar",
    discard: "Descartar",
    distance: "Distância",
    pace: "Ritmo",
    speed: "Velocidade",
    segments: "Segmentos",
    time: "Tempo",
    summary: "Resumo",
    phone: "Telemóvel",
    live: "Ao vivo",
    openingSession: "A abrir sessão…",
    watch: "Relógio",
    close: "Fechar",
  },
  sport: {
    run: { label: "Corrida", live: "A correr" },
    bike: { label: "Bicicleta", live: "De bicicleta" },
    walk: { label: "Caminhada", live: "A caminhar" },
    transition: { label: "Transição", live: "Transição" },
  },
  footer: {
    preLaunch:
      "Pré-lançamento. Os treinos ficam neste dispositivo. Sem contas, sem publicidade, sem cookies de rastreio.",
    privacy: "Privacidade",
    cookies: "Cookies",
    terms: "Termos",
    copyright: "Direitos de autor",
  },
  home: {
    kicker: "Laboratório",
    eyebrow: "Sessão, não desporto",
    taglineLine1: "Começa uma vez.",
    taglineLine2: "Treina à vontade.",
    subtitle: "Muda de desporto sem parar a sessão. Telemóvel para o registo. Relógio para a volta.",
    liveBadge: "Ao vivo · telemóvel",
    openWatch: "Abrir mostrador do relógio",
    firstSport: "Primeiro desporto",
    startOnWatch: "Iniciar no relógio",
    history: "Histórico",
    noSessions: "Ainda sem sessões.",
  },
  live: {
    noLiveSession: "Sem sessão ao vivo.",
    segment: "Segmento",
    nextSportTitle: "Próximo desporto",
    nextSportCopy: "A sessão continua aberta. Só o segmento muda.",
    endSessionTitle: "Terminar sessão?",
    endSessionCopy: "Todos os segmentos ficam na fita.",
    endSessionConfirm: "Terminar sessão",
  },
  summary: {
    notFound: "Sessão não está neste dispositivo.",
    segmentsOne: "segmento",
    segmentsOther: "segmentos",
    deleteSession: "Eliminar sessão",
  },
  watch: {
    kicker: "Mostrador do relógio",
    laps: "voltas",
    idleHint: "Iniciar. Volta muda de desporto. A sessão nunca se divide.",
    disclaimer:
      "Isto é a experiência do relógio — não é um Garmin emparelhado. Um Fenix faria as mesmas três ações no dispositivo. O GPS vive no relógio; o telemóvel só lê a sessão.",
    liveLog: "Registo ao vivo",
    lap: "Volta",
  },
  trackMap: {
    ariaLabel: "Percurso da sessão",
    waitingForMovement: "À espera de movimento",
  },
  mobile: {
    kicker: "Android · GPS simulado",
    initialSport: "Desporto inicial",
    idleHint:
      "Carrega em Iniciar uma vez. Depois podes Mudar de desporto sem parar o relógio e Parar apenas no fim.",
    totalDistanceLabel: "Distância total",
    currentSegment: "Segmento atual",
    changeTo: "Mudar para…",
    newSession: "Nova sessão",
    samples: "Amostras",
    liveSuffix: " · ao vivo",
  },
  meta: {
    title: "Bricklap",
    description: "Começa uma vez. Treina à vontade. Uma sessão é uma sequência de desportos.",
  },
};
