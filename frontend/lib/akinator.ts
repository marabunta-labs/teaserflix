// "The Oracle": an Akinator-style question engine on top of TMDB discover.
// Every answer narrows the discover query; after each one the UI asks TMDB how
// many movies are left and stops as soon as the pool is small enough.

import type { Locale } from "./i18n";

type L = Record<Locale, string>;

export interface OracleAnswer {
  label: L;
  /** TMDB discover params this answer contributes (none = "I don't care") */
  params?: Record<string, string>;
}

export interface OracleQuestion {
  id: string;
  text: L;
  answers: OracleAnswer[];
}

const ANY: OracleAnswer = { label: { en: "Don't care", es: "Me da igual" } };

export const BASE_PARAMS: Record<string, string> = {
  sort_by: "popularity.desc",
  "vote_count.gte": "100",
};

export const QUESTIONS: OracleQuestion[] = [
  {
    id: "mood",
    text: { en: "What do you feel like tonight?", es: "¿Qué te apetece sentir esta noche?" },
    answers: [
      { label: { en: "Laugh", es: "Reírme" }, params: { with_genres: "35" } },
      { label: { en: "Adrenaline", es: "Adrenalina" }, params: { with_genres: "28|53|12" } },
      { label: { en: "Get emotional", es: "Emocionarme" }, params: { with_genres: "18|10749" } },
      { label: { en: "Be scared", es: "Pasar miedo" }, params: { with_genres: "27" } },
      { label: { en: "Think", es: "Darle al coco" }, params: { with_genres: "878|9648|80" } },
      { label: { en: "Escape to another world", es: "Evadirme a otro mundo" }, params: { with_genres: "14|16|12" } },
    ],
  },
  {
    id: "company",
    text: { en: "Who's watching?", es: "¿Con quién la ves?" },
    answers: [
      { label: { en: "Just me", es: "Yo solo/a" } },
      { label: { en: "Partner", es: "En pareja" } },
      { label: { en: "Friends", es: "Con amigos" } },
      {
        label: { en: "With kids", es: "Con niños" },
        params: { without_genres: "27,53,80,10752" },
      },
    ],
  },
  {
    id: "era",
    text: { en: "Which era?", es: "¿De qué época?" },
    answers: [
      { label: { en: "Classics (before 1990)", es: "Clásicos (antes de 1990)" }, params: { "primary_release_date.lte": "1989-12-31" } },
      { label: { en: "1990 – 2009", es: "1990 – 2009" }, params: { "primary_release_date.gte": "1990-01-01", "primary_release_date.lte": "2009-12-31" } },
      { label: { en: "2010 – 2019", es: "2010 – 2019" }, params: { "primary_release_date.gte": "2010-01-01", "primary_release_date.lte": "2019-12-31" } },
      { label: { en: "2020 onwards", es: "Desde 2020" }, params: { "primary_release_date.gte": "2020-01-01" } },
      ANY,
    ],
  },
  {
    id: "length",
    text: { en: "How much time do you have?", es: "¿Cuánto tiempo tienes?" },
    answers: [
      { label: { en: "Short (< 100 min)", es: "Corta (< 100 min)" }, params: { "with_runtime.lte": "100" } },
      { label: { en: "Normal (100–130 min)", es: "Normal (100–130 min)" }, params: { "with_runtime.gte": "100", "with_runtime.lte": "130" } },
      { label: { en: "Epic (> 130 min)", es: "Épica (> 130 min)" }, params: { "with_runtime.gte": "130" } },
      ANY,
    ],
  },
  {
    id: "quality",
    text: { en: "What kind of movie?", es: "¿Qué tipo de peli?" },
    answers: [
      { label: { en: "Critically acclaimed", es: "Aclamada por la crítica" }, params: { sort_by: "vote_average.desc", "vote_average.gte": "7.5", "vote_count.gte": "1500" } },
      { label: { en: "Hidden gem", es: "Joya escondida" }, params: { sort_by: "vote_average.desc", "vote_average.gte": "7", "vote_count.gte": "100", "vote_count.lte": "1500" } },
      { label: { en: "Crowd-pleaser", es: "Éxito de masas" }, params: { "vote_count.gte": "1500" } },
      ANY,
    ],
  },
  {
    id: "language",
    text: { en: "Original language?", es: "¿Idioma original?" },
    answers: [
      { label: { en: "Spanish", es: "Español" }, params: { with_original_language: "es" } },
      { label: { en: "English", es: "Inglés" }, params: { with_original_language: "en" } },
      ANY,
    ],
  },
  {
    id: "platform",
    text: { en: "Where will you watch it?", es: "¿Dónde la vas a ver?" },
    answers: [
      { label: { en: "Netflix", es: "Netflix" }, params: { with_watch_providers: "8" } },
      { label: { en: "Prime Video", es: "Prime Video" }, params: { with_watch_providers: "119" } },
      { label: { en: "Disney+", es: "Disney+" }, params: { with_watch_providers: "337" } },
      { label: { en: "Max", es: "Max" }, params: { with_watch_providers: "1899" } },
      ANY,
    ],
  },
];

/** Stop asking once this few movies remain */
export const VERDICT_THRESHOLD = 8;

/** Merge the base query with every committed answer (later answers win). */
export function buildOracleParams(answers: OracleAnswer[]): Record<string, string> {
  const params: Record<string, string> = { ...BASE_PARAMS };
  for (const a of answers) Object.assign(params, a.params);
  if (params.with_watch_providers) {
    params.watch_region = "ES";
    params.with_watch_monetization_types = "flatrate";
  }
  return params;
}
