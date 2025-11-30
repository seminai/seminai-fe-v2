import authService from "./auth";

/**
 * Configurazione per il polling dell'autenticazione
 */
export interface AuthPollingConfig {
  /** Intervallo tra i tentativi di polling in millisecondi */
  pollingInterval: number;
  /** Numero massimo di tentativi di polling */
  maxAttempts: number;
}

/**
 * Callback chiamato quando l'utente viene autenticato durante il polling
 */
export type OnAuthenticatedCallback = () => void;

/**
 * Tipo per la funzione di refetch
 */
export type RefetchFunction = () => Promise<unknown>;

/**
 * Interfaccia per il servizio di polling dell'autenticazione
 */
export interface AuthPollingService {
  setRefetchFunction: (refetchFn: RefetchFunction) => void;
  setOnAuthenticatedCallback: (callback: OnAuthenticatedCallback) => void;
  handleWakeUpSuccess: () => Promise<void>;
  startPolling: (hasUserData: boolean) => void;
  stopPolling: () => void;
  handleAuthenticationSuccess: () => void;
  cleanup: () => void;
  isPollingActive: () => boolean;
}

/**
 * Crea un'istanza del servizio di polling per l'autenticazione
 * @param config - Configurazione opzionale per il polling
 * @returns Un oggetto con i metodi per gestire il polling dell'autenticazione
 */
export function createAuthPollingService(
  config: Partial<AuthPollingConfig> = {}
): AuthPollingService {
  // Stato privato mantenuto nella closure
  let pollingIntervalId: NodeJS.Timeout | null = null;
  let pollingAttempts: number = 0;
  let refetchMeFn: RefetchFunction | null = null;
  let onAuthenticatedCallback: OnAuthenticatedCallback | null = null;
  let hasRefetchedAfterWakeUp: boolean = false;
  let isRefetching: boolean = false; // Flag per prevenire chiamate multiple simultanee

  const finalConfig: AuthPollingConfig = {
    pollingInterval: config.pollingInterval ?? 3000, // 3 secondi di default (ridotto carico sul backend)
    maxAttempts: config.maxAttempts ?? 10, // 10 tentativi di default (circa 30 secondi totali)
  };

  /**
   * Esegue un ciclo di polling
   * Protegge contro chiamate multiple simultanee
   */
  const executePollingCycle = async (): Promise<void> => {
    if (!refetchMeFn) {
      stopPolling();
      return;
    }

    // Se c'è già una chiamata in corso, salta questo ciclo
    if (isRefetching) {
      return;
    }

    pollingAttempts += 1;

    // Ferma il polling se abbiamo raggiunto il numero massimo di tentativi
    if (pollingAttempts >= finalConfig.maxAttempts) {
      stopPolling();
      return;
    }

    // Imposta il flag per prevenire chiamate multiple simultanee
    isRefetching = true;

    try {
      await refetchMeFn();
    } catch (error) {
      console.error("Error polling user authentication:", error);
    } finally {
      // Reset del flag dopo che la chiamata è completata (o fallita)
      isRefetching = false;
    }
  };

  /**
   * Ferma il polling e resetta lo stato
   */
  const stopPolling = (): void => {
    if (pollingIntervalId !== null) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    pollingAttempts = 0;
    // Non resettiamo isRefetching qui perché potrebbe esserci una chiamata in corso
    // che deve completarsi naturalmente
  };

  /**
   * Imposta la funzione di refetch da chiamare durante il polling
   */
  const setRefetchFunction = (refetchFn: RefetchFunction): void => {
    refetchMeFn = refetchFn;
  };

  /**
   * Imposta il callback da chiamare quando l'utente viene autenticato
   */
  const setOnAuthenticatedCallback = (
    callback: OnAuthenticatedCallback
  ): void => {
    onAuthenticatedCallback = callback;
  };

  /**
   * Esegue un refetch immediato quando il backend si risveglia
   * Protegge contro chiamate multiple simultanee
   */
  const handleWakeUpSuccess = async (): Promise<void> => {
    if (hasRefetchedAfterWakeUp || !refetchMeFn || isRefetching) {
      return;
    }

    hasRefetchedAfterWakeUp = true;
    isRefetching = true;

    try {
      await refetchMeFn();
    } catch (error) {
      console.error("Error refetching user data after wake-up:", error);
    } finally {
      isRefetching = false;
    }
  };

  /**
   * Avvia il polling periodico per verificare l'autenticazione
   * Solo se c'è un token nel cookie ma i dati utente non sono ancora disponibili
   */
  const startPolling = (hasUserData: boolean): void => {
    // Se i dati utente sono già disponibili, non serve fare polling
    if (hasUserData) {
      return;
    }

    // Verifica se c'è un token nel cookie
    const hasToken = authService.isAuthenticated();
    if (!hasToken) {
      return;
    }

    // Se il polling è già attivo, non avviarlo di nuovo
    if (pollingIntervalId !== null) {
      return;
    }

    // Reset del contatore di tentativi
    pollingAttempts = 0;

    // Avvia il polling
    pollingIntervalId = setInterval(() => {
      executePollingCycle();
    }, finalConfig.pollingInterval);
  };

  /**
   * Gestisce il caso in cui l'utente viene autenticato
   * Ferma il polling e chiama il callback se presente
   */
  const handleAuthenticationSuccess = (): void => {
    stopPolling();
    hasRefetchedAfterWakeUp = false;

    if (onAuthenticatedCallback) {
      onAuthenticatedCallback();
    }
  };

  /**
   * Pulisce tutte le risorse e resetta lo stato
   */
  const cleanup = (): void => {
    stopPolling();
    refetchMeFn = null;
    onAuthenticatedCallback = null;
    hasRefetchedAfterWakeUp = false;
    isRefetching = false;
  };

  /**
   * Verifica se il polling è attualmente attivo
   */
  const isPollingActive = (): boolean => {
    return pollingIntervalId !== null;
  };

  // Ritorna l'oggetto con l'API pubblica
  return {
    setRefetchFunction,
    setOnAuthenticatedCallback,
    handleWakeUpSuccess,
    startPolling,
    stopPolling,
    handleAuthenticationSuccess,
    cleanup,
    isPollingActive,
  };
}

// Export di default per compatibilità con il codice esistente
export default createAuthPollingService;
