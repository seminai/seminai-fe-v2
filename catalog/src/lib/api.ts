export interface PublicRule {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  region: string | null;
  version: string | null;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string | null;
  sourceDocument?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}
export interface RulePage {
  items: PublicRule[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}
export class PublicApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Public rules API returned ${status}`);
    this.status = status;
  }
}
/** Anonymous, uncached origin read: the HTML response owns the only freshness cache. */
export async function readPublic<T>(
  base: string,
  path: string,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(`${base}${path}`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    cache: "no-store",
    credentials: "omit",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new PublicApiError(response.status === 404 ? 404 : 503);
  const envelope = (await response.json()) as { status?: string; data?: T };
  if (envelope.status !== "success" || !envelope.data)
    throw new PublicApiError(503);
  return envelope.data;
}
export async function listRules(
  base: string,
  query: URLSearchParams,
  fetcher: typeof fetch = fetch,
): Promise<RulePage> {
  const data = await readPublic<{ rules: RulePage }>(
    base,
    `/public/rules?${query}`,
    fetcher,
  );
  const value = data.rules;
  if (
    !value ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.total) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    value.total < 0 ||
    typeof value.hasNextPage !== "boolean" ||
    !value.items.every(isRule)
  )
    throw new PublicApiError(503);
  return value;
}
export async function getRule(
  base: string,
  slug: string,
  fetcher: typeof fetch = fetch,
): Promise<PublicRule> {
  const data = await readPublic<{ rule: PublicRule }>(
    base,
    `/public/rules/${encodeURIComponent(slug)}`,
    fetcher,
  );
  if (!isRule(data.rule)) throw new PublicApiError(503);
  return data.rule;
}
function isRule(rule: unknown): rule is PublicRule {
  if (!rule || typeof rule !== "object") return false;
  const value = rule as Partial<PublicRule>;
  return (
    typeof value.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    (value.description === null || typeof value.description === "string")
  );
}
/** No fixed page cap: sitemap generation traverses the full public catalogue. */
export async function* rulePages(
  base: string,
  fetcher: typeof fetch = fetch,
): AsyncGenerator<PublicRule[]> {
  for (let page = 1; ; page++) {
    const result = await listRules(
      base,
      new URLSearchParams({ page: String(page), limit: "50" }),
      fetcher,
    );
    if (
      result.page !== page ||
      (result.hasNextPage && result.items.length === 0)
    )
      throw new PublicApiError(503);
    if (result.hasNextPage && page >= Math.ceil(result.total / result.limit))
      throw new PublicApiError(503);
    yield result.items;
    if (!result.hasNextPage) return;
  }
}

export async function listCategories(
  base: string,
  fetcher: typeof fetch = fetch,
): Promise<Array<{ category: string; count: number }>> {
  const data = await readPublic<{
    categories: Array<{ category: string; count: number }>;
  }>(base, "/public/rules/categories", fetcher);
  if (
    !Array.isArray(data.categories) ||
    !data.categories.every(
      (item) =>
        typeof item.category === "string" && Number.isInteger(item.count),
    )
  )
    throw new PublicApiError(503);
  return data.categories;
}
