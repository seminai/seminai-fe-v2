import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const output =
  process.env.SEO_PERFORMANCE_DIR ?? "/tmp/seminai-lighthouse-final";
mkdirSync(output, { recursive: true });
const targets = [
  ["home", "http://127.0.0.1:8765/"],
  ["article", "http://127.0.0.1:8765/news/dati-sparsi-azienda-agricola/"],
  ["commercial", "http://127.0.0.1:8765/en/agricultural-document-ocr/"],
  ["catalogue", "http://127.0.0.1:8770/en/rules/"],
  ["rule", "http://127.0.0.1:8770/en/rules/synthetic-rule-1/"],
];
const results = [];
let version;
for (const [template, url] of targets) {
  const samples = [];
  for (let run = 0; run < 3; run++) {
    const path = `${output}/${template}-${run}.json`;
    const command = spawnSync(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        "--quiet",
        "--chrome-flags=--headless=new --no-sandbox",
        "--only-categories=performance",
        "--output=json",
        `--output-path=${path}`,
        "--no-enable-error-reporting",
      ],
      { encoding: "utf8" },
    );
    if (command.status !== 0)
      throw new Error(
        `${template} audit failed: ${command.stderr.slice(-400)}`,
      );
    const report = JSON.parse(readFileSync(path, "utf8"));
    version = report.lighthouseVersion;
    const audits = report.audits;
    samples.push({
      performance: report.categories.performance.score * 100,
      lcp_ms: audits["largest-contentful-paint"].numericValue,
      cls: audits["cumulative-layout-shift"].numericValue,
      tbt_ms: audits["total-blocking-time"].numericValue,
    });
    console.log(template, run, JSON.stringify(samples.at(-1)));
  }
  const median = (key) =>
    Number(
      samples
        .map((sample) => sample[key])
        .sort((a, b) => a - b)[1]
        .toFixed(3),
    );
  results.push({
    template,
    runs: 3,
    mobile_median: Object.fromEntries(
      Object.keys(samples[0]).map((key) => [key, median(key)]),
    ),
  });
}
writeFileSync(
  "docs/seo-preview/performance.json",
  JSON.stringify(
    {
      tool: `Lighthouse mobile ${version}`,
      measuredAt: new Date().toISOString(),
      environment:
        "Local production builds; gzip static origin and synthetic public catalogue API. No live email or AI inference.",
      field_data: false,
      note: "These are lab medians, not real-user p75 or INP. Field metrics require post-release data.",
      results,
    },
    null,
    2,
  ) + "\n",
);
