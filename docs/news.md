# News (seminai.tech/news)

Blog of the public site. Articles are MDX files, prerendered at build time
(`scripts/prerender.mjs`), listed in the sitemap with hreflang and exported as
Markdown for agents (`scripts/agent-docs.mjs`).

## Add an article

1. Create `src/content/news/it/<slug>.mdx` (and `src/content/news/en/<slug>.mdx` for the
   English version, with its own translated slug).
2. Front matter (validated in `src/lib/news.ts`, the build fails on a wrong field):

```yaml
---
title: "..."
description: "..."            # meta description, max 155 characters
date: 2026-11-03
updated: 2026-11-03           # optional
showUpdated: true             # optional: "Aggiornato al" box (regulatory articles)
author: "Redazione Seminai"
lang: it                      # must match the folder
translationKey: "spray-records-2027"   # same value in IT and EN: links them (hreflang)
category: "quaderno-di-campagna"
keyword: "quaderno di campagna digitale 2027"
tags: ["quaderno di campagna"]
image: "/news/<it-slug>.webp"          # optional cover photo, 1200x800 (3:2), files in public/news/
imageAlt: "..."
excerpt: "..."                         # optional card teaser; default: the first paragraph
relatedKeys: ["other-translation-key"] # optional "Da leggere insieme", shown after the CTA
faqs:                                  # optional, also emitted as FAQPage JSON-LD
  - question: "..."
    answer: "..."
sources:                               # "Fonti" section at the end
  - title: "Reg. di esecuzione (UE) 2023/564"
    url: "https://eur-lex.europa.eu/eli/reg_impl/2023/564/oj"
    accessed: 2026-11-01
---
```

3. Body in Markdown. Components usable without import:

```mdx
<ResearchNote source="Author, year. Title." href="https://doi.org/...">
Short summary of the study.
</ResearchNote>

<InPratica>
- point one
- point two
</InPratica>

{/* Canva brief: ... */}
<Infografica alt="Description" caption="Fonte: EUR-Lex" />
```

`Infografica` shows a placeholder until `src="/news/infografiche/<name>.webp"` is set.
The CTA box links to `/richiedi-demo/` or `/en/request-a-demo/`. It requests an
appointment that the team confirms manually. Do not promise trials, credits,
response times or performance without approved product evidence.

4. `npm run build`, then check `dist/news/<slug>/index.html`.

URLs: `/news/<slug>/` (Italian), `/en/news/<slug>/` (English).

The migration includes 16 Italian articles and 16 English counterparts. Keep
publication dates unchanged; set `updated` only for substantive editorial changes.
The same front matter supplies HTML, Markdown, JSON-LD and sitemap dates. A real
approved author/reviewer can replace the current responsible editorial team; do
not invent individual names or approvals. Follow `/politica-editoriale/` and the
human review gates in `SEO_GEO_RELEASE.md` before publication.

After changing cover images, `npm run images:news` generates responsive 320px and
640px WebP variants. `npm run build` runs this step automatically.
