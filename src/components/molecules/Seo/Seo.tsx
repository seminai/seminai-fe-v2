import { Helmet } from "react-helmet-async";
import {
  OG_IMAGE,
  OG_IMAGE_ALT,
  SITE_NAME,
  SITE_URL,
  type SeoLocale,
} from "@/config/seo";

export interface SeoProps {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  locale?: SeoLocale;
  /** Emit it + x-default hreflang alternates (homepage). */
  hreflang?: boolean;
  /** Schema.org JSON-LD object (or array) injected as <script type="application/ld+json">. */
  jsonLd?: object | object[];
}

/** Markdown twin of a page, generated at build time by scripts/agent-docs.mjs. */
function markdownUrl(canonical: string): string {
  return canonical === `${SITE_URL}/` ? `${SITE_URL}/index.md` : `${canonical}.md`;
}

/**
 * Presentational head manager. Renders identical tags in the prerendered HTML and on
 * client navigation. Private/auth pages pass `noindex`. The homepage passes `jsonLd`.
 */
export function Seo({
  title,
  description,
  canonical,
  image = OG_IMAGE,
  imageAlt = OG_IMAGE_ALT,
  noindex = false,
  locale = "it_IT",
  hreflang = false,
  jsonLd,
}: SeoProps) {
  const robots = noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <link rel="describedby" href={`${SITE_URL}/llms.txt`} type="text/plain" />
      <link
        rel="api-catalog"
        href={`${SITE_URL}/.well-known/api-catalog`}
        type="application/linkset+json"
      />
      <link
        rel="service-doc"
        href="https://seminai-be-v2-661301438659.europe-west1.run.app/api-docs"
        type="text/html"
      />

      {noindex ? null : (
        <link rel="alternate" type="text/markdown" href={markdownUrl(canonical)} />
      )}
      {hreflang ? (
        <link
          rel="alternate"
          type="text/markdown"
          hrefLang="en"
          href={`${SITE_URL}/index.en.md`}
        />
      ) : null}

      {hreflang ? (
        <link rel="alternate" hrefLang="it" href={`${SITE_URL}/`} />
      ) : null}
      {hreflang ? (
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
      ) : null}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={imageAlt} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
