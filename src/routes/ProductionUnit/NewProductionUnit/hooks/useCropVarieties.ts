import { useEffect, useState } from "react";

import type { CropVariety } from "../types";

type UseCropVarietiesResponse = {
  varieties: CropVariety[];
  isLoading: boolean;
  error: Error | null;
};

const useCropVarieties = (): UseCropVarietiesResponse => {
  const [varieties, setVarieties] = useState<CropVariety[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadVarieties = async () => {
      try {
        const response = await fetch("/datasets/varietà/index.json");
        if (!response.ok) {
          throw new Error("Failed to load crop varieties");
        }
        const data = await response.json();
        setVarieties(data as CropVariety[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    void loadVarieties();
  }, []);

  return { varieties, isLoading, error };
};

export { useCropVarieties };

