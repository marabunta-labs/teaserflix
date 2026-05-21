"use client";

/**
 * Minimal i18n system — no extra dependencies.
 * Language is persisted to localStorage and shared via React context.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type Locale = "en" | "es";
export const LOCALES: Locale[] = ["en", "es"];

// ─── Translation objects ─────────────────────────────────────────────────────

const en = {
  common: {
    loading: "Loading…",
    notFound: "Could not load information.",
    cancel: "Cancel",
  },
  feed: {
    loading: "Loading movies…",
    authTitle: "Personalize your feed",
    authDesc:
      "Sign in so the algorithm learns your taste. Without an account your experience won't be personalized.",
    loginRegister: "Sign in / Register",
    continueGuest: "Continue without account →",
    toastSave: "Sign in to save to your watchlist",
    toastSignIn: "Sign in →",
    clearFilters: "Clear ×",
    toastLinkCopied: "Link copied!",
    shareText: "Check out",
    shareVia: "Share via TeaserFlix",
  },
  filter: {
    onlyWithTrailer: "Trailer required",
    onlyWithTrailerDesc: "Hide movies without available video",
    genres: "Genres",
    platforms: "Platforms",
    clear: "Clear",
    apply: "Apply",
  },
  search: {
    placeholder: "Search movie…",
    hint: "Type to search…",
    noResultsPrefix: "No results for",
  },
  moviePanel: {
    availableOn: "Available on",
    cast: "Cast",
    similarMovies: "Similar movies",
    filmography: "Filmography",
    watchInFeed: "Watch trailer",
    noTrailer: "No trailer available",
    addToWatchlist: "+ Add to watchlist",
    inWatchlist: "✓ In your watchlist — remove",
    loginToSave: "Sign in to save this movie",
    loginLink: "Sign in →",
    guestSaveTitle: "Sign in to save",
    guestSaveDesc:
      "Save this movie to your watchlist and access it from any device.",
  },
  profile: {
    title: "Profile",
    myWatchlist: "My Watchlist",
    preferences: "Genre & Platform Preferences",
    signOut: "Sign out",
    guestTitle: "Sign in",
    guestDesc:
      "Sign in to save movies and access your list from any device.",
    empty: "Your watchlist is empty",
    emptyDesc:
      "Save trailers from the feed by pressing the bookmark icon.",
    goToFeed: "Go to feed →",
    removeFromWatchlist: "Remove from watchlist",
    movie: "movie",
    movies: "movies",
  },
  onboarding: {
    genresTitle: "What do you like",
    genresTitleHighlight: "to watch?",
    genresDesc: "Choose at least 3 genres to personalize your feed.",
    chooseMorePrefix: "Choose",
    chooseMoreSuffix: "more",
    next: "Next →",
    platformsTitle: "Where do you",
    platformsTitleHighlight: "watch?",
    platformsDesc:
      "Select your platforms to see what's available for you.",
    platformsOptional: "(Optional — you can skip it)",
    back: "← Back",
    saving: "Saving…",
    start: "Start watching!",
  },
  login: {
    passwordPlaceholder: "Password",
    signIn: "Sign in",
    createAccount: "Create account",
    googleContinue: "Continue with Google",
    switchToSignUp: "No account? Sign up for free",
    switchToSignIn: "Already have an account? Sign in",
    guestNote:
      "Without an account the feed won't be personalized, but you can take a look.",
    continueGuest: "Continue without account →",
    successMessage:
      "Account created! Check your email to confirm.",
    forgotPassword: "Forgot your password?",
    forgotTitle: "Reset your password",
    forgotDesc: "Enter your email and we\u2019ll send you a reset link.",
    sendReset: "Send reset link",
    resetSent: "Check your email for the reset link.",
    backToLogin: "← Back to sign in",
  },
};

const es: typeof en = {
  common: {
    loading: "Cargando…",
    notFound: "No se pudo cargar la información.",
    cancel: "Cancelar",
  },
  feed: {
    loading: "Cargando cartelera…",
    authTitle: "Personaliza tu feed",
    authDesc:
      "Inicia sesión para que el algoritmo aprenda tus gustos. Sin cuenta la experiencia no estará personalizada.",
    loginRegister: "Iniciar sesión / Registrarse",
    continueGuest: "Continuar sin cuenta →",
    toastSave: "Inicia sesión para guardar en tu watchlist",
    toastSignIn: "Entrar →",
    clearFilters: "Limpiar ×",
    toastLinkCopied: "¡Enlace copiado!",
    shareText: "Mira",
    shareVia: "Comparte vía TeaserFlix",
  },
  filter: {
    onlyWithTrailer: "Solo con tráiler",
    onlyWithTrailerDesc: "Oculta películas sin vídeo disponible",
    genres: "Géneros",
    platforms: "Plataformas",
    clear: "Limpiar",
    apply: "Aplicar",
  },
  search: {
    placeholder: "Buscar película…",
    hint: "Escribe para buscar…",
    noResultsPrefix: "Sin resultados para",
  },
  moviePanel: {
    availableOn: "Disponible en",
    cast: "Reparto",
    similarMovies: "Películas similares",
    filmography: "Filmografía",
    watchInFeed: "Ver tráiler",
    noTrailer: "Sin tráiler disponible",
    addToWatchlist: "+ Añadir a watchlist",
    inWatchlist: "✓ En tu watchlist — quitar",
    loginToSave: "Inicia sesión para guardar esta película",
    loginLink: "Iniciar sesión →",
    guestSaveTitle: "Inicia sesión para guardar",
    guestSaveDesc:
      "Guarda esta película en tu watchlist y accede desde cualquier dispositivo.",
  },
  profile: {
    title: "Perfil",
    myWatchlist: "Mi Watchlist",
    preferences: "Preferencias de géneros y plataformas",
    signOut: "Cerrar sesión",
    guestTitle: "Iniciar sesión",
    guestDesc:
      "Inicia sesión para guardar películas y acceder a tu lista desde cualquier dispositivo.",
    empty: "Tu watchlist está vacía",
    emptyDesc:
      "Guarda tráilers desde el feed pulsando el icono de marcador.",
    goToFeed: "Ir al feed →",
    removeFromWatchlist: "Quitar de watchlist",
    movie: "película",
    movies: "películas",
  },
  onboarding: {
    genresTitle: "¿Qué te gusta",
    genresTitleHighlight: "ver?",
    genresDesc: "Elige al menos 3 géneros para personalizar tu feed.",
    chooseMorePrefix: "Elige",
    chooseMoreSuffix: "más",
    next: "Siguiente →",
    platformsTitle: "¿Dónde",
    platformsTitleHighlight: "ves?",
    platformsDesc:
      "Selecciona tus plataformas para ver qué hay disponible para ti.",
    platformsOptional: "(Opcional — puedes saltarlo)",
    back: "← Atrás",
    saving: "Guardando…",
    start: "¡Empezar a ver!",
  },
  login: {
    passwordPlaceholder: "Contraseña",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    googleContinue: "Continuar con Google",
    switchToSignUp: "¿Sin cuenta? Regístrate gratis",
    switchToSignIn: "¿Ya tienes cuenta? Inicia sesión",
    guestNote:
      "Sin cuenta el feed no será personalizado, pero puedes echar un vistazo.",
    continueGuest: "Continuar sin cuenta →",
    successMessage:
      "¡Cuenta creada! Revisa tu email para confirmar la cuenta.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    forgotTitle: "Recupera tu contraseña",
    forgotDesc: "Introduce tu email y te enviaremos un enlace para restablecerla.",
    sendReset: "Enviar enlace",
    resetSent: "Revisa tu email para el enlace de recuperación.",
    backToLogin: "← Volver al inicio de sesión",
  },
};

const translations: Record<Locale, typeof en> = { en, es };

// ─── Context ─────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: typeof en;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "es",
  setLocale: () => {},
  t: es,
});

const STORAGE_KEY = "teaserflix_locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  // Load persisted locale on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.includes(stored)) setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/** Returns `{ t, locale, setLocale }`. Use `t.section.key` for any string. */
export function useTranslation() {
  return useContext(LanguageContext);
}
