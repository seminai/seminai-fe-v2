export interface FitosanitarioRecord {
  num_registrazione: string;
  denominazione_prodotto: string;
}

let cachedIndex: Map<string, string> | null = null;

export async function loadFitosanitariIndex(): Promise<Map<string, string>> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch("/datasets/fitosanitari/fts_06062025.json");
  const data = (await res.json()) as Array<Record<string, unknown>>;
  const map = new Map<string, string>();
  for (const row of data) {
    const name = String(row["denominazione_prodotto"] || "")
      .trim()
      .toLowerCase();
    const reg = String(row["num_registrazione"] || "").trim();
    if (name && reg) {
      map.set(name, reg);
    }
  }
  cachedIndex = map;
  return map;
}

export async function findRegNumberByName(
  name: string
): Promise<string | null> {
  if (!name) return null;
  const idx = await loadFitosanitariIndex();
  const exact = idx.get(name.trim().toLowerCase());
  if (exact) return exact;
  // fallback: match parziale
  for (const [k, v] of idx.entries()) {
    if (k.includes(name.trim().toLowerCase())) return v;
  }
  return null;
}
