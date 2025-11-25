import { useEffect, useState } from "react";

import { CultivarCatalog } from "../models/CultivarCatalog";

type UseCultivarHarvestDatesResponse = {
  catalog: CultivarCatalog | null;
  isLoading: boolean;
  error: Error | null;
};

const useCultivarHarvestDates = (): UseCultivarHarvestDatesResponse => {
  const [catalog, setCatalog] = useState<CultivarCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadCultivars = async () => {
      try {
        const response = await fetch("/datasets/varietà/date_raccolta.csv");
        if (!response.ok) {
          throw new Error("Failed to load cultivar dataset");
        }

        const csvText = await response.text();
        const parsedCatalog = CultivarCatalog.fromCsv(csvText);
        setCatalog(parsedCatalog);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    void loadCultivars();
  }, []);

  return { catalog, isLoading, error };
};

export { useCultivarHarvestDates };

