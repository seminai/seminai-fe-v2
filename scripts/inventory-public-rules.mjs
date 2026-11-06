import { rulePages } from "../catalog/src/lib/api.ts";
const base = process.env.HUB_API_BASE_URL ??
  "https://seminai-be-v2-661301438659.europe-west1.run.app";
try {
  const rules = new Map();
  for await (const page of rulePages(base))
    for (const rule of page)
      rules.set(rule.slug, {
        source: `https://app.seminai.tech/hub/rules/${rule.slug}/`,
        destination: `https://seminai.tech/regole/${rule.slug}/`,
        english: `https://seminai.tech/en/rules/${rule.slug}/`,
        ...(rule.sourceUrl ? { originalDocument: rule.sourceUrl } : {}),
      });
  process.stdout.write(JSON.stringify({
    capturedAt: new Date().toISOString(),
    source: base,
    total: rules.size,
    rules: [...rules.values()],
  }, null, 2) + "\n");
} catch {
  console.error("Cannot inventory the public rules API. No partial migration map was written.");
  process.exitCode = 1;
}
