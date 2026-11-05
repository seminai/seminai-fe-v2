import { Seo } from "@/components/molecules/Seo/Seo";
import { absoluteUrl } from "@/config/seo";
import { NewsLayout } from "../News/NewsLayout";
export function NotFound() {
  const en =
    typeof location !== "undefined" && location.pathname.startsWith("/en/");
  return (
    <NewsLayout languageLinks={{ it: "/", en: "/en/" }}>
      <Seo
        title={en ? "Page not found | Seminai" : "Pagina non trovata | Seminai"}
        description={
          en ? "This page is unavailable." : "Questa pagina non è disponibile."
        }
        canonical={absoluteUrl("/404/")}
        noindex
      />
      <section className="container public-heading">
        <h1>{en ? "Page not found" : "Pagina non trovata"}</h1>
        <a href={en ? "/en/" : "/"}>Home →</a>
      </section>
    </NewsLayout>
  );
}
