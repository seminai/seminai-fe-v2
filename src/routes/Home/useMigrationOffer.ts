import { useEffect, useState } from "react";

export interface MigrationOfferState {
  readonly taken: number;
  readonly cap: number;
  readonly remaining: number;
}

export const MIGRATION_OFFER_FALLBACK: MigrationOfferState = {
  taken: 143,
  cap: 200,
  remaining: 57,
};

function isOffer(value: unknown): value is MigrationOfferState {
  if (!value || typeof value !== "object") return false;
  const offer = value as Partial<MigrationOfferState>;
  return (
    typeof offer.taken === "number" &&
    typeof offer.cap === "number" &&
    typeof offer.remaining === "number"
  );
}

/** Public counter. Falls back to the floor when the API is missing or fails. */
export function useMigrationOffer(): MigrationOfferState {
  const [offer, setOffer] = useState<MigrationOfferState>(MIGRATION_OFFER_FALLBACK);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL;
    if (!base) return;
    const controller = new AbortController();
    const url = `${String(base).replace(/\/$/, "")}/public/migration-offer`;
    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (isOffer(body)) setOffer(body);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return offer;
}
